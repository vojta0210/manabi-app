// ==============================================
// VIEW: SCHEDULE (rozvrh) — a weekly timetable grid, 0.–11. hodina × Monday–Friday
// (see LESSON_PERIODS/SCHEDULE_DAYS in config.js). The principal assigns a classroom
// (subject + teacher) to each class's cells; students see their own class's grid
// read-only; teachers see their own teaching slots across every class they teach;
// homeroom teachers additionally get read access to their homeroom class's grid (RLS,
// see schema.sql section 12 / patch_schedule.sql) even though this view doesn't give them
// a dedicated entry point for it yet.
// Depends on: state.js, ui-core.js, config.js, schedule.js.
// ==============================================

function ScheduleView() {
  const role = state.currentUser.role;
  if (role === 'principal') return PrincipalScheduleRouter();
  if (role === 'teacher') return TeacherScheduleView();
  return StudentScheduleView();
}

// Reusable grid shell — renderCell(dayValue, periodIndex) returns the el() for one cell.
// Days are the leftmost column and stay pinned (position: sticky) while periods run
// left-to-right as wide, fixed-size columns that scroll under it via the browser's own
// horizontal scrollbar — the day names are always visible, only the hours slide underneath,
// and cells stay large instead of shrinking on narrower screens.
const SCHEDULE_PERIOD_COL_PX = 120;
const SCHEDULE_DAY_COL_PX = 100;
const SCHEDULE_STICKY_COL_STYLE = { position: 'sticky', left: '0', zIndex: '1', boxShadow: '2px 0 4px -2px rgba(0,0,0,0.15)' };
function ScheduleGrid(renderCell) {
  const cols = `${SCHEDULE_DAY_COL_PX}px repeat(${LESSON_PERIODS.length}, ${SCHEDULE_PERIOD_COL_PX}px)`;
  return el('div', { className: 'overflow-x-auto' },
    el('div', { className: 'inline-block' },
      el('div', { className: 'grid gap-px bg-gray-200 mb-px', style: { gridTemplateColumns: cols } },
        el('div', { className: 'bg-white', style: SCHEDULE_STICKY_COL_STYLE }),
        ...LESSON_PERIODS.map(p => el('div', { className: 'bg-white p-2 text-center flex flex-col justify-center' },
          el('p', { className: 'text-xs font-bold text-black' }, p.label),
          el('p', { className: 'text-[10px] text-gray-400' }, `${p.start}–${p.end}`)
        ))
      ),
      ...SCHEDULE_DAYS.map(d =>
        el('div', { className: 'grid gap-px bg-gray-200 mb-px', style: { gridTemplateColumns: cols } },
          el('div', {
            className: 'bg-white p-2 flex items-center justify-center text-center text-xs font-bold text-gray-400 uppercase tracking-widest',
            style: SCHEDULE_STICKY_COL_STYLE,
          }, d.label),
          ...LESSON_PERIODS.map((p, periodIdx) => renderCell(d.value, periodIdx))
        )
      )
    )
  );
}

// A cell with no subject assigned stays plain white; a filled cell is colored with its
// classroom's color (see CLASSROOM_COLORS — chosen dark/saturated enough for white text).
// `style` lets callers add a background color; onClick/onDragOver/onDrop are all optional.
function ScheduleCell(content, { onClick, backgroundColor, dragHandlers } = {}) {
  const attrs = {
    className: `min-h-[84px] p-2 flex items-center justify-center text-center transition ${backgroundColor ? '' : 'bg-white'} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`,
    style: backgroundColor ? { backgroundColor } : {},
  };
  if (onClick) attrs.onClick = onClick;
  if (dragHandlers) Object.assign(attrs, dragHandlers);
  return el('div', attrs, content);
}

function SubjectCellContent(classroomId, textClass) {
  const cls = state.classrooms.find(c => c.id === classroomId);
  if (!cls) return el('span', { className: 'text-gray-200 text-xs' }, '—');
  const teacher = state.teachers.find(t => t.id === cls.teacherId);
  return el('div', {},
    el('p', { className: `text-xs font-bold leading-tight ${textClass || 'text-black'}` }, cls.name),
    teacher ? el('p', { className: `text-[10px] mt-0.5 ${textClass ? 'text-white/80' : 'text-gray-400'}` }, teacher.name) : null
  );
}

