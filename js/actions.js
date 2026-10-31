// ==============================================
// ACTIONS — mutation functions for classrooms, homework, files and profiles.
// (Grade save/delete live in view-grades.js, next to the grade UI that calls them.)
// Depends on: config.js, state.js, data.js, ui-core.js.
// ==============================================

// --- Classroom ---
async function joinClassroom() {
  const code = (state.joinCode || '').trim();
  if (!code) return alert('Enter a code.');
  // Classrooms are no longer broadly readable (see schema.sql — RLS used to let any signed-in
  // user select the whole table, leaking every class's join code). find_classroom_by_code()
  // is a security-definer function that looks up only an exact code match, so joining still
  // works without exposing the rest of the list.
  const { data, error } = await sb.rpc('find_classroom_by_code', { p_code: code });
  const classroom = Array.isArray(data) ? data[0] : data;
  if (error || !classroom) return alert('Invalid code');
  if (state.currentUser.classroomIds && state.currentUser.classroomIds.includes(classroom.id)) return alert('Already joined!');
  const { error: joinErr } = await sb.from('classroom_members').insert({ classroom_id: classroom.id, student_id: state.currentUser.id });
  if (joinErr) return alert('Could not join: ' + joinErr.message);
  state.joinCode = '';
  state.showJoinModal = false;
  await fetchAllData();
  alert(`Joined ${classroom.name}!`);
  render();
}

async function leaveClassroom(classroomId) {
  if (!confirm('Leave this classroom? You will lose access to its assignments and files.')) return;
  const { error } = await sb.from('classroom_members').delete().eq('classroom_id', classroomId).eq('student_id', state.currentUser.id);
  if (error) { alert('Could not leave: ' + error.message); return; }
  await fetchAllData();
  render();
}

async function removeStudentFromClassroom(classroomId, studentId) {
  if (!confirm('Remove this student from the classroom? They will lose access to its assignments and files.')) return;
  const { error } = await sb.from('classroom_members').delete().eq('classroom_id', classroomId).eq('student_id', studentId);
  if (error) { alert('Could not remove student: ' + error.message); return; }
  await fetchAllData();
  render();
}

// --- School Classes (homeroom, "1.A".."4.B" — see HomeroomView() in view-grades.js) ---
// Claiming is a one-way, first-come action: claim_homeroom() in schema.sql only ever moves
// a class from unclaimed to "me", so this can't hijack another teacher's homeroom.
async function claimHomeroom(schoolClassId) {
  if (!confirm('Become the homeroom teacher for this class? You\'ll get read access to its students\' grades across every subject, not just your own.')) return;
  const { data, error } = await sb.rpc('claim_homeroom', { p_school_class_id: schoolClassId });
  if (error) { alert('Could not claim homeroom: ' + error.message); return; }
  if (!data) { alert('Someone already claimed this class.'); await loadSchoolClasses(); render(); return; }
  await fetchAllData();
  render();
}

// Opens the classroom modal (see ClassroomModal() in view-dashboard.js) — id: null means
// "create new", a non-null id means "editing this existing classroom's name/color/grades".
function openClassroomModal(cls = null) {
  state.classroomForm = cls
    ? { id: cls.id, name: cls.name, color: cls.color, gradeLevels: [...(cls.gradeLevels || [])] }
    : { id: null, name: '', color: CLASSROOM_COLORS[0], gradeLevels: [] };
  state.showClassroomModal = true;
  render();
}

function toggleClassroomGradeLevel(grade) {
  const arr = state.classroomForm.gradeLevels;
  const idx = arr.indexOf(grade);
  if (idx === -1) arr.push(grade); else arr.splice(idx, 1);
  render();
}

