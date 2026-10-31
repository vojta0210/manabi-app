// ==============================================
// DATA — maps raw Supabase rows to the shapes the UI expects, and fetchAllData(),
// which reloads all 8 tables after any mutation. Depends on: config.js, state.js.
// ==============================================

// --- Data Loading (Supabase) ---
// Every mutation goes straight to Postgres, then we re-fetch the affected tables so the
// UI is always showing what the server actually has — no hand-rolled local state syncing
// that could quietly drift from the database.
function mapProfile(p, membersByStudent) {
  return {
    id: p.id,
    name: p.display_name,
    role: p.role,
    bio: p.bio || '',
    birthDate: p.birth_date || '',
    classroomIds: p.role === 'student' ? (membersByStudent[p.id] || []) : [],
    schoolClassId: p.school_class_id || null, // official homeroom cohort (1.A..4.B), students only
    weeklyHours: p.weekly_teaching_hours ?? null, // teachers only — self-reported in Settings
  };
}
function mapClassroom(c) {
  return { id: c.id, name: c.name, code: c.code, teacherId: c.teacher_id, color: c.color || CLASSROOM_COLORS[0], gradeLevels: c.grade_levels || [] };
}
function mapSchoolClass(sc) {
  return { id: sc.id, name: sc.name, homeroomTeacherId: sc.homeroom_teacher_id };
}

// Called before login too (the registration form needs the class list for its dropdown, and
// school_classes is readable by anon — see schema.sql). Also re-called inside fetchAllData()
// so it stays current after a claim/change.
async function loadSchoolClasses() {
  const { data, error } = await sb.from('school_classes').select('*').order('name');
  if (error) { console.error('Could not load school classes:', error); return; }
  state.schoolClasses = (data || []).map(mapSchoolClass);
}
function mapHomework(h, assignedByHw, filesByHw) {
  return {
    id: h.id,
    name: h.name,
    description: h.description || '',
    points: h.points,
    date: h.due_date || '',
    classroomId: h.classroom_id,
    teacherId: h.teacher_id,
    assignedStudentIds: h.assigned_all ? 'all' : (assignedByHw[h.id] || []),
    attachedFileIds: filesByHw[h.id] || [],
    createdAt: h.created_at,
  };
}
function mapFile(f) {
  return { id: f.id, name: f.name, type: f.type, content: f.content, ownerId: f.owner_id, createdAt: f.created_at };
}
function mapStudentFile(sf) {
  return {
    id: sf.id,
    masterFileId: sf.master_file_id,
    studentId: sf.student_id,
    homeworkId: sf.homework_id,
    name: sf.name,
    type: sf.type,
    content: sf.content,
    submittedAt: sf.submitted_at,
    createdAt: sf.created_at,
    lastEditedAt: sf.last_edited_at,
  };
}
function mapGrade(g) {
  return { homeworkId: g.homework_id, studentId: g.student_id, value: g.value, comment: g.comment || '' };
}
function mapAnnouncement(a) {
  return {
    id: a.id, principalId: a.principal_id, message: a.message, createdAt: a.created_at,
    audience: a.audience || 'all',
    targetGrade: a.target_grade ?? null,
    targetSchoolClassId: a.target_school_class_id ?? null,
    principalName: a.principal_name || '',
    shortDescription: a.short_description || '',
  };
}
function mapAnnouncementReceipt(r) {
  return { id: r.id, announcementId: r.announcement_id, userId: r.user_id, status: r.status, pinDate: r.pin_date };
}

async function fetchAllData() {
  const [
    profilesRes, classroomsRes, membersRes, homeworkRes,
    assignmentsRes, filesRes, hwFilesRes, studentFilesRes, gradesRes, schoolClassesRes, scheduleRes,
  ] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('classrooms').select('*'),
    sb.from('classroom_members').select('*'),
    sb.from('homework').select('*'),
    sb.from('homework_assignments').select('*'),
    sb.from('files').select('*'),
    sb.from('homework_files').select('*'),
    sb.from('student_files').select('*'),
    sb.from('grades').select('*'),
    sb.from('school_classes').select('*').order('name'),
    sb.from('schedule_slots').select('*'),
  ]);
  const err = profilesRes.error || classroomsRes.error || membersRes.error || homeworkRes.error
    || assignmentsRes.error || filesRes.error || hwFilesRes.error || studentFilesRes.error || gradesRes.error || schoolClassesRes.error || scheduleRes.error;
  if (err) {
    console.error('fetchAllData failed:', err);
    showToast('Could not load data from the server: ' + err.message);
    return;
  }
  state.schoolClasses = (schoolClassesRes.data || []).map(mapSchoolClass);

  const membersByStudent = {};
  (membersRes.data || []).forEach(m => { (membersByStudent[m.student_id] ||= []).push(m.classroom_id); });

  state.students = (profilesRes.data || []).filter(p => p.role === 'student').map(p => mapProfile(p, membersByStudent));
  state.teachers = (profilesRes.data || []).filter(p => p.role === 'teacher').map(p => mapProfile(p, membersByStudent));
  state.principals = (profilesRes.data || []).filter(p => p.role === 'principal').map(p => mapProfile(p, membersByStudent));
  state.classrooms = (classroomsRes.data || []).map(mapClassroom);

  const assignedByHw = {};
  (assignmentsRes.data || []).forEach(a => { (assignedByHw[a.homework_id] ||= []).push(a.student_id); });
  const filesByHw = {};
  (hwFilesRes.data || []).forEach(hf => { (filesByHw[hf.homework_id] ||= []).push(hf.file_id); });
  state.homework = (homeworkRes.data || []).map(h => mapHomework(h, assignedByHw, filesByHw));

  state.files = (filesRes.data || []).map(mapFile);
  state.studentFiles = (studentFilesRes.data || []).map(mapStudentFile);
  state.grades = (gradesRes.data || []).map(mapGrade);
  state.schedule = (scheduleRes.data || []).map(mapScheduleSlot);

  if (state.currentUser) {
    const me = [...state.students, ...state.teachers, ...state.principals].find(u => u.id === state.currentUser.id);
    if (me) state.currentUser = { ...me, role: state.currentUser.role };
  }

  await fetchAnnouncements();
}

// Deliberately kept OUTSIDE the Promise.all above: `announcements` is a newer table (see
// patch_grade_comments_announcements.sql and patch_announcement_targeting.sql) and a school
// that hasn't run those migrations yet should still get everything else in fetchAllData()
// working, not one missing table taking the whole app down with a hard "Could not load
// data from the server" error.
async function fetchAnnouncements() {
  try {
    const { data, error } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    state.announcements = (data || []).map(mapAnnouncement);
  } catch (e) {
    console.warn('Announcements not loaded (migration not run yet?):', e.message);
    state.announcements = [];
  }
  await fetchAnnouncementReceipts();
}

// Kept in its own try/catch for the same reason as fetchAnnouncements() above:
// `announcement_receipts` (patch_announcement_receipts.sql) is newer still, and RLS already
// scopes this to just the signed-in user's own receipts, so no extra filtering needed here.
async function fetchAnnouncementReceipts() {
  try {
    const { data, error } = await sb.from('announcement_receipts').select('*');
    if (error) throw error;
    state.announcementReceipts = (data || []).map(mapAnnouncementReceipt);
  } catch (e) {
    console.warn('Announcement receipts not loaded (migration not run yet?):', e.message);
    state.announcementReceipts = [];
  }
}
