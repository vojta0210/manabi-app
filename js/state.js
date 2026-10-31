// ==============================================
// STATE — the single global `state` object every view reads/writes, plus generateCode().
// Depends on: config.js (none directly, just needs to load after it by convention).
// ==============================================

let state = {
  students: [],
  teachers: [],
  classrooms: [],
  schoolClasses: [], // official homeroom cohorts ("1.A".."4.B") — distinct from `classrooms` (per-subject groups)
  homework: [],
  files: [],           // teacher-owned master files
  studentFiles: [],    // { id, masterFileId, studentId, homeworkId, content, name, type, submittedAt }
  grades: [],          // { homeworkId, studentId, value }
  currentUser: null,
  authLoading: true,   // true until the initial session check finishes
  loginMode: '',
  view: 'dashboard',
  loginName: '',
  loginPassword: '',
  registerName: '',
  registerPassword: '',
  registerRecovery: '', // secret recovery phrase set at signup — lets a locked-out user reset their password without a real email
  registerSchoolClassId: '', // student registration — which school class (1.A..4.B) they're enrolling into
  showForgotPassword: false,
  forgotForm: { name: '', recovery: '', newPassword: '' },

  activeTab: 'all',
  showJoinModal: false,
  showStudentEditModal: false,
  calendarDate: new Date(),

  editingHomeworkId: null,
  editingStudentId: null,
  editorFile: null,        // { ...file, isStudentCopy, studentFileId }
  _editorReturnView: null,
  _slidesCurrentIdx: 0,

  newHomework: { name: '', description: '', points: '', date: '', classroomId: '', repeatWeeks: 1 },
  assignedStudentIds: [],
  attachedFileIds: [],

  newClassroomName: '',
  joinCode: '',
  showClassroomModal: false,
  classroomForm: { id: null, name: '', color: '' }, // id set -> editing, id null -> creating
  hideAssignedFiles: false, // student can collapse the "My Assigned Files" section
  viewingClassroomId: null, // classroom drilled into from the dashboard (view === 'classroom-assignments')

  // Assignment filters
  activeFilterDropdown: null, // 'class' | 'date' | 'status' | 'marked' | null
  filterClassroomId: 'all',   // 'all' or classroom id (number)
  filterDate: '',             // '' or 'overdue' or 'upcoming' or 'today'
  filterSubmitted: 'all',     // 'all' | 'submitted' | 'not-submitted'
  filterMarked: 'all',        // 'all' | 'marked' | 'not-marked'

  profileForm: { name: '', birthDate: '', bio: '', weeklyHours: '' },
  newRecoveryPhrase: '', // Settings — (re)set the password-recovery phrase for an already-logged-in account

  // Teacher viewing student submissions
  viewingSubmissions: null, // homeworkId
  viewingStudentFile: null, // studentFile object

  // Grades view
  gradesClassroomId: 'all',  // filter by classroom
  gradesStudentId: null,     // teacher drills into a student
  homeroomExpandedStudentId: null, // Homeroom view — which student's cross-subject grades are expanded
  homeroomSortBy: 'name',    // 'name' (A–Z) | 'grade' — sort toggle for the homeroom roster

  // Principal (ředitel) — hidden role, reached via #reditelna hash or the PrincipalCorner
  // login widget. See auth.js (tryEnterPrincipalMode) and view-auth.js (PrincipalCorner).
  principals: [],
  principalViewingClassId: null,    // school class drilled into (from either tab)
  principalTeacherFilter: 'homeroom', // 'homeroom' | 'unassigned' — Teachers page tab
  principalViewingTeacherId: null,  // teacher drilled into (full info + homeroom link)
  principalCornerOpen: false,       // corner login widget expanded/collapsed
  principalCornerReg: false,        // corner widget showing register form instead of login
  principalCornerName: 'vojta0210',
  principalCornerPassword: 'vojta0210',

  // Schedule (rozvrh) — see schedule.js (data+actions) and view-schedule.js (UI).
  schedule: [], // flat list of schedule_slots rows, mapped — { id, schoolClassId, classroomId, dayOfWeek, period }
  scheduleEditingClassId: null, // principal: which school class's grid is open for editing
  scheduleDragClassroomId: null, // principal: classroom id currently being dragged from the subject sidebar

  // Announcements (oznámení) — principal broadcasts a short message to a chosen audience
  // (everyone, all teachers, all students, one ročník, or one school class), read by every
  // signed-in profile it's targeted at. See patch_announcement_targeting.sql for the table/RLS,
  // AnnouncementsView() in view-grades.js (principal composer+list), and AnnouncementBanner()
  // in view-dashboard.js (what teachers/students see).
  announcements: [], // { id, message, shortDescription, createdAt, audience, targetGrade, targetSchoolClassId, principalName }
  newAnnouncementText: '',
  newAnnouncementShortDescription: '', // required — the collapsed preview text (and the Calendar label once pinned)
  newAnnouncementAudience: 'all', // 'all' | 'teachers' | 'students' | 'grade' | 'class'
  newAnnouncementGrade: 1,          // used when audience === 'grade' (ročník 1-4)
  newAnnouncementSchoolClassId: '', // used when audience === 'class' — a school_classes id
  newAnnouncementPickerOpen: false, // whether the "Send to" picker is expanded (defaults closed, sends to Everyone)

  // Per-recipient receipts for announcements — once a teacher/student pins or dismisses an
  // announcement from their dashboard banner, a row lands here so it stops showing up in
  // the banner. See patch_announcement_receipts.sql for the table/RLS,
  // pinAnnouncement()/dismissAnnouncement() in actions.js, and AnnouncementBanner() in
  // view-dashboard.js.
  announcementReceipts: [], // { id, announcementId, userId, status: 'pinned'|'dismissed', pinDate }
  expandedAnnouncementIds: [], // ids currently expanded open in the banner (UI-only, not persisted)
  announcementPinDateDrafts: {}, // { [announcementId]: 'YYYY-MM-DD' } — the date picker draft in the banner, before "Pin" is clicked (UI-only, not persisted)
};

// --- Utility ---
function generateCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

// Fixed palette a teacher picks a classroom color from — kept small and named so a color
// always reads consistently everywhere it shows up (ClassroomCard, HomeworkCard, calendar
// events, filters). Chosen dark/saturated enough that white text stays readable on them.
const CLASSROOM_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1',
  '#f97316', '#64748b',
];