async function saveClassroomModal() {
  const name = (state.classroomForm.name || '').trim();
  if (!name) return alert('Classroom name is required.');
  // Required so the principal's schedule editor (view-schedule.js) knows which class(es)
  // this subject is relevant for, instead of listing every subject in the school at once.
  if (!state.classroomForm.gradeLevels || state.classroomForm.gradeLevels.length === 0) {
    return alert('Select at least one grade (ročník) this subject is for.');
  }
  const color = state.classroomForm.color || CLASSROOM_COLORS[0];
  const gradeLevels = [...state.classroomForm.gradeLevels].sort();

  if (state.classroomForm.id) {
    const { error } = await sb.from('classrooms').update({ name, color, grade_levels: gradeLevels }).eq('id', state.classroomForm.id);
    if (error) return alert('Could not save classroom: ' + error.message);
  } else {
    const { error } = await sb.from('classrooms').insert({ name, color, grade_levels: gradeLevels, code: generateCode(), teacher_id: state.currentUser.id });
    if (error) return alert('Could not create classroom: ' + error.message);
  }

  state.showClassroomModal = false;
  await fetchAllData();
  render();
}

// --- Assignment ---
function openCreateAssignment(hw = null, presetClassroomId = null) {
  state.view = 'create-assignment';
  state.editingHomeworkId = hw ? hw.id : null;
  state.newHomework = hw
    ? { name: hw.name, description: hw.description || '', points: hw.points || '', date: hw.date, classroomId: hw.classroomId }
    : { name: '', description: '', points: '', date: '', classroomId: presetClassroomId || '' };
  state.assignedStudentIds = hw ? (hw.assignedStudentIds === 'all' ? 'all' : [...(hw.assignedStudentIds || [])]) : [];
  state.attachedFileIds = hw ? [...(hw.attachedFileIds || [])] : [];
  render();
}

async function saveHomework() {
  const { name, description, points, date, classroomId } = state.newHomework;
  if (!name || !classroomId) return alert('Name and classroom are required');
  const assigned = state.assignedStudentIds === 'all' || state.assignedStudentIds.length === 0
    ? 'all' : state.assignedStudentIds;

  const row = {
    name,
    description: description || null,
    points: points === '' ? null : Number(points),
    due_date: date || null,
    classroom_id: Number(classroomId),
    assigned_all: assigned === 'all',
  };

  let hwId;
  if (state.editingHomeworkId) {
    hwId = state.editingHomeworkId;
    const { error } = await sb.from('homework').update(row).eq('id', hwId);
    if (error) return alert('Could not save assignment: ' + error.message);
    await sb.from('homework_assignments').delete().eq('homework_id', hwId);
  } else {
    const { data, error } = await sb.from('homework').insert({ ...row, teacher_id: state.currentUser.id }).select().single();
    if (error) return alert('Could not create assignment: ' + error.message);
    hwId = data.id;
  }

  if (assigned !== 'all' && assigned.length > 0) {
    await sb.from('homework_assignments').insert(assigned.map(studentId => ({ homework_id: hwId, student_id: studentId })));
  }

  // Attached files: replace the homework_files rows, then create/refresh student copies
  await sb.from('homework_files').delete().eq('homework_id', hwId);
  if (state.attachedFileIds.length > 0) {
    await sb.from('homework_files').insert(state.attachedFileIds.map(fileId => ({ homework_id: hwId, file_id: fileId })));
    await createStudentFileCopies(hwId, state.attachedFileIds, assigned, classroomId);
  }

  // Return to the classroom's own assignment list when that's where this was created/edited
  // from, so the teacher immediately sees it there instead of landing back on the dashboard.
  state.view = (state.viewingClassroomId === Number(classroomId)) ? 'classroom-assignments' : 'dashboard';
  state.newHomework = { name: '', description: '', points: '', date: '', classroomId: '' };
  state.editingHomeworkId = null;
  state.assignedStudentIds = [];
  state.attachedFileIds = [];
  await fetchAllData();
  render();
}

async function createStudentFileCopies(hwId, fileIds, assigned, classroomId) {
  // Determine which students get copies
  let targetStudentIds;
  if (assigned === 'all') {
    const cls = state.classrooms.find(c => c.id === Number(classroomId));
    if (!cls) return;
    targetStudentIds = state.students.filter(s => s.classroomIds && s.classroomIds.includes(cls.id)).map(s => s.id);
  } else {
    targetStudentIds = assigned;
  }

  const { data: existing } = await sb.from('student_files').select('master_file_id, student_id').eq('homework_id', hwId);
  const existingKey = new Set((existing || []).map(e => `${e.master_file_id}:${e.student_id}`));

  const rowsToInsert = [];
  fileIds.forEach(fileId => {
    const masterFile = state.files.find(f => f.id === fileId);
    if (!masterFile) return;
    targetStudentIds.forEach(studentId => {
      if (existingKey.has(`${fileId}:${studentId}`)) return;
      rowsToInsert.push({
        master_file_id: fileId,
        student_id: studentId,
        homework_id: hwId,
        name: masterFile.name,
        type: masterFile.type,
        content: masterFile.content, // copy initial content
      });
    });
  });

  if (rowsToInsert.length) {
    const { error } = await sb.from('student_files').insert(rowsToInsert);
    if (error) console.error('Could not create student file copies:', error);
  }
}