// ── STUDENT — own class, read-only ──
function StudentScheduleView() {
  const schoolClassId = state.currentUser.schoolClassId;
  const sc = state.schoolClasses.find(c => c.id === schoolClassId);
  if (!schoolClassId || !sc) {
    return el('div', { className: 'py-16 text-center text-gray-400 font-light' }, "You're not enrolled in a class yet.");
  }
  return el('div', { className: 'max-w-5xl space-y-6' },
    el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, sc.name),
    ScheduleGrid((day, periodIdx) => {
      const slot = state.schedule.find(s => s.schoolClassId === schoolClassId && s.dayOfWeek === day && s.period === periodIdx);
      const cls = slot ? state.classrooms.find(c => c.id === slot.classroomId) : null;
      return ScheduleCell(SubjectCellContent(slot ? slot.classroomId : null, cls ? 'text-white' : null), { backgroundColor: cls ? cls.color : null });
    })
  );
}

// ── TEACHER — own teaching slots across every class, read-only, plus (if this teacher is a
// homeroom teacher) a second read-only grid for their homeroom class's full schedule — RLS
// already let them read it (see schema.sql section 12 / patch_schedule.sql), this just gives
// it a visible entry point instead of requiring they know it's there.
function TeacherScheduleView() {
  const myClassroomIds = new Set(state.classrooms.filter(c => c.teacherId === state.currentUser.id).map(c => c.id));
  const homeroomClass = state.schoolClasses.find(c => c.homeroomTeacherId === state.currentUser.id);
  return el('div', { className: 'max-w-5xl space-y-12' },
    el('div', { className: 'space-y-6' },
      el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, 'My Teaching Schedule'),
      myClassroomIds.size === 0
        ? el('p', { className: 'text-sm text-gray-400' }, "You don't have a subject set up yet.")
        : null,
      ScheduleGrid((day, periodIdx) => {
        const slots = state.schedule.filter(s => s.dayOfWeek === day && s.period === periodIdx && myClassroomIds.has(s.classroomId));
        if (slots.length === 0) return ScheduleCell(el('span', { className: 'text-gray-200 text-xs' }, '—'));
        if (slots.length === 1) {
          const sc = state.schoolClasses.find(c => c.id === slots[0].schoolClassId);
          const cls = state.classrooms.find(c => c.id === slots[0].classroomId);
          return ScheduleCell(
            el('div', {},
              el('p', { className: 'text-xs font-bold text-white leading-tight' }, sc ? sc.name : '?'),
              el('p', { className: 'text-[10px] text-white/80' }, cls ? cls.name : '')
            ),
            { backgroundColor: cls ? cls.color : null }
          );
        }
        return ScheduleCell(
          el('div', { className: 'space-y-1.5' }, ...slots.map(slot => {
            const sc = state.schoolClasses.find(c => c.id === slot.schoolClassId);
            const cls = state.classrooms.find(c => c.id === slot.classroomId);
            return el('div', {},
              el('p', { className: 'text-xs font-bold text-black leading-tight' }, sc ? sc.name : '?'),
              el('p', { className: 'text-[10px] text-gray-400' }, cls ? cls.name : '')
            );
          }))
        );
      })
    ),
    homeroomClass
      ? el('div', { className: 'space-y-6' },
          el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, `Homeroom: ${homeroomClass.name} (full schedule)`),
          ScheduleGrid((day, periodIdx) => {
            const slot = state.schedule.find(s => s.schoolClassId === homeroomClass.id && s.dayOfWeek === day && s.period === periodIdx);
            const cls = slot ? state.classrooms.find(c => c.id === slot.classroomId) : null;
            return ScheduleCell(SubjectCellContent(slot ? slot.classroomId : null, cls ? 'text-white' : null), { backgroundColor: cls ? cls.color : null });
          })
        )
      : null
  );
}

// ── PRINCIPAL — pick a class, then edit its grid ──
function PrincipalScheduleRouter() {
  return state.scheduleEditingClassId ? PrincipalScheduleEditor() : PrincipalScheduleClassPicker();
}

function PrincipalScheduleClassPicker() {
  const classes = [...state.schoolClasses].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return el('div', { className: 'space-y-6 max-w-3xl' },
    el('h3', { className: 'text-sm font-bold text-gray-400 uppercase tracking-widest' }, 'Pick a class to edit its schedule'),
    classes.length === 0
      ? el('p', { className: 'text-sm text-gray-400 py-8' }, 'No classes set up yet.')
      : el('div', { className: 'space-y-2' }, ...classes.map(sc => {
          const slotCount = state.schedule.filter(s => s.schoolClassId === sc.id).length;
          return el('div', {
            className: 'flex items-center justify-between px-4 py-4 border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer',
            onClick: () => { state.scheduleEditingClassId = sc.id; render(); }
          },
            el('p', { className: 'text-sm font-bold text-black' }, sc.name),
            el('span', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, `${slotCount} slot(s) set`)
          );
        }))
  );
}

