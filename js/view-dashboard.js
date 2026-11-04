// ==============================================
// VIEW: DASHBOARD — layout shell (Sidebar/Header), teacher + student dashboards,
// homework cards/filters. Depends on: state.js, ui-core.js, actions.js.
// ==============================================

// --- Dashboard Layout ---
function DashboardLayout() {
  let content;
  if (state.view === 'calendar') content = CalendarView();
  else if (state.view === 'settings') content = SettingsView();
  else if (state.view === 'students') content = TeacherStudentsView();
  else if (state.view === 'create-assignment') content = CreateAssignmentPage();
  else if (state.view === 'submissions') content = SubmissionsView();
  else if (state.view === 'classroom-assignments') content = ClassroomAssignmentsView();
  else if (state.view === 'homeroom') content = HomeroomView();
  else if (state.view === 'grades') content = GradesView();
  else if (state.view === 'principal-class') content = PrincipalClassView();
  else if (state.view === 'principal-teacher') content = PrincipalTeacherView();
  else if (state.view === 'schedule') content = ScheduleView();
  else if (state.view === 'announcements') content = AnnouncementsView();
  else content = state.currentUser.role === 'teacher' ? TeacherDashboard()
    : state.currentUser.role === 'principal' ? PrincipalOverview()
    : StudentDashboard();

  return el('div', { className: 'min-h-screen flex flex-col md:flex-row bg-white' },
    Sidebar(),
    // min-w-0 is load-bearing (same reason as the schedule grid below): without it this flex
    // item grows to fit wide content like the schedule grid instead of staying within the
    // viewport, which pushes the whole page wider and hides whatever sits past the edge.
    el('main', { className: 'flex-1 p-6 md:p-12 overflow-y-auto overflow-x-hidden min-w-0' },
      (state.view === 'create-assignment') ? null : Header(),
      content
    )
  );
}

function Sidebar() {
  const isTeacher = state.currentUser.role === 'teacher';
  const isPrincipal = state.currentUser.role === 'principal';
  return el('aside', { className: 'w-full md:w-64 bg-white border-r border-gray-200 flex flex-col justify-between min-h-screen sticky top-0' },
    el('div', { className: 'flex flex-col' },
      el('div', { className: 'border-b border-gray-100 overflow-hidden', style: { height: '192px' } },
        el('img', { src: 'logo_manaby.jpg', alt: 'Logo', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } })
      ),
      el('nav', { className: 'flex flex-col mt-6' },
        isPrincipal
          ? [NavButton('Teachers', 'dashboard', 'dashboard'), NavButton('Schedule', 'schedule', 'calendar'), NavButton('Announcements', 'announcements', 'megaphone'), NavButton('Settings', 'settings', 'settings')]
          : [
              NavButton('Dashboard', 'dashboard', 'dashboard', !isTeacher ? getStudentUrgentHomework().length : 0),
              NavButton('Calendar', 'calendar', 'calendar'),
              NavButton('Schedule', 'schedule', 'dashboard'),
              isTeacher ? NavButton('Students', 'students', 'students') : null,
              isTeacher ? NavButton('Homeroom', 'homeroom', 'students') : null,
              NavButton('Grades', 'grades', 'grades'),
              NavButton('Settings', 'settings', 'settings'),
            ]
      )
    ),
    el('div', { className: 'p-6 border-t border-gray-100' },
      el('div', { className: 'flex items-center gap-3 mb-6' },
        el('div', { className: 'w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-sm' }, state.currentUser.name[0].toUpperCase()),
        el('div', {},
          el('p', { className: 'text-sm font-bold text-black leading-tight' }, state.currentUser.name),
          el('p', { className: 'text-xs text-gray-500 font-medium uppercase mt-0.5' }, state.currentUser.role)
        )
      ),
      el('button', { className: 'flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider transition', onClick: logout }, '→ Sign Out')
    )
  );
}

function NavButton(label, viewName, iconType, badge = 0) {
  const isActive = state.view === viewName
    || (viewName === 'dashboard' && (state.view === 'create-assignment' || state.view === 'submissions' || state.view === 'classroom-assignments' || state.view === 'principal-class' || state.view === 'principal-teacher'))
    || (viewName === 'grades' && state.view === 'grades');
  return el('button', {
    className: `text-left px-6 py-4 text-sm font-bold transition flex items-center gap-3 ${isActive ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`,
    onClick: () => {
      if (viewName === 'settings') loadProfileForEdit();
      else { state.view = viewName; render(); }
    }
  },
    Icon(iconType, `w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`),
    el('span', { className: 'flex-1' }, label),
    badge > 0 ? el('span', { className: `text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-black' : 'bg-red-500 text-white'}` }, String(badge)) : null
  );
}