async function deleteHomework(id) {
  if (!confirm('Delete this assignment?')) return;
  const { error } = await sb.from('homework').delete().eq('id', id);
  if (error) { alert('Could not delete: ' + error.message); return; }
  await fetchAllData();
  render();
}

// --- File Actions ---
async function createFile(type) {
  const defaultContent = {
    doc: '',
    slides: JSON.stringify([{ id: 1, title: 'Slide 1', body: '', bgColor: '#ffffff', textColor: '#1a1a2e', layout: 'center' }]),
    sheets: JSON.stringify({ rows: 20, cols: 8, data: {}, formatting: {} }),
  };
  const name = type === 'doc' ? 'Untitled Doc' : type === 'slides' ? 'Untitled Presentation' : 'Untitled Spreadsheet';
  const { data, error } = await sb.from('files').insert({
    name, type, content: defaultContent[type], owner_id: state.currentUser.id
  }).select().single();
  if (error) { alert('Could not create file: ' + error.message); return; }
  const file = mapFile(data);
  state.files.push(file);
  // Created from the assignment composer ("+ New Doc/Slides/Sheet") — auto-attach it so it
  // shows up in this assignment's file list right away. CreateAssignmentPage() (see
  // view-assignment.js) now only ever shows state.attachedFileIds, not every file the
  // teacher owns, so without this the newly created file would be invisible there.
  if (state.view === 'create-assignment' && !state.attachedFileIds.includes(file.id)) {
    state.attachedFileIds.push(file.id);
  }
  state._editorReturnView = state.view;
  openEditor(file);
}

function openEditor(file, isStudentCopy = false, studentFileId = null) {
  state._editorReturnView = state._editorReturnView || state.view;
  state.editorFile = { ...file, isStudentCopy, studentFileId };
  state._slidesCurrentIdx = 0;
  state.view = 'editor';
  render();
}

// Debounced autosave used while typing (see DocEditor/SlidesEditor/SheetsEditor onInput
// handlers) — saveEditorFileNow() is used for the explicit Save/Submit/Back actions so
// those never wait on the debounce timer.
let _saveEditorTimer = null;
function saveEditorFile() {
  clearTimeout(_saveEditorTimer);
  _saveEditorTimer = setTimeout(() => { saveEditorFileNow(); }, 600);
}

async function saveEditorFileNow() {
  clearTimeout(_saveEditorTimer);
  if (!state.editorFile) return;
  if (state.editorFile.isStudentCopy) {
    const lastEditedAt = new Date().toISOString();
    const { error } = await sb.from('student_files').update({
      content: state.editorFile.content,
      name: state.editorFile.name,
      last_edited_at: lastEditedAt,
    }).eq('id', state.editorFile.studentFileId);
    if (error) { console.error('Could not save file:', error); return; }
    const idx = state.studentFiles.findIndex(sf => sf.id === state.editorFile.studentFileId);
    if (idx !== -1) {
      state.studentFiles[idx].content = state.editorFile.content;
      state.studentFiles[idx].name = state.editorFile.name;
      state.studentFiles[idx].lastEditedAt = lastEditedAt;
    }
  } else {
    const { error } = await sb.from('files').update({
      content: state.editorFile.content,
      name: state.editorFile.name,
    }).eq('id', state.editorFile.id);
    if (error) { console.error('Could not save file:', error); return; }
    const idx = state.files.findIndex(f => f.id === state.editorFile.id);
    if (idx !== -1) state.files[idx] = { ...state.files[idx], content: state.editorFile.content, name: state.editorFile.name };
  }
}

