// ==============================================
// VIEW: CALENDAR, SETTINGS & STUDENTS — calendar view, profile settings, the
// teacher's student roster, and the join/edit-student modals. Depends on: state.js, ui-core.js, actions.js.
// ==============================================

// ==============================================
// CALENDAR VIEW
// ==============================================
function CalendarView() {
  const date = state.calendarDate || new Date();
  const year = date.getFullYear(), month = date.getMonth();

  let events = [];
  if (state.currentUser.role === 'teacher') {
    events = state.homework.filter(h => h.teacherId === state.currentUser.id);
  } else {
    const myClassIds = state.currentUser.classroomIds || [];
    events = state.homework.filter(h => {
      if (!myClassIds.includes(h.classroomId)) return false;
      if (h.assignedStudentIds === 'all') return true;
      return Array.isArray(h.assignedStudentIds) && h.assignedStudentIds.includes(state.currentUser.id);
    });
  }

  // Announcements this user pinned to a date (announcement_receipts, status 'pinned') —
  // see pinAnnouncement() in actions.js and AnnouncementBanner() in view-dashboard.js,
  // where that choice gets made. Grouped by pin_date so the day loop below can look them up.
  const pinnedAnnouncementsByDate = {};
  (state.announcementReceipts || []).forEach(r => {
    if (r.status !== 'pinned' || !r.pinDate) return;
    const a = state.announcements.find(x => x.id === r.announcementId);
    if (a) (pinnedAnnouncementsByDate[r.pinDate] ||= []).push(a);
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const years = []; for (let y = 2020; y <= 2050; y++) years.push(y);

  // Bordered box per select, matching the app's border-2/black design language elsewhere
  // (ClassroomModal, filter buttons, etc.) instead of the old bare, border-less <select>.
  const selectClass = 'appearance-none bg-transparent border-none outline-none font-bold text-black text-base cursor-pointer pr-1';
  function SelectBox(selectEl) {
    return el('div', { className: 'inline-flex items-center gap-1.5 border-2 border-gray-200 hover:border-black focus-within:border-black px-3 py-1.5 transition' },
      selectEl,
      el('span', { className: 'text-[10px] text-gray-400 pointer-events-none' }, '▾')
    );
  }

  const monthSelect = el('select', { className: selectClass, onInput: (e) => { state.calendarDate = new Date(year, Number(e.target.value), 1); render(); } }, ...monthNames.map((m, i) => { const opt = el('option', { value: i }, m); if (i === month) opt.selected = true; return opt; }));
  const yearSelect = el('select', { className: selectClass, onInput: (e) => { state.calendarDate = new Date(Number(e.target.value), month, 1); render(); } }, ...years.map(y => { const opt = el('option', { value: y }, y); if (y === year) opt.selected = true; return opt; }));

  const navBar = el('div', { className: 'flex items-center gap-2 mb-8' },
    el('button', { className: 'w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition font-bold text-gray-500 hover:text-black text-xl', onClick: () => { state.calendarDate = new Date(year, month - 1, 1); render(); } }, '‹'),
    el('div', { className: 'flex items-center gap-2' }, SelectBox(monthSelect), SelectBox(yearSelect)),
    el('button', { className: 'w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition font-bold text-gray-500 hover:text-black text-xl', onClick: () => { state.calendarDate = new Date(year, month + 1, 1); render(); } }, '›'),
    el('div', { className: 'ml-auto' }, el('button', { className: 'px-4 py-1.5 text-xs font-bold uppercase tracking-widest border border-gray-300 hover:border-black hover:text-black text-gray-400 transition', onClick: () => { state.calendarDate = new Date(); render(); } }, 'Today'))
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const grid = el('div', { className: 'grid grid-cols-7 gap-4' });
  for (let i = 0; i < firstDay; i++) grid.appendChild(el('div', { className: 'min-h-[120px]' }));
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.date === dateStr);
    const dayPins = pinnedAnnouncementsByDate[dateStr] || [];
    const isToday = isCurrentMonth && today.getDate() === d;
    const dayNumber = isToday ? el('span', { className: 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-black text-white text-sm font-bold' }, d) : el('span', { className: 'text-lg font-light text-gray-400' }, d);
    grid.appendChild(el('div', { className: `min-h-[120px] p-2 border-t-2 ${isToday ? 'border-black' : 'border-gray-100'}` },
      dayNumber,
      el('div', { className: 'mt-2 space-y-1' },
        ...dayEvents.map(ev => {
          const cls = state.classrooms.find(c => c.id === ev.classroomId);
          const attrs = { className: 'text-[10px] py-1 px-2 text-white font-bold truncate', style: { backgroundColor: (cls && cls.color) || '#000000' } };
          if (cls) attrs.title = cls.name;
          return el('div', attrs, ev.name);
        }),
        ...dayPins.map(a => {
          // Only the short description is shown here — never the full message (see
          // AnnouncementBanner() in view-dashboard.js, where that message stays behind a
          // click too). Older announcements with no short_description show a plain
          // fallback rather than leaking the message text. Clicking it opens
          // CalendarAnnouncementModal() below so they can read the full message and close
          // it again.
          const label = a.shortDescription || 'Oznámení';
          return el('div', {
            className: 'text-[10px] py-1 px-2 bg-black text-white font-bold truncate cursor-pointer hover:bg-gray-700 transition',
            title: label,
            onClick: () => { state.openedCalendarAnnouncementId = a.id; render(); }
          }, label);
        })
      )
    ));
  }

  // gap-4 here matches the day grid below (line ~42) — without it the two grids' 7 equal
  // columns compute to different actual widths and the header drifts out of alignment with
  // the day cells under it.
  return el('div', {}, navBar, el('div', { className: 'grid grid-cols-7 gap-4 border-b border-black pb-4 mb-4' }, ...['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => el('div', { className: 'text-xs font-bold text-gray-400 uppercase' }, d))), grid,
    state.openedCalendarAnnouncementId ? CalendarAnnouncementModal() : null
  );
}

// Opened by clicking a pinned announcement's label on the Calendar grid above — shows the
// full message (the grid itself only ever shows the short description) with a Close button
// that just clears state.openedCalendarAnnouncementId. Same overlay pattern as ClassroomModal().
function CalendarAnnouncementModal() {
  const a = state.announcements.find(x => x.id === state.openedCalendarAnnouncementId);
  const close = () => { state.openedCalendarAnnouncementId = null; render(); };
  if (!a) { close(); return null; }
  return el('div', { className: 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 p-4', onClick: close },
    el('div', { className: 'relative w-full max-w-lg bg-white shadow-2xl border-2 border-black', onClick: (e) => e.stopPropagation() },
      // Quick-exit × in the corner — same visual language as ToastDisplay's dismiss control —
      // so closing doesn't require reading all the way down to the footer buttons.
      el('button', { className: 'absolute top-4 right-4 text-xl font-bold text-gray-300 hover:text-black transition leading-none', onClick: close }, '×'),

      // Header block — who sent it + when, with the megaphone icon used everywhere else
      // announcements show up, so this reads as the same feature rather than a generic popup.
      el('div', { className: 'flex items-center gap-3 p-6 pb-5 border-b border-gray-100' },
        el('div', { className: 'p-2 bg-black flex-shrink-0' }, Icon('megaphone', 'w-4 h-4 text-white')),
        el('div', { className: 'min-w-0' },
          el('p', { className: 'text-xs font-bold text-black uppercase tracking-wider truncate' }, `Zpráva od: ${a.principalName || 'Principal'}`),
          el('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider mt-0.5' }, new Date(a.createdAt).toLocaleString())
        )
      ),

      // Body — title matches the weight/case AnnouncementBanner uses for the same text, so the
      // collapsed preview and the expanded modal don't read as two different styles.
      el('div', { className: 'p-6 space-y-4' },
        a.shortDescription ? el('h3', { className: 'text-lg font-bold text-black' }, a.shortDescription) : null,
        el('p', { className: 'text-sm text-black leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-100 p-4' }, a.message)
      ),

      // Footer — Unpin is the actual decision here, so it gets the black primary button, same
      // as Confirm/Cancel elsewhere in the app; Close is the safe no-op and stays a quiet outline.
      el('div', { className: 'flex gap-4 p-6 pt-2' },
        PendingButton('unpinAnnouncement:' + a.id, 'Unpin from Calendar', 'Removing…', () => { unpinAnnouncement(a.id); close(); }, 'flex-1 py-4 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition'),
        el('button', { className: 'flex-1 py-4 border-2 border-gray-300 text-gray-500 font-bold uppercase tracking-widest text-xs hover:border-black hover:text-black transition', onClick: close }, 'Close')
      )
    )
  );
}

// ==============================================
// SETTINGS & STUDENTS
// ==============================================
function SettingsView() {
  return el('div', { className: 'max-w-2xl' },
    el('h3', { className: 'text-xl font-bold mb-8 text-black uppercase tracking-wider' }, 'Profile Settings'),
    el('div', { className: 'space-y-8' },
      el('div', {},
        el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Display Name'),
        el('input', { className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light bg-transparent transition text-black', value: state.profileForm.name, onInput: (e) => state.profileForm.name = e.target.value }),
        el('p', { className: 'text-xs text-gray-400 mt-2' }, "This changes how your name is shown — you'll still log in with the name you first registered.")
      ),
      el('div', {}, el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Birth Date'), el('input', { type: 'date', className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light bg-transparent transition text-black', value: state.profileForm.birthDate, onInput: (e) => state.profileForm.birthDate = e.target.value })),
      state.currentUser.role === 'teacher' ? el('div', {},
        el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Weekly Teaching Hours'),
        el('input', {
          type: 'number', min: 0, max: 60,
          className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light bg-transparent transition text-black',
          placeholder: 'e.g. 22',
          value: state.profileForm.weeklyHours,
          onInput: (e) => state.profileForm.weeklyHours = e.target.value
        }),
        el('p', { className: 'text-xs text-gray-400 mt-2' }, 'Shown to the principal on your teacher profile.')
      ) : null,
      PendingButton('saveProfile', 'Save Changes', 'Saving…', saveProfile, 'px-8 py-3 bg-black text-white hover:bg-gray-800 font-bold uppercase tracking-wider text-sm transition'),
      el('div', { className: 'pt-8 border-t border-gray-100' },
        el('label', { className: 'block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider' }, 'Password Recovery Phrase'),
        el('input', {
          type: 'password',
          className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light bg-transparent transition text-black',
          placeholder: 'Set or replace your recovery phrase',
          value: state.newRecoveryPhrase,
          onInput: (e) => state.newRecoveryPhrase = e.target.value
        }),
        el('p', { className: 'text-xs text-gray-400 mt-2' }, "There's no real email on this account, so this phrase is the only way to reset your password if you forget it. Set one if you registered before this existed, or replace the one you have."),
        PendingButton('updateRecoveryPhrase', 'Save Recovery Phrase', 'Saving…', updateRecoveryPhrase, 'mt-4 px-8 py-3 bg-white text-black border-2 border-black hover:bg-gray-50 font-bold uppercase tracking-wider text-sm transition')
      )
    )
  );
}

function TeacherStudentsView() {
  const myClassIds = state.classrooms.filter(c => c.teacherId === state.currentUser.id).map(c => c.id);
  const myStudents = state.students.filter(s => s.classroomIds && s.classroomIds.some(id => myClassIds.includes(id)));

  return el('div', { className: 'space-y-6' },
    el('h3', { className: 'text-sm font-bold text-gray-400 uppercase tracking-widest mb-6' }, 'Enrolled Students'),
    myStudents.length === 0
      ? el('div', { className: 'py-12 border-t border-gray-200 text-gray-400 font-light' }, 'No students found.')
      : el('table', { className: 'w-full text-left' },
        el('thead', {}, el('tr', {},
          el('th', { className: 'pb-4 text-xs font-bold uppercase text-gray-400 tracking-wider' }, 'Name'),
          el('th', { className: 'pb-4 text-xs font-bold uppercase text-gray-400 tracking-wider' }, 'Files'),
          el('th', { className: 'pb-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-right' }, 'Action')
        )),
        el('tbody', {}, ...myStudents.map(student => {
          const studentFileCount = state.studentFiles.filter(sf => sf.studentId === student.id).length;
          const submittedCount = state.studentFiles.filter(sf => sf.studentId === student.id && sf.submittedAt).length;
          return el('tr', { className: 'border-t border-gray-100 hover:bg-gray-50 transition' },
            el('td', { className: 'py-4 font-bold text-black' }, student.name),
            el('td', { className: 'py-4 text-sm text-gray-500' }, `${submittedCount}/${studentFileCount} submitted`),
            el('td', { className: 'py-4 text-right' }, el('button', { className: 'text-xs font-bold uppercase text-gray-400 hover:text-black', onClick: () => openStudentEdit(student) }, 'Edit'))
          );
        }))
      ),
    state.showStudentEditModal ? StudentEditModal() : null
  );
}

// ==============================================
// MODALS
// ==============================================
function JoinModal() {
  return el('div', { className: 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 p-4' },
    el('div', { className: 'w-full max-w-lg p-12 bg-white shadow-2xl border border-gray-100' },
      el('h3', { className: 'text-2xl font-light text-black uppercase tracking-wide mb-10' }, 'Join Classroom'),
      el('div', { className: 'space-y-8' },
        el('input', { className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light text-black text-center tracking-widest', placeholder: 'CODE', onInput: (e) => state.joinCode = e.target.value }),
        el('div', { className: 'flex gap-4' },
          PendingButton('joinClassroom', 'Join', 'Joining…', joinClassroom, 'flex-1 py-4 bg-black text-white font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
          el('button', { className: 'flex-1 py-4 bg-gray-100 text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition', onClick: () => { state.showJoinModal = false; render(); } }, 'Cancel')
        )
      )
    )
  );
}

function StudentEditModal() {
  return el('div', { className: 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 p-4' },
    el('div', { className: 'w-full max-w-lg p-12 bg-white shadow-2xl border border-gray-100' },
      el('h3', { className: 'text-2xl font-light text-black uppercase tracking-wide mb-10' }, 'Edit Student'),
      el('div', { className: 'space-y-8' },
        el('input', { className: 'w-full p-3 border-b-2 border-gray-200 focus:border-black outline-none text-xl font-light text-black', value: state.profileForm.name, onInput: (e) => state.profileForm.name = e.target.value }),
        el('div', { className: 'flex gap-4' },
          PendingButton('saveStudentByTeacher', 'Save', 'Saving…', saveStudentByTeacher, 'flex-1 py-4 bg-black text-white font-bold uppercase tracking-widest'),
          el('button', { className: 'flex-1 py-4 bg-gray-100 text-black font-bold uppercase tracking-widest', onClick: () => { state.showStudentEditModal = false; render(); } }, 'Cancel')
        )
      )
    )
  );
}