function Header() {
  const titles = { dashboard: 'Dashboard', calendar: 'Calendar', settings: 'Settings', students: 'Students', submissions: 'Submissions', 'classroom-assignments': 'Assignments', homeroom: 'Homeroom', grades: 'Grades', 'principal-class': 'Class Overview', 'principal-teacher': 'Teacher', schedule: 'Schedule', announcements: 'Announcements' };
  const isPrincipal = state.currentUser.role === 'principal';
  const title = (isPrincipal && state.view === 'dashboard') ? 'Teachers' : (titles[state.view] || 'Dashboard');
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return el('header', { className: 'flex justify-between items-start mb-16' },
    el('div', {},
      el('h2', { className: 'text-5xl font-light text-black tracking-tight mb-2' }, title),
      el('p', { className: 'text-gray-400 font-light text-lg' }, dateStr)
    ),
    el('div', { className: 'flex items-center gap-4' },
      isPrincipal ? null
        : state.currentUser.role === 'teacher'
          ? el('button', { className: 'px-6 py-3 bg-black text-white rounded-full text-xs font-bold shadow-sm hover:bg-gray-800 transition uppercase tracking-wider', onClick: () => openCreateAssignment() }, '+ Create New')
          : el('button', { className: 'px-6 py-3 bg-black text-white rounded-full text-xs font-bold shadow-sm hover:bg-gray-800 transition uppercase tracking-wider', onClick: () => { state.showJoinModal = true; render(); } }, '+ Join Class')
    )
  );
}

// Overdue or due-today assignments the current student hasn't submitted yet — backs both the
// red badge on the "Dashboard" nav button (Sidebar) and the warning banner on StudentDashboard.
// Deliberately student-only: a teacher's "urgent" is about grading, not due dates, and that's
// a different kind of count (SubmissionsView already shows it per-assignment).
function getStudentUrgentHomework() {
  if (!state.currentUser || state.currentUser.role !== 'student') return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const myClassIds = state.currentUser.classroomIds || [];
  return state.homework.filter(h => {
    if (!myClassIds.includes(h.classroomId)) return false;
    if (h.assignedStudentIds !== 'all' && !(Array.isArray(h.assignedStudentIds) && h.assignedStudentIds.includes(state.currentUser.id))) return false;
    if (!h.date) return false;
    const due = new Date(h.date); due.setHours(0, 0, 0, 0);
    if (due > today) return false;
    const sf = state.studentFiles.find(x => x.homeworkId === h.id && x.studentId === state.currentUser.id);
    return !(sf && sf.submittedAt);
  });
}