async function submitStudentFile(studentFileId) {
  const submittedAt = new Date().toISOString();
  const { error } = await sb.from('student_files').update({ submitted_at: submittedAt }).eq('id', studentFileId);
  if (error) { alert('Could not submit: ' + error.message); return; }
  const idx = state.studentFiles.findIndex(sf => sf.id === studentFileId);
  if (idx !== -1) state.studentFiles[idx].submittedAt = submittedAt;
  alert('Submitted successfully!');
  render();
}

async function deleteFile(fileId) {
  if (!confirm('Delete this file?')) return;
  const { error } = await sb.from('files').delete().eq('id', fileId);
  if (error) { alert('Could not delete: ' + error.message); return; }
  state.attachedFileIds = state.attachedFileIds.filter(id => id !== fileId);
  await fetchAllData();
  render();
}

// (Re)sets the password-recovery phrase for the currently logged-in account — same
// set_recovery_secret() RPC used right after registration (see register() in auth.js),
// exposed here too so accounts created before this feature existed can still get one.
async function updateRecoveryPhrase() {
  const secret = (state.newRecoveryPhrase || '').trim();
  if (secret.length < 4) return alert('Recovery phrase must be at least 4 characters.');
  const { error } = await sb.rpc('set_recovery_secret', { p_secret: secret });
  if (error) { alert('Could not save recovery phrase: ' + error.message); return; }
  state.newRecoveryPhrase = '';
  alert('Recovery phrase saved.');
  render();
}

// --- Profile ---
async function saveProfile() {
  if (!state.profileForm.name.trim()) return alert('Name cannot be empty');
  const isTeacher = state.currentUser.role === 'teacher';
  const weeklyHours = isTeacher && state.profileForm.weeklyHours !== '' && state.profileForm.weeklyHours != null
    ? Number(state.profileForm.weeklyHours) : null;
  const row = {
    display_name: state.profileForm.name,
    birth_date: state.profileForm.birthDate || null,
    bio: state.profileForm.bio || null,
  };
  if (isTeacher) row.weekly_teaching_hours = weeklyHours;
  const { error } = await sb.from('profiles').update(row).eq('id', state.currentUser.id);
  if (error) { alert('Could not save profile: ' + error.message); return; }
  const patch = { name: state.profileForm.name, birthDate: state.profileForm.birthDate, bio: state.profileForm.bio };
  if (isTeacher) patch.weeklyHours = weeklyHours;
  state.currentUser = { ...state.currentUser, ...patch };
  const idx = state.students.findIndex(u => u.id === state.currentUser.id);
  if (idx !== -1) state.students[idx] = { ...state.students[idx], ...patch };
  const tIdx = state.teachers.findIndex(u => u.id === state.currentUser.id);
  if (tIdx !== -1) state.teachers[tIdx] = { ...state.teachers[tIdx], ...patch };
  const pIdx = state.principals.findIndex(u => u.id === state.currentUser.id);
  if (pIdx !== -1) state.principals[pIdx] = { ...state.principals[pIdx], ...patch };
  alert('Profile saved!');
  render();
}

function loadProfileForEdit() {
  state.profileForm = {
    name: state.currentUser.name || '',
    birthDate: state.currentUser.birthDate || '',
    bio: state.currentUser.bio || '',
    weeklyHours: state.currentUser.weeklyHours != null ? String(state.currentUser.weeklyHours) : '',
  };
  state.view = 'settings';
  render();
}

function openStudentEdit(student) {
  state.editingStudentId = student.id;
  state.profileForm = { name: student.name || '', birthDate: student.birthDate || '', bio: student.bio || '' };
  state.showStudentEditModal = true;
  render();
}

async function saveStudentByTeacher() {
  const { error } = await sb.from('profiles').update({
    display_name: state.profileForm.name,
    birth_date: state.profileForm.birthDate || null,
    bio: state.profileForm.bio || null,
  }).eq('id', state.editingStudentId);
  if (error) { alert('Could not save: ' + error.message); return; }
  const idx = state.students.findIndex(s => s.id === state.editingStudentId);
  if (idx !== -1) state.students[idx] = { ...state.students[idx], name: state.profileForm.name, birthDate: state.profileForm.birthDate, bio: state.profileForm.bio };
  state.showStudentEditModal = false;
  alert('Student updated.');
  render();
}