// The principal assigns subjects by dragging a chip from the right-hand sidebar (filtered to
// this class's ročník, via classrooms.grade_levels) onto a grid cell — see schedule.js
// (assignScheduleSlot/removeScheduleSlot) and schoolClassGrade(). Clicking an already-filled
// cell removes it (with a confirm). Native HTML5 drag-and-drop; state.scheduleDragClassroomId
// is a dragstart/dragend fallback for browsers that don't surface dataTransfer on dragover.
function PrincipalScheduleEditor() {
  const sc = state.schoolClasses.find(c => c.id === state.scheduleEditingClassId);
  if (!sc) return el('div', {}, 'Class not found.');
  const grade = schoolClassGrade(sc);
  const subjects = [...state.classrooms]
    .filter(c => grade == null || (c.gradeLevels || []).includes(grade))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  const onDropCell = (day, periodIdx) => (e) => {
    e.preventDefault();
    const classroomId = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || state.scheduleDragClassroomId;
    state.scheduleDragClassroomId = null;
    if (classroomId) assignScheduleSlot(sc.id, day, periodIdx, classroomId);
  };

  return el('div', { className: 'space-y-6' },
    el('button', {
      className: 'flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black uppercase tracking-wider transition',
      onClick: () => { state.scheduleEditingClassId = null; render(); }
    }, Icon('back', 'w-4 h-4'), 'All Classes'),
    el('div', { className: 'flex items-center justify-between' },
      el('h3', { className: 'text-lg font-bold text-black' }, sc.name),
      el('p', { className: 'text-xs text-gray-400' }, 'Drag a subject onto a cell. Click a filled cell to remove it.')
    ),
    el('div', { className: 'flex gap-6 items-start' },
      // min-w-0 is load-bearing: without it a flex item grows to fit its content (the grid is
      // ~1540px wide) instead of staying within the row, which would push the subject sidebar
      // off-screen and force a page-level horizontal scroll instead of scrolling just the grid.
      el('div', { className: 'flex-1 min-w-0' },
        ScheduleGrid((day, periodIdx) => {
          const slot = state.schedule.find(s => s.schoolClassId === sc.id && s.dayOfWeek === day && s.period === periodIdx);
          const cls = slot ? state.classrooms.find(c => c.id === slot.classroomId) : null;
          const content = cls ? SubjectCellContent(slot.classroomId, 'text-white') : el('span', { className: 'text-gray-200 text-xs' }, '·');
          return ScheduleCell(content, {
            backgroundColor: cls ? cls.color : null,
            onClick: cls ? () => removeScheduleSlot(sc.id, day, periodIdx, cls.name) : null,
            dragHandlers: { onDragOver: (e) => e.preventDefault(), onDrop: onDropCell(day, periodIdx) },
          });
        })
      ),
      // Sticky so the subject chips stay in view (and draggable) even if the page itself
      // scrolls vertically — only the grid area scrolls, via its own horizontal scrollbar.
      el('div', { className: 'w-56 shrink-0 sticky top-4' },
        el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, grade ? `Ročník ${grade} subjects` : 'Subjects'),
        subjects.length === 0
          ? el('p', { className: 'text-xs text-gray-400' }, 'No subjects tagged for this ročník yet — a teacher needs to create one and select it.')
          : null,
        // Capped height (~7 chips) with its own scrollbar, so a grade with a lot of subjects
        // doesn't stretch the sidebar down the whole page — scroll this list instead.
        el('div', { className: 'space-y-2 max-h-[420px] overflow-y-auto pr-1' },
          ...subjects.map(c => {
            const teacher = state.teachers.find(t => t.id === c.teacherId);
            return el('div', {
              draggable: true,
              onDragStart: (e) => {
                if (e.dataTransfer) e.dataTransfer.setData('text/plain', String(c.id));
                state.scheduleDragClassroomId = c.id;
              },
              onDragEnd: () => { state.scheduleDragClassroomId = null; },
              className: 'p-3 cursor-grab active:cursor-grabbing text-white select-none',
              style: { backgroundColor: c.color },
            },
              el('p', { className: 'text-xs font-bold leading-tight' }, c.name),
              teacher ? el('p', { className: 'text-[10px] text-white/80 mt-0.5' }, teacher.name) : null
            );
          })
        )
      )
    )
  );
}
