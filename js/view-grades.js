// ==============================================
// VIEW: GRADES — letter-grade helpers, saveGrade()/deleteGrade() (writes to the
// `grades` table), and the student/teacher grade views. Depends on: state.js, ui-core.js.
// ==============================================

// ==============================================
// GRADING HELPERS
// ==============================================

function getLetterGrade(pct) {
  if (pct >= 90) return { letter: 'A', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
  if (pct >= 80) return { letter: 'B', color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200'  };
  if (pct >= 70) return { letter: 'C', color: 'text-yellow-600',bg: 'bg-yellow-50',border: 'border-yellow-200'};
  if (pct >= 60) return { letter: 'D', color: 'text-orange-600',bg: 'bg-orange-50',border: 'border-orange-200'};
  return              { letter: 'F', color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'  };
}

// Get all graded entries for a student across teacher's homework
// Returns array of { hw, earnedPoints, maxPoints, pct, grade }
function getStudentGradeData(studentId, teacherHomework) {
  return teacherHomework.map(hw => {
    const maxPoints = parseFloat(hw.points) || 0;
    const g = state.grades.find(gr => gr.homeworkId === hw.id && gr.studentId === studentId);
    const rawGrade = g ? g.value : null;
    const earnedPoints = rawGrade !== null && rawGrade !== '' && rawGrade !== undefined ? parseFloat(rawGrade) : null;
    const pct = (earnedPoints !== null && maxPoints > 0) ? Math.round((earnedPoints / maxPoints) * 100) : null;
    return { hw, earnedPoints, maxPoints, pct, rawGrade };
  });
}

function calcOverall(gradeData) {
  const graded = gradeData.filter(g => g.earnedPoints !== null && g.maxPoints > 0);
  if (!graded.length) return null;
  const earned = graded.reduce((s, g) => s + g.earnedPoints, 0);
  const max    = graded.reduce((s, g) => s + g.maxPoints, 0);
  return max > 0 ? Math.round((earned / max) * 100) : null;
}

// Save a grade for a student on a homework — writes straight to the `grades` table.
// Note there is deliberately no student write-policy on that table (see schema.sql): a
// student could point devtools straight at Supabase and RLS alone still blocks a
// self-write, no trigger required.
async function saveGrade(hwId, studentId, value) {
  if (value === '' || value === null || value === undefined) {
    return deleteGrade(hwId, studentId);
  }
  const { error } = await sb.from('grades').upsert({ homework_id: hwId, student_id: studentId, value: String(value) });
  if (error) { alert('Could not save grade: ' + error.message); return; }
  const idx = state.grades.findIndex(g => g.homeworkId === hwId && g.studentId === studentId);
  if (idx !== -1) state.grades[idx].value = String(value);
  else state.grades.push({ homeworkId: hwId, studentId, value: String(value) });
  render();
}

async function deleteGrade(hwId, studentId) {
  const { error } = await sb.from('grades').delete().eq('homework_id', hwId).eq('student_id', studentId);
  if (error) { alert('Could not remove grade: ' + error.message); return; }
  state.grades = state.grades.filter(g => !(g.homeworkId === hwId && g.studentId === studentId));
  render();
}

// Short written feedback alongside (or instead of) a numeric grade — see
// patch_grade_comments_announcements.sql for the `grades.comment` column. Upserting only
// { homework_id, student_id, comment } leaves an existing `value` untouched (Postgres
// ON CONFLICT DO UPDATE only touches the columns actually submitted), so this is safe to
// call independently of saveGrade().
async function saveGradeComment(hwId, studentId, comment) {
  const { error } = await sb.from('grades').upsert({ homework_id: hwId, student_id: studentId, comment: comment || null });
  if (error) { alert('Could not save comment: ' + error.message); return; }
  const idx = state.grades.findIndex(g => g.homeworkId === hwId && g.studentId === studentId);
  if (idx !== -1) state.grades[idx].comment = comment;
  else state.grades.push({ homeworkId: hwId, studentId, value: null, comment });
  render();
}

// ==============================================
// GRADES VIEW
// ==============================================

function GradesView() {
  if (state.currentUser.role === 'student') return StudentGradesView();
  return TeacherGradesView();
}

// ── STUDENT GRADES VIEW ──
function StudentGradesView() {
  const myClassIds = state.currentUser.classroomIds || [];
  const myHomework = state.homework.filter(h => {
    if (!myClassIds.includes(h.classroomId)) return false;
    if (h.assignedStudentIds === 'all') return true;
    return Array.isArray(h.assignedStudentIds) && h.assignedStudentIds.includes(state.currentUser.id);
  });

  const gradeData = getStudentGradeData(state.currentUser.id, myHomework);
  const overallPct = calcOverall(gradeData);
  const overall = overallPct !== null ? getLetterGrade(overallPct) : null;
  const gradedCount = gradeData.filter(g => g.earnedPoints !== null).length;

  // Group by classroom
  const classroomGroups = {};
  gradeData.forEach(g => {
    const cls = state.classrooms.find(c => c.id === g.hw.classroomId);
    const key = cls ? cls.id : 0;
    if (!classroomGroups[key]) classroomGroups[key] = { cls, entries: [] };
    classroomGroups[key].entries.push(g);
  });

  function GradeBar(pct) {
    const g = getLetterGrade(pct);
    return el('div', { className: 'w-full bg-gray-100 h-2 rounded-full overflow-hidden' },
      el('div', {
        className: `h-2 rounded-full transition-all ${g.bg.replace('bg-', 'bg-')}`,
        style: { width: pct + '%', backgroundColor: pct >= 90 ? '#16a34a' : pct >= 80 ? '#2563eb' : pct >= 70 ? '#ca8a04' : pct >= 60 ? '#ea580c' : '#dc2626' }
      })
    );
  }

  return el('div', { className: 'space-y-10 max-w-4xl' },

    // Overall summary card
    el('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-6' },
      el('div', { className: 'p-6 border-2 border-black bg-black text-white flex flex-col justify-between' },
        el('p', { className: 'text-xs font-bold uppercase tracking-widest text-gray-400 mb-2' }, 'Overall Grade'),
        overall
          ? el('div', { className: 'flex items-end gap-3' },
            el('span', { className: 'text-6xl font-light' }, overall.letter),
            el('span', { className: 'text-2xl font-bold text-gray-400 mb-1' }, overallPct + '%')
          )
          : el('span', { className: 'text-2xl font-light text-gray-500' }, 'No grades yet')
      ),
      el('div', { className: 'p-6 border-2 border-gray-200 flex flex-col justify-between' },
        el('p', { className: 'text-xs font-bold uppercase tracking-widest text-gray-400 mb-2' }, 'Assignments'),
        el('p', { className: 'text-5xl font-light text-black' }, myHomework.length)
      ),
      el('div', { className: 'p-6 border-2 border-gray-200 flex flex-col justify-between' },
        el('p', { className: 'text-xs font-bold uppercase tracking-widest text-gray-400 mb-2' }, 'Graded'),
        el('p', { className: 'text-5xl font-light text-black' }, gradedCount),
        el('p', { className: 'text-xs text-gray-400 mt-1' }, `of ${myHomework.length} assignments`)
      )
    ),

    // Per-classroom breakdown
    ...Object.values(classroomGroups).map(({ cls, entries }) => {
      const clsPct = calcOverall(entries);
      const clsGrade = clsPct !== null ? getLetterGrade(clsPct) : null;

      return el('div', { className: 'space-y-4' },
        // Classroom header
        el('div', { className: 'flex items-center justify-between border-b-2 border-black pb-3' },
          el('div', {},
            el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest' }, cls ? cls.name : 'Unknown Class'),
            clsGrade ? el('p', { className: `text-xs font-bold mt-1 ${clsGrade.color}` }, `Class average: ${clsPct}% — ${clsGrade.letter}`) : null
          ),
          clsGrade ? el('div', { className: `w-12 h-12 flex items-center justify-center font-black text-xl border-2 ${clsGrade.color} ${clsGrade.border} ${clsGrade.bg}` }, clsGrade.letter) : null
        ),

        // Assignment rows
        el('div', { className: 'space-y-2' },
          ...entries.map(({ hw, earnedPoints, maxPoints, pct }) => {
            const g = pct !== null ? getLetterGrade(pct) : null;
            const isGraded = earnedPoints !== null;
            const gradeRow = state.grades.find(gr => gr.homeworkId === hw.id && gr.studentId === state.currentUser.id);
            const comment = gradeRow && gradeRow.comment;
            return el('div', { className: 'flex items-center gap-4 py-3 px-4 border border-gray-100 hover:border-gray-300 transition group' },
              // Letter badge
              el('div', { className: `w-10 h-10 flex-shrink-0 flex items-center justify-center text-sm font-black border-2 ${g ? `${g.color} ${g.border} ${g.bg}` : 'text-gray-300 border-gray-100 bg-gray-50'}` },
                g ? g.letter : '–'
              ),
              // Name + bar
              el('div', { className: 'flex-1 min-w-0' },
                el('p', { className: 'text-sm font-bold text-black truncate' }, hw.name),
                el('div', { className: 'flex items-center gap-2 mt-1' },
                  el('div', { className: 'flex-1' }, isGraded ? GradeBar(pct) : el('div', { className: 'w-full bg-gray-100 h-2 rounded-full' })),
                  el('span', { className: 'text-xs text-gray-400 flex-shrink-0 w-8 text-right' }, isGraded ? pct + '%' : '—')
                ),
                comment ? el('p', { className: 'text-xs text-gray-500 italic mt-1.5' }, `"${comment}"`) : null
              ),
              // Points
              el('div', { className: 'text-right flex-shrink-0' },
                isGraded
                  ? el('div', {},
                    el('p', { className: 'text-sm font-bold text-black' }, `${earnedPoints} / ${maxPoints || '?'}`),
                    el('p', { className: 'text-[10px] text-gray-400 uppercase' }, 'pts')
                  )
                  : el('p', { className: 'text-sm text-gray-300 font-bold' }, 'Not graded')
              ),
              // Due date
              hw.date ? el('p', { className: 'text-[10px] text-gray-300 flex-shrink-0 hidden sm:block w-20 text-right' }, hw.date) : null
            );
          })
        )
      );
    }),

    myHomework.length === 0 ? el('div', { className: 'py-16 text-center text-gray-400 font-light' }, 'No assignments yet.') : null
  );
}

// ── TEACHER GRADES VIEW ──
function TeacherGradesView() {
  const myClasses  = state.classrooms.filter(c => c.teacherId === state.currentUser.id);
  const myClassIds = myClasses.map(c => c.id);
  const myHomework = state.homework.filter(h => h.teacherId === state.currentUser.id);
  const myStudents = state.students.filter(s => s.classroomIds && s.classroomIds.some(id => myClassIds.includes(id)));

  // If no classroom selected yet, force first class
  if (state.gradesClassroomId === 'all' && myClasses.length > 0) {
    state.gradesClassroomId = myClasses[0].id;
  }

  const selClsId      = Number(state.gradesClassroomId);
  const selClass      = myClasses.find(c => c.id === selClsId);
  const clsStudents   = myStudents.filter(s => s.classroomIds && s.classroomIds.includes(selClsId));
  const clsHomework   = myHomework.filter(h => h.classroomId === selClsId);

  // Drill-in to single student
  if (state.gradesStudentId !== null) {
    return TeacherStudentGradeDetail(state.gradesStudentId, clsHomework, myClasses);
  }

  // ── Classroom tab bar ──
  const tabBar = el('div', { className: 'flex gap-0 border-b-2 border-gray-200 mb-8 overflow-x-auto' },
    ...myClasses.map(c => {
      const isActive = c.id === selClsId;
      return el('button', {
        className: `px-6 py-3 text-sm font-bold transition whitespace-nowrap border-b-2 -mb-0.5
          ${isActive ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`,
        onClick: () => { state.gradesClassroomId = c.id; state.gradesStudentId = null; render(); }
      }, c.name);
    })
  );

  // ── Stats ──
  const allPcts = clsStudents
    .map(s => calcOverall(getStudentGradeData(s.id, clsHomework)))
    .filter(p => p !== null);
  const avg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : null;
  const avgGrade = avg !== null ? getLetterGrade(avg) : null;

  const statsRow = el('div', { className: 'grid grid-cols-3 gap-6 mb-10' },
    el('div', { className: 'border-l-2 border-black pl-5 flex flex-col justify-between h-16' },
      el('p', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Students'),
      el('p', { className: 'text-4xl font-light text-black' }, clsStudents.length)
    ),
    el('div', { className: 'border-l-2 border-black pl-5 flex flex-col justify-between h-16' },
      el('p', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Assignments'),
      el('p', { className: 'text-4xl font-light text-black' }, clsHomework.length)
    ),
    el('div', { className: 'border-l-2 border-black pl-5 flex flex-col justify-between h-16' },
      el('p', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Class Average'),
      avgGrade
        ? el('div', { className: 'flex items-baseline gap-2' },
          el('p', { className: `text-4xl font-light ${avgGrade.color}` }, avgGrade.letter),
          el('p', { className: 'text-lg font-bold text-gray-400' }, avg + '%')
        )
        : el('p', { className: 'text-4xl font-light text-gray-300' }, '—')
    )
  );

  // ── Student list — one card per student, only overall grade shown ──
  const studentList = clsStudents.length === 0
    ? el('div', { className: 'py-16 text-center text-gray-300 font-light text-lg border-t border-gray-100' },
      selClass ? `No students in ${selClass.name} yet.` : 'No students found.'
    )
    : el('div', { className: 'space-y-2' },
      // Header row
      el('div', { className: 'grid grid-cols-12 gap-4 px-4 pb-2 border-b border-gray-200' },
        el('div', { className: 'col-span-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Student'),
        el('div', { className: 'col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, 'Points'),
        el('div', { className: 'col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, 'Percent'),
        el('div', { className: 'col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, 'Grade'),
        el('div', { className: 'col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right' }, 'Action')
      ),
      ...clsStudents.map(student => {
        const gradeData   = getStudentGradeData(student.id, clsHomework);
        const overallPct  = calcOverall(gradeData);
        const g           = overallPct !== null ? getLetterGrade(overallPct) : null;
        const gradedItems = gradeData.filter(d => d.earnedPoints !== null);
        const totalEarned = gradedItems.reduce((s, d) => s + d.earnedPoints, 0);
        const totalMax    = gradedItems.reduce((s, d) => s + d.maxPoints, 0);

        return el('div', {
          className: 'grid grid-cols-12 gap-4 items-center px-4 py-4 border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer group',
          onClick: () => { state.gradesStudentId = student.id; render(); }
        },
          // Avatar + name
          el('div', { className: 'col-span-5 flex items-center gap-3' },
            el('div', { className: `w-9 h-9 flex items-center justify-center text-sm font-black flex-shrink-0 border-2 ${g ? `${g.color} ${g.border} ${g.bg}` : 'text-gray-400 border-gray-200 bg-gray-50'}` },
              student.name[0].toUpperCase()
            ),
            el('div', {},
              el('p', { className: 'text-sm font-bold text-black' }, student.name),
              el('p', { className: 'text-[10px] text-gray-400 mt-0.5' }, `${gradedItems.length} of ${clsHomework.length} graded`)
            )
          ),
          // Points earned / total
          el('div', { className: 'col-span-2 text-center' },
            gradedItems.length > 0
              ? el('div', {},
                el('p', { className: 'text-sm font-bold text-black' }, `${totalEarned}`),
                el('p', { className: 'text-[10px] text-gray-400' }, `/ ${totalMax} pts`)
              )
              : el('p', { className: 'text-sm text-gray-300' }, '—')
          ),
          // Percent + bar
          el('div', { className: 'col-span-2 flex flex-col items-center gap-1' },
            overallPct !== null
              ? el('div', { className: 'w-full' },
                el('p', { className: `text-sm font-bold text-center ${g ? g.color : 'text-gray-400'}` }, overallPct + '%'),
                el('div', { className: 'w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden' },
                  el('div', {
                    className: 'h-1.5 rounded-full',
                    style: { width: overallPct + '%', backgroundColor: overallPct >= 90 ? '#16a34a' : overallPct >= 80 ? '#2563eb' : overallPct >= 70 ? '#ca8a04' : overallPct >= 60 ? '#ea580c' : '#dc2626' }
                  })
                )
              )
              : el('p', { className: 'text-sm text-gray-300' }, '—')
          ),
          // Letter grade badge
          el('div', { className: 'col-span-1 flex justify-center' },
            g
              ? el('div', { className: `w-9 h-9 flex items-center justify-center text-base font-black border-2 ${g.color} ${g.border} ${g.bg}` }, g.letter)
              : el('p', { className: 'text-gray-300 text-sm text-center' }, '—')
          ),
          // Open detail arrow
          el('div', { className: 'col-span-2 flex justify-end' },
            el('span', { className: 'text-xs font-bold text-gray-300 group-hover:text-black transition uppercase tracking-wider' }, 'Open →')
          )
        );
      })
    );

  return el('div', { className: 'max-w-3xl' },
    tabBar,
    statsRow,
    el('h3', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4' }, `Students — ${selClass ? selClass.name : ''}`),
    studentList
  );
}

// ==============================================
// HOMEROOM VIEW — a homeroom teacher's read-only, cross-subject view of their own
// class's grades. Unlike TeacherGradesView above (which only ever shows homework the
// teacher set themselves), this pulls together grades from every subject teacher, made
// possible by the "homeroom teacher reads ..." RLS policies added in schema.sql.
// ==============================================
function HomeroomView() {
  const myHomerooms = state.schoolClasses.filter(sc => sc.homeroomTeacherId === state.currentUser.id);
  const unclaimed = state.schoolClasses.filter(sc => !sc.homeroomTeacherId);

  return el('div', { className: 'space-y-12 max-w-4xl' },
    myHomerooms.length === 0
      ? el('div', { className: 'py-8 border-t border-gray-200 text-gray-400 font-light text-sm' }, "You're not a homeroom teacher yet — claim a class below to see its roster and grades across every subject.")
      : el('div', { className: 'space-y-10' }, ...myHomerooms.map(sc => HomeroomClassPanel(sc))),
    // Once you've claimed at least one homeroom, the "pick a class" browsing UI is no
    // longer useful to you — hide it entirely rather than leaving dead unclaimed classes
    // sitting below your own roster.
    myHomerooms.length === 0 ? el('div', {},
      el('h3', { className: 'text-sm font-bold text-black uppercase tracking-widest mb-4' }, 'Unclaimed Classes'),
      unclaimed.length === 0
        ? el('p', { className: 'text-sm text-gray-400' }, 'Every class already has a homeroom teacher.')
        : el('div', { className: 'flex flex-wrap gap-3' }, ...unclaimed.map(sc =>
            el('button', {
              className: 'px-5 py-3 border-2 border-gray-200 hover:border-black text-sm font-bold text-black transition',
              onClick: () => claimHomeroom(sc.id)
            }, `Become homeroom teacher of ${sc.name}`)
          ))
    ) : null
  );
}

function HomeroomClassPanel(sc, showExport = false) {
  let roster = state.students.filter(s => s.schoolClassId === sc.id);
  const sortBy = state.homeroomSortBy || 'name';
  if (sortBy === 'grade') {
    roster = [...roster].sort((a, b) => {
      const pa = calcOverall(getHomeroomGradeData(a.id));
      const pb = calcOverall(getHomeroomGradeData(b.id));
      if (pa === null && pb === null) return a.name.localeCompare(b.name, 'cs');
      if (pa === null) return 1;  // ungraded students sort last either way
      if (pb === null) return -1;
      return pb - pa; // best grade first
    });
  } else {
    roster = [...roster].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }

  function SortButton(key, label) {
    const active = sortBy === key;
    return el('button', {
      className: `px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 transition ${active ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-400 hover:border-black hover:text-black'}`,
      onClick: () => { state.homeroomSortBy = key; render(); }
    }, label);
  }

  return el('div', { className: 'space-y-4' },
    el('div', { className: 'flex items-center justify-between border-b-2 border-black pb-3' },
      el('h3', { className: 'text-lg font-bold text-black' }, sc.name),
      el('div', { className: 'flex items-center gap-4' },
        showExport ? el('div', { className: 'flex gap-2 print:hidden' },
          el('button', {
            className: 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 border-gray-200 text-gray-500 hover:border-black hover:text-black transition',
            title: 'Download as a CSV file — opens directly in Excel',
            onClick: () => exportClassGradesCSV(sc)
          }, 'Export CSV'),
          el('button', {
            className: 'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 border-gray-200 text-gray-500 hover:border-black hover:text-black transition',
            title: 'Opens your browser\'s print dialog — choose "Save as PDF" there',
            onClick: () => window.print()
          }, 'Print / PDF')
        ) : null,
        el('div', { className: 'flex gap-2 print:hidden' }, SortButton('name', 'A–Z'), SortButton('grade', 'By Grade')),
        el('span', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, `${roster.length} student(s)`)
      )
    ),
    roster.length === 0
      ? el('p', { className: 'text-sm text-gray-400 py-4' }, 'No students have registered into this class yet.')
      : el('div', { className: 'space-y-2' }, ...roster.map(student => HomeroomStudentRow(student)))
  );
}

function HomeroomStudentRow(student) {
  const gradeData = getHomeroomGradeData(student.id);
  const overallPct = calcOverall(gradeData);
  const overall = overallPct !== null ? getLetterGrade(overallPct) : null;
  const expanded = state.homeroomExpandedStudentId === student.id;

  return el('div', { className: 'border border-gray-100' },
    el('div', {
      className: 'flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition',
      onClick: () => { state.homeroomExpandedStudentId = expanded ? null : student.id; render(); }
    },
      el('div', { className: 'flex items-center gap-3' },
        el('div', { className: `w-9 h-9 flex items-center justify-center text-sm font-black border-2 flex-shrink-0 ${overall ? `${overall.color} ${overall.border} ${overall.bg}` : 'text-gray-400 border-gray-200 bg-gray-50'}` }, student.name[0].toUpperCase()),
        el('span', { className: 'text-sm font-bold text-black' }, student.name)
      ),
      el('div', { className: 'flex items-center gap-3' },
        overall ? el('span', { className: `text-sm font-bold ${overall.color}` }, `${overall.letter} · ${overallPct}%`) : el('span', { className: 'text-xs text-gray-300' }, 'No grades yet'),
        el('span', { className: 'text-xs text-gray-300' }, expanded ? '▲' : '▼')
      )
    ),
    expanded ? el('div', { className: 'px-4 pb-4 space-y-2' },
      gradeData.length === 0
        ? el('p', { className: 'text-xs text-gray-400' }, 'No grades recorded in any subject yet.')
        : gradeData.map(({ hw, cls, earnedPoints, maxPoints, pct }) => {
          const g = pct !== null ? getLetterGrade(pct) : null;
          return el('div', { className: 'flex items-center justify-between text-sm py-2 border-t border-gray-50' },
            el('div', {},
              el('p', { className: 'font-bold text-black' }, hw.name),
              el('p', { className: 'text-xs text-gray-400' }, cls ? cls.name : 'Subject unknown')
            ),
            el('div', { className: 'flex items-center gap-2' },
              el('span', { className: 'text-xs text-gray-400' }, `${earnedPoints} / ${maxPoints || '?'}`),
              g ? el('span', { className: `text-xs font-bold ${g.color}` }, `${g.letter} · ${pct}%`) : null
            )
          );
        })
    ) : null
  );
}

// All graded work for one student across every subject, not just homework the current
// teacher owns — relies on the widened grades/homework/classrooms RLS for homeroom teachers.
function getHomeroomGradeData(studentId) {
  return state.grades
    .filter(g => g.studentId === studentId)
    .map(g => {
      const hw = state.homework.find(h => h.id === g.homeworkId);
      if (!hw) return null; // RLS didn't (yet) resolve the homework row — skip rather than crash
      const cls = state.classrooms.find(c => c.id === hw.classroomId);
      const maxPoints = parseFloat(hw.points) || 0;
      const earnedPoints = parseFloat(g.value);
      const pct = (!isNaN(earnedPoints) && maxPoints > 0) ? Math.round((earnedPoints / maxPoints) * 100) : null;
      return { hw, cls, earnedPoints: isNaN(earnedPoints) ? null : earnedPoints, maxPoints, pct };
    })
    .filter(Boolean);
}

// ── TEACHER — SINGLE STUDENT GRADE DETAIL ──
function TeacherStudentGradeDetail(studentId, clsHomework, myClasses) {
  const student = state.students.find(s => s.id === studentId);
  if (!student) return el('div', {}, 'Student not found.');

  const gradeData   = getStudentGradeData(studentId, clsHomework);
  const overallPct  = calcOverall(gradeData);
  const overall     = overallPct !== null ? getLetterGrade(overallPct) : null;
  const gradedItems = gradeData.filter(d => d.earnedPoints !== null);
  const totalEarned = gradedItems.reduce((s, d) => s + d.earnedPoints, 0);
  const totalMax    = gradedItems.reduce((s, d) => s + d.maxPoints, 0);

  return el('div', { className: 'max-w-2xl space-y-8' },

    // Back
    el('button', {
      className: 'flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black uppercase tracking-wider transition mb-2',
      onClick: () => { state.gradesStudentId = null; render(); }
    }, Icon('back', 'w-4 h-4'), 'Back to Class'),

    // Student header card
    el('div', { className: 'flex items-center gap-6 p-6 border-2 border-black' },
      el('div', { className: `w-16 h-16 flex items-center justify-center text-2xl font-black border-2 flex-shrink-0 ${overall ? `${overall.color} ${overall.border} ${overall.bg}` : 'text-gray-400 border-gray-200 bg-gray-50'}` },
        student.name[0].toUpperCase()
      ),
      el('div', { className: 'flex-1' },
        el('h3', { className: 'text-xl font-bold text-black' }, student.name),
        el('p', { className: 'text-sm text-gray-400 mt-0.5' }, `${gradedItems.length} of ${clsHomework.length} assignments graded`)
      ),
      // Overall block
      el('div', { className: 'text-right' },
        overall
          ? el('div', {},
            el('div', { className: 'flex items-baseline gap-2 justify-end' },
              el('span', { className: `text-5xl font-light ${overall.color}` }, overall.letter),
              el('span', { className: 'text-2xl font-bold text-gray-400' }, overallPct + '%')
            ),
            el('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider mt-1' }, `${totalEarned} / ${totalMax} pts`)
          )
          : el('p', { className: 'text-2xl font-light text-gray-300' }, 'No grades')
      )
    ),

    // Assignment rows
    el('div', { className: 'space-y-2' },
      el('div', { className: 'grid grid-cols-12 gap-3 px-3 pb-2 border-b border-gray-200' },
        el('span', { className: 'col-span-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Assignment'),
        el('span', { className: 'col-span-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, 'Points'),
        el('span', { className: 'col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, '%'),
        el('span', { className: 'col-span-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center' }, 'Grade'),
        el('span', { className: 'col-span-1' })
      ),
      ...gradeData.map(({ hw, earnedPoints, maxPoints, pct }) => {
        const g = pct !== null ? getLetterGrade(pct) : null;
        const cls = myClasses.find(c => c.id === hw.classroomId);
        const gradeRow = state.grades.find(gr => gr.homeworkId === hw.id && gr.studentId === studentId);
        return el('div', { className: 'border border-gray-100 hover:border-gray-300 transition' },
        el('div', { className: 'grid grid-cols-12 gap-3 items-center px-3 py-3' },
          // Assignment name
          el('div', { className: 'col-span-5' },
            el('p', { className: 'text-sm font-bold text-black truncate' }, hw.name),
            hw.date ? el('p', { className: 'text-[10px] text-gray-400 mt-0.5' }, hw.date) : null
          ),
          // Points input + max
          el('div', { className: 'col-span-3 flex items-center gap-1 justify-center' },
            el('input', {
              className: `w-16 text-center text-sm font-bold border-2 outline-none py-1.5 transition bg-white
                ${g ? `${g.color} ${g.border}` : 'border-gray-200 text-gray-600'} focus:border-black`,
              type: 'number',
              min: 0,
              max: maxPoints || 9999,
              placeholder: '—',
              value: earnedPoints !== null ? earnedPoints : '',
              onChange: (e) => { saveGrade(hw.id, studentId, e.target.value); }
            }),
            el('span', { className: 'text-xs text-gray-400 font-bold flex-shrink-0' }, `/${maxPoints || '?'}`)
          ),
          // Percent
          el('div', { className: 'col-span-2 text-center' },
            pct !== null
              ? el('span', { className: `text-sm font-bold ${g ? g.color : ''}` }, pct + '%')
              : el('span', { className: 'text-gray-300 text-sm' }, '—')
          ),
          // Letter badge
          el('div', { className: 'col-span-1 flex justify-center' },
            g
              ? el('div', { className: `w-8 h-8 flex items-center justify-center text-xs font-black border-2 ${g.color} ${g.border} ${g.bg}` }, g.letter)
              : el('div', { className: 'w-8 h-8 border border-gray-100 flex items-center justify-center text-gray-300 text-sm' }, '–')
          ),
          // Delete grade
          el('div', { className: 'col-span-1 flex justify-end' },
            earnedPoints !== null
              ? el('button', {
                className: 'text-gray-300 hover:text-red-500 transition',
                title: 'Remove grade',
                onClick: () => deleteGrade(hw.id, studentId)
              }, Icon('trash', 'w-4 h-4'))
              : null
          )
        ),
        // Feedback comment — shown to the student alongside this grade (see saveGradeComment()).
        el('div', { className: 'px-3 pb-3' },
          el('input', {
            className: 'w-full text-xs border-b border-gray-200 focus:border-black outline-none py-1.5 text-gray-600 bg-transparent transition',
            placeholder: 'Add feedback for the student…',
            value: (gradeRow && gradeRow.comment) || '',
            onChange: (e) => { saveGradeComment(hw.id, studentId, e.target.value); }
          })
        )
        );
      })
    )
  );
}

// ==============================================
// PRINCIPAL VIEWS — read-only, school-wide overview. Reached only via the hidden
// #reditelna entry point or the PrincipalCorner login widget (view-auth.js); nothing in
// the normal UI links here. Reuses HomeroomClassPanel/HomeroomStudentRow above for the
// actual roster+grades display once drilled into a class.
// ==============================================
function PrincipalOverview() {
  const filter = state.principalTeacherFilter || 'homeroom';
  function TabButton(key, label) {
    const active = filter === key;
    return el('button', {
      className: `px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 transition ${active ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'}`,
      onClick: () => { state.principalTeacherFilter = key; render(); }
    }, label);
  }
  return el('div', { className: 'space-y-6 max-w-3xl' },
    el('div', { className: 'flex gap-2' }, TabButton('homeroom', 'Homeroom Teachers'), TabButton('unassigned', 'Without a Class')),
    filter === 'homeroom' ? PrincipalHomeroomList() : PrincipalUnassignedTeachersList()
  );
}

function PrincipalHomeroomList() {
  const classes = [...state.schoolClasses].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return classes.length === 0
    ? el('p', { className: 'text-sm text-gray-400 py-8' }, 'No classes set up yet.')
    : el('div', { className: 'space-y-2' }, ...classes.map(sc => {
        const teacher = state.teachers.find(t => t.id === sc.homeroomTeacherId);
        const studentCount = state.students.filter(s => s.schoolClassId === sc.id).length;
        return el('div', {
          className: 'flex items-center justify-between px-4 py-4 border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer',
          onClick: () => {
            if (teacher) { state.principalViewingTeacherId = teacher.id; state.view = 'principal-teacher'; }
            else { state.principalViewingClassId = sc.id; state.view = 'principal-class'; }
            render();
          }
        },
          el('div', {},
            el('p', { className: 'text-sm font-bold text-black' }, sc.name),
            el('p', { className: 'text-xs text-gray-400 mt-0.5' }, teacher ? `Homeroom teacher: ${teacher.name}` : 'No homeroom teacher yet')
          ),
          el('div', { className: 'flex items-center gap-4' },
            el('span', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, `${studentCount} student(s)`),
            el('span', { className: 'text-xs font-bold text-gray-300' }, '→')
          )
        );
      }));
}

function PrincipalUnassignedTeachersList() {
  const assignedIds = new Set(state.schoolClasses.map(sc => sc.homeroomTeacherId).filter(Boolean));
  const unassigned = state.teachers.filter(t => !assignedIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  return unassigned.length === 0
    ? el('p', { className: 'text-sm text-gray-400 py-8' }, 'Every teacher already has a homeroom class.')
    : el('div', { className: 'space-y-2' }, ...unassigned.map(t => el('div', {
        className: 'flex items-center justify-between px-4 py-4 border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer',
        onClick: () => { state.principalViewingTeacherId = t.id; state.view = 'principal-teacher'; render(); }
      },
        el('p', { className: 'text-sm font-bold text-black' }, t.name),
        el('span', { className: 'text-xs font-bold text-gray-300' }, '→')
      )));
}

// Teachers self-report birthDate in Settings — see loadProfileForEdit()/saveProfile() in
// actions.js. Null-safe: an unset or malformed date just means "age not set" everywhere.
function calcAge(birthDateStr) {
  if (!birthDateStr) return null;
  const bd = new Date(birthDateStr);
  if (isNaN(bd.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const hadBirthdayThisYear = today.getMonth() > bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() >= bd.getDate());
  if (!hadBirthdayThisYear) age--;
  return age;
}

function TeacherInfoBlock(label, value) {
  return el('div', {},
    el('label', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, label),
    el('p', { className: 'text-black font-bold mt-1' }, value)
  );
}

function PrincipalTeacherView() {
  const teacher = state.teachers.find(t => t.id === state.principalViewingTeacherId);
  if (!teacher) return el('div', {}, 'Teacher not found.');
  const homeroom = state.schoolClasses.find(sc => sc.homeroomTeacherId === teacher.id);
  const subjects = state.classrooms.filter(c => c.teacherId === teacher.id).map(c => c.name);
  const age = calcAge(teacher.birthDate);

  return el('div', { className: 'space-y-8 max-w-2xl' },
    el('button', {
      className: 'flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black uppercase tracking-wider transition',
      onClick: () => { state.view = 'dashboard'; state.principalViewingTeacherId = null; render(); }
    }, Icon('back', 'w-4 h-4'), 'All Teachers'),

    el('div', { className: 'flex items-center gap-6 p-6 border-2 border-black' },
      el('div', { className: 'w-16 h-16 flex items-center justify-center text-2xl font-black border-2 border-black bg-black text-white flex-shrink-0' },
        teacher.name[0].toUpperCase()
      ),
      el('div', { className: 'flex-1' },
        el('h3', { className: 'text-xl font-bold text-black' }, teacher.name),
        el('p', { className: 'text-sm text-gray-400 mt-0.5' }, age !== null ? `${age} years old` : 'Age not set')
      )
    ),

    el('div', { className: 'grid grid-cols-2 gap-6' },
      TeacherInfoBlock('Subjects Taught', subjects.length ? subjects.join(', ') : 'None yet'),
      TeacherInfoBlock('Weekly Teaching Hours', teacher.weeklyHours != null ? `${teacher.weeklyHours} h/week` : 'Not set')
    ),

    el('div', {},
      el('label', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest' }, 'Homeroom'),
      homeroom
        ? el('div', {
            className: 'mt-2 flex items-center justify-between px-4 py-4 border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer',
            onClick: () => { state.principalViewingClassId = homeroom.id; state.view = 'principal-class'; render(); }
          },
            el('p', { className: 'text-sm font-bold text-black' }, homeroom.name),
            el('span', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, 'View roster →')
          )
        : el('p', { className: 'text-sm text-gray-400 mt-2' }, 'No homeroom class.')
    )
  );
}

function PrincipalClassView() {
  const sc = state.schoolClasses.find(s => s.id === state.principalViewingClassId);
  if (!sc) return el('div', {}, 'Class not found.');
  const cameFromTeacher = !!state.principalViewingTeacherId;
  return el('div', { className: 'space-y-6 max-w-4xl' },
    el('button', {
      className: 'flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black uppercase tracking-wider transition',
      onClick: () => {
        state.principalViewingClassId = null;
        state.view = cameFromTeacher ? 'principal-teacher' : 'dashboard';
        render();
      }
    }, Icon('back', 'w-4 h-4'), cameFromTeacher ? 'Back to Teacher' : 'All Classes'),
    HomeroomClassPanel(sc, true)
  );
}

// Builds a roster + overall-grade CSV for one school class and triggers a browser download —
// no server round-trip, no library. A leading UTF-8 BOM is included so Excel (which otherwise
// guesses Windows-1250 for a bare .csv) renders Czech diacritics correctly on open.
function exportClassGradesCSV(sc) {
  const roster = state.students.filter(s => s.schoolClassId === sc.id).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  const rows = [['Student', 'Overall %', 'Overall Grade', 'Assignments Graded']];
  roster.forEach(student => {
    const gradeData = getHomeroomGradeData(student.id);
    const pct = calcOverall(gradeData);
    const g = pct !== null ? getLetterGrade(pct) : null;
    rows.push([student.name, pct !== null ? pct : '', g ? g.letter : '', gradeData.filter(d => d.earnedPoints !== null).length]);
  });
  const esc = (cell) => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sc.name.replace(/[^a-zA-Z0-9.]+/g, '_')}_znamky.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==============================================
// ANNOUNCEMENTS (oznámení) — principal's composer + sent list. Reached via the
// Sidebar "Announcements" nav item (view-dashboard.js, principal-only). What teachers and
// students see is AnnouncementBanner() in view-dashboard.js.
// ==============================================
function AnnouncementsView() {
  return el('div', { className: 'space-y-8 max-w-2xl' },
    el('div', {},
      el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'New announcement'),
      el('textarea', {
        className: 'w-full border-2 border-gray-200 focus:border-black outline-none p-4 text-black bg-transparent font-light text-base transition resize-none',
        rows: 3,
        placeholder: 'Message for the whole school…',
        value: state.newAnnouncementText,
        onInput: (e) => { state.newAnnouncementText = e.target.value; }
      }),
      el('button', {
        className: 'mt-3 px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition',
        onClick: postAnnouncement
      }, 'Send to School')
    ),
    el('div', {},
      el('h3', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4' }, 'Sent'),
      state.announcements.length === 0
        ? el('p', { className: 'text-sm text-gray-400' }, 'No announcements yet.')
        : el('div', { className: 'space-y-3' }, ...state.announcements.map(a =>
          el('div', { className: 'flex items-start justify-between gap-4 p-4 border border-gray-100' },
            el('div', {},
              el('p', { className: 'text-sm text-black whitespace-pre-wrap' }, a.message),
              el('p', { className: 'text-[10px] text-gray-400 mt-2 uppercase tracking-wider' }, new Date(a.createdAt).toLocaleString())
            ),
            el('button', {
              className: 'text-gray-300 hover:text-red-500 transition flex-shrink-0',
              title: 'Delete',
              onClick: () => deleteAnnouncement(a.id)
            }, Icon('trash', 'w-4 h-4'))
          )
        ))
    )
  );
}