// Announcements (see actions.js postAnnouncement/AnnouncementsView in view-grades.js) —
// shown at the top of the teacher/student dashboard. The collapsed row shows the
// principal-authored "popis zprávy" (short_description); click it to expand the full
// message and either pin it to the Calendar on a date the recipient picks (see
// CalendarView() in view-settings.js — it shows that same short description) or dismiss
// it — either way it's recorded in announcement_receipts (patch_announcement_receipts.sql)
// and drops out of this banner.
function AnnouncementBanner() {
  const handledIds = new Set((state.announcementReceipts || []).map(r => r.announcementId));
  const pending = (state.announcements || []).filter(a => !handledIds.has(a.id)).slice(0, 5);
  if (pending.length === 0) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  return el('div', { className: 'space-y-2 mb-2' },
    ...pending.map(a => {
      const isExpanded = state.expandedAnnouncementIds.includes(a.id);
      // Older announcements posted before patch_announcement_short_description.sql have no
      // short_description — fall back to a trimmed slice of the message so the row isn't blank.
      const previewLabel = a.shortDescription || (a.message ? a.message.slice(0, 60) : 'Oznámení');
      const pinDateDraft = state.announcementPinDateDrafts[a.id] || todayStr;
      return el('div', { className: 'border-2 border-black bg-gray-50' },
        el('div', {
          className: 'flex items-center justify-between gap-3 p-4 cursor-pointer',
          onClick: () => {
            state.expandedAnnouncementIds = isExpanded
              ? state.expandedAnnouncementIds.filter(id => id !== a.id)
              : [...state.expandedAnnouncementIds, a.id];
            render();
          }
        },
          el('div', { className: 'min-w-0' },
            el('p', { className: 'text-sm font-bold text-black truncate' }, previewLabel),
            el('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider mt-0.5' }, `Zpráva od: ${a.principalName || 'Principal'}`)
          ),
          el('span', { className: 'text-xs text-gray-400 flex-shrink-0' }, isExpanded ? '▲' : '▼')
        ),
        isExpanded ? el('div', { className: 'px-4 pb-4 space-y-3' },
          el('p', { className: 'text-sm text-black whitespace-pre-wrap' }, a.message),
          el('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider' }, new Date(a.createdAt).toLocaleString()),
          el('div', { className: 'flex items-center gap-3 flex-wrap pt-3 border-t border-gray-200' },
            el('input', {
              type: 'date',
              className: 'border-b-2 border-gray-200 focus:border-black outline-none py-1 text-black bg-transparent text-sm transition',
              value: pinDateDraft,
              onInput: (e) => { state.announcementPinDateDrafts = { ...state.announcementPinDateDrafts, [a.id]: e.target.value }; render(); }
            }),
            PendingButton('pinAnnouncement:' + a.id, 'Připnout do kalendáře', 'Připínám…', () => pinAnnouncement(a.id, pinDateDraft), 'px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition'),
            PendingButton('dismissAnnouncement:' + a.id, 'Smazat', 'Mažu…', () => dismissAnnouncement(a.id), 'px-4 py-2 border-2 border-gray-300 text-gray-500 text-xs font-bold uppercase tracking-wider hover:border-black hover:text-black transition')
          )
        ) : null
      );
    })
  );
}

// ==============================================
// MESSAGE HISTORY — a small, collapsed-by-default "Zprávy" panel showing every announcement
// this user has already handled (pinned or dismissed). AnnouncementBanner() above only shows
// what's still unhandled, so once a message is dismissed it used to vanish for good — this is
// where it lives afterwards, in case someone wants to read it again later. Clicking a row opens
// AnnouncementReadModal() (view-settings.js, mounted globally via appendOverlays()).
// ==============================================
function AnnouncementHistoryWidget() {
  if (!state.announcements || state.announcements.length === 0) return null;
  const receiptByAnnouncementId = {};
  (state.announcementReceipts || []).forEach(r => { receiptByAnnouncementId[r.announcementId] = r; });
  const history = state.announcements
    .filter(a => receiptByAnnouncementId[a.id])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (history.length === 0) return null;

  // Deliberately quiet and tucked at the very bottom of the dashboard (see call sites in
  // TeacherDashboard()/StudentDashboard() below) — no icon, no border, no fill, no count, no
  // underline until hovered. It's the last thing on the page rather than competing for
  // attention near the top, but it's always in that same spot, so it stays findable on purpose.
  const isOpen = state.announcementHistoryOpen;
  return el('div', { className: 'pt-2' },
    el('button', {
      className: 'flex items-center gap-1.5 text-[11px] font-bold text-gray-300 hover:text-gray-500 hover:underline uppercase tracking-wider transition',
      onClick: () => { state.announcementHistoryOpen = !isOpen; render(); }
    },
      el('span', {}, 'Zprávy'),
      el('span', { className: 'text-[9px]' }, isOpen ? '▲' : '▼')
    ),
    isOpen ? el('div', { className: 'mt-2 border border-gray-100 max-h-72 overflow-y-auto' },
      ...history.map(a => {
        const receipt = receiptByAnnouncementId[a.id];
        const label = a.shortDescription || (a.message ? a.message.slice(0, 60) : 'Oznámení');
        const isPinned = receipt.status === 'pinned';
        return el('div', {
          className: 'flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 transition',
          onClick: () => { state.openedAnnouncementId = a.id; render(); }
        },
          el('div', { className: 'min-w-0' },
            el('p', { className: 'text-sm font-bold text-black truncate' }, label),
            el('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider mt-0.5' }, new Date(a.createdAt).toLocaleDateString())
          ),
          el('span', {
            className: `flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${isPinned ? 'text-black' : 'text-gray-300'}`
          }, isPinned ? 'Připnuto' : 'Archivováno')
        );
      })
    ) : null
  );
}

// ── Teacher Dashboard ──
function TeacherDashboard() {
  const myClasses = state.classrooms.filter(c => c.teacherId === state.currentUser.id);
  const allHomework = state.homework.filter(h => h.teacherId === state.currentUser.id);

  return el('div', { className: 'space-y-10' },
    AnnouncementBanner(),
    el('div', { className: 'flex flex-wrap gap-12 mb-4' },
      StatCard('ACTIVE CLASSROOMS', myClasses.length),
      StatCard('TOTAL ASSIGNMENTS', allHomework.length)
    ),
    el('div', {},
      el('div', { className: 'flex justify-between items-end mb-6' },
        el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, 'CLASSROOMS'),
        el('button', { className: 'text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline', onClick: () => openClassroomModal() }, '+ New Class')
      ),
      el('p', { className: 'text-xs text-gray-400 -mt-4 mb-6' }, 'Click a classroom to see and manage its assignments.'),
      myClasses.length === 0
        ? el('div', { className: 'py-8 border-t border-gray-200 text-gray-400 font-light' }, 'No classes created.')
        : el('div', { className: 'border-t border-gray-200' }, ...myClasses.map(c => ClassroomCard(c, true))),
      state.showClassroomModal ? ClassroomModal() : null
    ),
    AnnouncementHistoryWidget()
  );
}

// ── Student Dashboard ──
function StudentDashboard() {
  const myClassIds = state.currentUser.classroomIds || [];
  const myClassrooms = state.classrooms.filter(c => myClassIds.includes(c.id));
  const allHomework = state.homework.filter(h => {
    if (!myClassIds.includes(h.classroomId)) return false;
    if (h.assignedStudentIds === 'all') return true;
    return Array.isArray(h.assignedStudentIds) && h.assignedStudentIds.includes(state.currentUser.id);
  });
  const myStudentFiles = state.studentFiles.filter(sf => sf.studentId === state.currentUser.id);
  // "My Assigned Files" only needs to show files still waiting on the student — once
  // submitted, it's done and doesn't need to keep cluttering the dashboard.
  const pendingStudentFiles = myStudentFiles.filter(sf => !sf.submittedAt);
  const urgent = getStudentUrgentHomework();
  const overdueCount = urgent.filter(h => h.date < new Date().toISOString().slice(0, 10)).length;
  const dueTodayCount = urgent.length - overdueCount;

  return el('div', { className: 'space-y-10' },
    AnnouncementBanner(),
    urgent.length > 0 ? el('div', { className: 'flex items-center gap-3 p-4 border-2 border-red-500 bg-red-50' },
      el('span', { className: 'text-xl flex-shrink-0' }, '⚠️'),
      el('p', { className: 'text-sm font-bold text-red-700' },
        [overdueCount > 0 ? `${overdueCount} ${overdueCount === 1 ? 'assignment' : 'assignments'} overdue` : null, dueTodayCount > 0 ? `${dueTodayCount} due today` : null].filter(Boolean).join(' · ') + ' — not yet submitted.'
      )
    ) : null,
    el('div', { className: 'flex flex-wrap gap-12 mb-4' },
      StatCard('JOINED CLASSES', myClassrooms.length),
      StatCard('MY ASSIGNMENTS', allHomework.length),
      StatCard('SUBMITTED', myStudentFiles.filter(sf => sf.submittedAt).length)
    ),
    el('div', {},
      el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest mb-6' }, 'MY CLASSROOMS'),
      el('p', { className: 'text-xs text-gray-400 -mt-4 mb-6' }, 'Click a classroom to see its assignments.'),
      myClassrooms.length === 0
        ? el('div', { className: 'py-8 border-t border-gray-200 text-gray-400 font-light' }, "You haven't joined any classes.")
        : el('div', { className: 'border-t border-gray-200' }, ...myClassrooms.map(c => ClassroomCard(c, false)))
    ),
    StudentFilesSection(pendingStudentFiles),
    state.showJoinModal ? JoinModal() : null,
    AnnouncementHistoryWidget()
  );
}

function StudentFilesSection(studentFiles) {
  const typeStyle = {
    doc:    { bg: 'bg-blue-50',   icon: 'text-blue-500',   label: 'text-blue-600'   },
    slides: { bg: 'bg-orange-50', icon: 'text-orange-500', label: 'text-orange-600' },
    sheets: { bg: 'bg-green-50',  icon: 'text-green-500',  label: 'text-green-600'  },
  };
  const hidden = state.hideAssignedFiles;

  return el('div', {},
    // Heading + toggle always stay visible — only the list below collapses.
    el('div', { className: 'flex justify-between items-end mb-6' },
      el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, 'MY ASSIGNED FILES'),
      el('button', {
        className: 'text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider underline',
        onClick: () => { state.hideAssignedFiles = !state.hideAssignedFiles; render(); }
      }, hidden ? 'Show' : 'Hide')
    ),
    hidden ? null : (studentFiles.length === 0
      ? el('div', { className: 'border-t border-gray-200 pt-6 text-gray-400 font-light text-sm' }, 'No assigned files waiting right now.')
      : el('div', { className: 'border-t border-gray-200 pt-6 space-y-3' },
      ...studentFiles.map(sf => {
        const hw = state.homework.find(h => h.id === sf.homeworkId);
        const ts = typeStyle[sf.type] || typeStyle.doc;
        const isSubmitted = !!sf.submittedAt;
        return el('div', { className: 'flex items-center justify-between p-4 border border-gray-100 hover:border-black transition group' },
          el('div', { className: 'flex items-center gap-4' },
            el('div', { className: `p-2 ${ts.bg}` }, Icon(sf.type, `w-5 h-5 ${ts.icon}`)),
            el('div', {},
              el('p', { className: 'font-bold text-black text-sm' }, sf.name),
              el('p', { className: 'text-xs text-gray-400 mt-0.5' }, hw ? `Assignment: ${hw.name}` : 'Assigned file'),
              sf.lastEditedAt ? el('p', { className: 'text-xs text-gray-300 mt-0.5' }, `Last edited: ${new Date(sf.lastEditedAt).toLocaleString()}`) : null
            )
          ),
          el('div', { className: 'flex items-center gap-3' },
            isSubmitted
              ? el('span', { className: 'text-xs font-bold text-green-600 uppercase tracking-wider px-3 py-1 bg-green-50 border border-green-200' }, '✓ Submitted')
              : null,
            el('button', {
              className: 'px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-black hover:bg-gray-800 transition',
              onClick: () => {
                state._editorReturnView = 'dashboard';
                openEditor({ id: sf.masterFileId, name: sf.name, type: sf.type, content: sf.content }, true, sf.id);
              }
            }, 'Open & Edit'),
            !isSubmitted ? PendingButton('submitStudentFile:' + sf.id, 'Submit', 'Submitting…', () => submitStudentFile(sf.id), 'px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 transition') : null
          )
        );
      })
    ))
  );
}

// ==============================================
// ASSIGNMENT FILTERS
// ==============================================

function applyHomeworkFilters(homework, isTeacher) {
  const today = new Date(); today.setHours(0,0,0,0);
  return homework.filter(hw => {
    // Classroom filter
    if (state.filterClassroomId !== 'all' && hw.classroomId !== Number(state.filterClassroomId)) return false;

    // Date filter
    if (state.filterDate) {
      const due = hw.date ? new Date(hw.date) : null;
      if (due) due.setHours(0,0,0,0);
      if (state.filterDate === 'overdue' && (!due || due >= today)) return false;
      if (state.filterDate === 'today'   && (!due || due.getTime() !== today.getTime())) return false;
      if (state.filterDate === 'upcoming' && (!due || due <= today)) return false;
      if (state.filterDate === 'no-date' && hw.date) return false;
    }

    // Submitted filter (student side)
    if (!isTeacher && state.filterSubmitted !== 'all') {
      const myFile = state.studentFiles.find(sf => sf.homeworkId === hw.id && sf.studentId === state.currentUser.id);
      const submitted = myFile && myFile.submittedAt;
      if (state.filterSubmitted === 'submitted' && !submitted) return false;
      if (state.filterSubmitted === 'not-submitted' && submitted) return false;
    }

    // Submissions filter (teacher side — has at least one submission)
    if (isTeacher && state.filterSubmitted !== 'all') {
      const count = state.studentFiles.filter(sf => sf.homeworkId === hw.id && sf.submittedAt).length;
      if (state.filterSubmitted === 'submitted' && count === 0) return false;
      if (state.filterSubmitted === 'not-submitted' && count > 0) return false;
    }

    // Marked filter — marked means at least one student has been graded
    if (state.filterMarked !== 'all') {
      const hasGrade = state.grades.some(gr => gr.homeworkId === hw.id && gr.value && String(gr.value).trim() !== '');
      if (state.filterMarked === 'marked' && !hasGrade) return false;
      if (state.filterMarked === 'not-marked' && hasGrade) return false;
    }

    return true;
  });
}

function AssignmentFilters(classrooms, isTeacher, hideClassFilter = false) {
  const classActive   = !hideClassFilter && state.filterClassroomId !== 'all';
  const dateActive    = !!state.filterDate;
  const statusActive  = state.filterSubmitted !== 'all';
  const markedActive  = state.filterMarked !== 'all';
  const activeCount   = [classActive, dateActive, statusActive, markedActive].filter(Boolean).length;

  // Get label for current classroom selection
  const selectedClass = classrooms.find(c => c.id === state.filterClassroomId);
  const classLabel    = classActive ? (selectedClass ? selectedClass.name : 'Class') : 'Class';
  const dateLabels    = { overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', 'no-date': 'No date' };
  const dateLabel     = dateActive ? (dateLabels[state.filterDate] || 'Date') : 'Date';
  const statusLabel   = statusActive
    ? (state.filterSubmitted === 'submitted' ? (isTeacher ? 'Has submissions' : 'Submitted') : (isTeacher ? 'No submissions' : 'Not submitted'))
    : 'Status';
  const markedLabel   = markedActive ? (state.filterMarked === 'marked' ? 'Marked' : 'Not marked') : 'Marked';

  function toggleDropdown(name, e) {
    e.stopPropagation();
    state.activeFilterDropdown = state.activeFilterDropdown === name ? null : name;
    render();
    // Close on outside click
    if (state.activeFilterDropdown === name) {
      setTimeout(() => {
        const handler = (ev) => {
          const dropdown = document.getElementById('filter-dropdown-' + name);
          if (dropdown && !dropdown.contains(ev.target)) {
            state.activeFilterDropdown = null;
            render();
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 10);
    }
  }

  function FilterBtn(key, label, isActive) {
    const open = state.activeFilterDropdown === key;
    return el('div', { className: 'relative', id: 'filter-dropdown-' + key },
      el('button', {
        className: `flex items-center gap-2 px-4 py-2 text-sm font-bold border-2 transition select-none
          ${isActive ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-black'}
          ${open ? 'border-gray-400' : ''}`,
        onClick: (e) => toggleDropdown(key, e)
      },
        el('span', {}, label),
        // Chevron
        el('span', {
          className: `text-[10px] transition-transform ${open ? 'rotate-180' : ''}`,
          style: { display: 'inline-block' }
        }, '▾')
      ),
      // Dropdown panel
      open ? DropdownPanel(key, isActive, classrooms, isTeacher) : null
    );
  }

  function DropdownPanel(key, isActive, classrooms, isTeacher) {
    function opt(label, isSelected, onClick) {
      return el('button', {
        className: `w-full text-left px-4 py-2.5 text-sm font-bold transition flex items-center justify-between
          ${isSelected ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-50'}`,
        onClick: (e) => { e.stopPropagation(); onClick(); }
      },
        el('span', {}, label),
        isSelected ? el('span', { className: 'text-[10px]' }, '✓') : null
      );
    }

    let options = [];
    if (key === 'class') {
      options = [
        opt('All classes', state.filterClassroomId === 'all', () => { state.filterClassroomId = 'all'; state.activeFilterDropdown = null; render(); }),
        ...classrooms.map(c => opt([ColorDot(c.color), c.name], state.filterClassroomId === c.id, () => { state.filterClassroomId = c.id; state.activeFilterDropdown = null; render(); }))
      ];
    } else if (key === 'date') {
      const dateOpts = [
        ['', 'Any date'],
        ['overdue', 'Overdue'],
        ['today', 'Due today'],
        ['upcoming', 'Upcoming'],
        ['no-date', 'No due date'],
      ];
      options = dateOpts.map(([val, label]) =>
        opt(label, state.filterDate === val, () => { state.filterDate = val; state.activeFilterDropdown = null; render(); })
      );
    } else if (key === 'status') {
      const statusOpts = isTeacher
        ? [['all','Any'], ['submitted','Has submissions'], ['not-submitted','No submissions yet']]
        : [['all','Any'], ['submitted','Submitted'], ['not-submitted','Not submitted']];
      options = statusOpts.map(([val, label]) =>
        opt(label, state.filterSubmitted === val, () => { state.filterSubmitted = val; state.activeFilterDropdown = null; render(); })
      );
    } else if (key === 'marked') {
      const markOpts = [['all','Any'], ['marked','Marked'], ['not-marked','Not marked']];
      options = markOpts.map(([val, label]) =>
        opt(label, state.filterMarked === val, () => { state.filterMarked = val; state.activeFilterDropdown = null; render(); })
      );
    }

    return el('div', {
      className: 'absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 shadow-xl min-w-[200px] py-1',
      style: { animation: 'filterDropIn 0.15s ease-out' }
    }, ...options);
  }

  const resetBtn = activeCount > 0
    ? el('button', {
      className: 'text-xs font-bold text-gray-400 hover:text-black uppercase tracking-wider transition border-2 border-gray-200 hover:border-black px-3 py-2',
      onClick: (e) => { e.stopPropagation(); state.filterClassroomId = 'all'; state.filterDate = ''; state.filterSubmitted = 'all'; state.filterMarked = 'all'; state.activeFilterDropdown = null; render(); }
    }, `✕ Clear${activeCount > 1 ? ' ' + activeCount : ''}`)
    : null;

  return el('div', { className: 'flex items-center gap-2 flex-wrap mb-4' },
    hideClassFilter ? null : FilterBtn('class',  classLabel,  classActive),
    FilterBtn('date',   dateLabel,   dateActive),
    FilterBtn('status', statusLabel, statusActive),
    FilterBtn('marked', markedLabel, markedActive),
    resetBtn
  );
}

function StatCard(label, value) {
  return el('div', { className: 'pl-6 border-l-2 border-black h-20 flex flex-col justify-between' },
    el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, label),
    el('p', { className: 'text-5xl font-light text-black' }, value)
  );
}

// Create/edit-classroom modal — same form for both, distinguished by state.classroomForm.id.
function ClassroomModal() {
  const form = state.classroomForm;
  const isEditing = !!form.id;
  return el('div', { className: 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 p-4' },
    el('div', { className: 'w-full max-w-lg p-12 bg-white shadow-2xl border border-gray-100' },
      el('h3', { className: 'text-2xl font-light text-black uppercase tracking-wide mb-10' }, isEditing ? 'Edit Classroom' : 'New Classroom'),
      el('div', { className: 'space-y-8' },
        el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Name'),
          el('input', {
            className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light bg-transparent transition text-black',
            placeholder: 'e.g. Matematika 2',
            value: form.name,
            onInput: (e) => { form.name = e.target.value; },
            onKeyDown: (e) => { if (e.key === 'Enter') saveClassroomModal(); }
          })
        ),
        el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Color'),
          el('div', { className: 'flex flex-wrap gap-2' },
            ...CLASSROOM_COLORS.map(c =>
              el('button', {
                className: `w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-black scale-110' : 'border-transparent'}`,
                style: { backgroundColor: c },
                title: c,
                onClick: () => { form.color = c; render(); }
              })
            )
          )
        ),
        el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Grade (ročník)'),
          el('div', { className: 'flex flex-wrap gap-2' },
            ...[1, 2, 3, 4].map(grade =>
              el('button', {
                className: `w-12 h-12 border-2 font-bold text-lg transition ${form.gradeLevels.includes(grade) ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-gray-400'}`,
                onClick: () => toggleClassroomGradeLevel(grade)
              }, String(grade))
            )
          )
        ),
        el('div', { className: 'flex gap-4' },
          PendingButton('saveClassroomModal', isEditing ? 'Save' : 'Create', isEditing ? 'Saving…' : 'Creating…', saveClassroomModal, 'flex-1 py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
          el('button', { className: 'flex-1 py-4 bg-gray-100 text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition', onClick: () => { state.showClassroomModal = false; render(); } }, 'Cancel')
        )
      )
    )
  );
}
