// ==============================================
// VIEW: ASSIGNMENTS — classroom cards, homework cards, the submissions list,
// and the create/edit-assignment page. Depends on: state.js, ui-core.js, actions.js.
// ==============================================

function ClassroomCard(cls, isTeacher) {
  return el('div', {
      className: 'py-6 border-b border-gray-100 border-l-4 flex justify-between items-start transition pl-4 pr-2 -mx-2 cursor-pointer hover:bg-gray-50',
      style: { borderLeftColor: cls.color },
      title: `Open ${cls.name}'s assignments`,
      onClick: () => {
        // Drill into a dedicated list for this classroom's assignments — keeps the dashboard
        // itself short once a classroom has a lot of homework piled up.
        state.viewingClassroomId = cls.id;
        state.view = 'classroom-assignments';
        state.filterDate = '';
        state.filterSubmitted = 'all';
        state.filterMarked = 'all';
        render();
      }
    },
    el('div', { className: 'flex items-center gap-3' },
      ColorDot(cls.color, 'w-3 h-3'),
      el('div', {},
        el('h4', { className: 'font-bold text-black text-base' }, cls.name),
        el('p', { className: 'text-xs text-gray-400 mt-1 uppercase tracking-wider' }, 'Education Dept')
      )
    ),
    el('div', { className: 'flex items-center gap-3' },
      el('span', { className: 'font-mono text-sm text-black pt-1' }, cls.code),
      isTeacher
        ? el('button', {
          className: 'text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-wider underline',
          onClick: (e) => { e.stopPropagation(); openClassroomModal(cls); }
        }, 'Edit')
        : el('button', {
          className: 'text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider underline',
          onClick: (e) => { e.stopPropagation(); leaveClassroom(cls.id); }
        }, 'Leave')
    )
  );
}

// ==============================================
// CLASSROOM ASSIGNMENTS (drill-down from a dashboard classroom click)
// ==============================================
function ClassroomAssignmentsView() {
  const cls = state.classrooms.find(c => c.id === state.viewingClassroomId);
  if (!cls) return el('div', {}, 'Classroom not found.');
  const isTeacher = state.currentUser.role === 'teacher';

  const allHomework = state.homework.filter(h => {
    if (h.classroomId !== cls.id) return false;
    if (isTeacher) return h.teacherId === state.currentUser.id;
    if (h.assignedStudentIds === 'all') return true;
    return Array.isArray(h.assignedStudentIds) && h.assignedStudentIds.includes(state.currentUser.id);
  });
  const filteredHomework = applyHomeworkFilters(allHomework, isTeacher);
  const roster = isTeacher ? state.students.filter(s => s.classroomIds && s.classroomIds.includes(cls.id)) : [];

  return el('div', { className: 'space-y-6' },
    el('div', { className: 'flex flex-wrap items-center justify-between gap-4' },
      el('div', { className: 'flex items-center gap-4' },
        el('button', {
          className: 'flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black uppercase tracking-wider transition',
          onClick: () => { state.view = 'dashboard'; state.viewingClassroomId = null; render(); }
        }, Icon('back', 'w-4 h-4'), 'Back'),
        el('div', { className: 'w-px h-5 bg-gray-200' }),
        ColorDot(cls.color, 'w-3 h-3'),
        el('h3', { className: 'text-lg font-bold text-black' }, cls.name),
        filteredHomework.length !== allHomework.length
          ? el('span', { className: 'text-xs font-bold text-blue-500 uppercase tracking-widest' }, `${filteredHomework.length} of ${allHomework.length} shown`)
          : null
      ),
      isTeacher ? el('button', {
        className: 'px-6 py-2.5 bg-black text-white rounded-full text-xs font-bold shadow-sm hover:bg-gray-800 transition uppercase tracking-wider',
        onClick: () => openCreateAssignment(null, cls.id)
      }, '+ New Assignment') : null
    ),
    isTeacher ? RosterPanel(cls, roster) : null,
    AssignmentFilters([cls], isTeacher, true),
    filteredHomework.length === 0
      ? el('div', { className: 'py-8 text-gray-400 font-light text-sm' }, allHomework.length === 0 ? 'No assignments in this classroom yet.' : 'No assignments match the current filters.')
      : el('div', { className: 'space-y-3 pt-2' }, ...filteredHomework.map(hw => HomeworkCard(hw, isTeacher)))
  );
}

// Collapsible roster for a classroom — lets a teacher see who's enrolled and remove someone
// (e.g. added by mistake, or who left the school) without going through Supabase directly.
function RosterPanel(cls, roster) {
  return el('details', { className: 'border border-gray-200 px-4 py-3' },
    el('summary', { className: 'text-xs font-bold uppercase tracking-widest text-gray-500 cursor-pointer select-none' }, `Students (${roster.length})`),
    roster.length === 0
      ? el('p', { className: 'text-sm text-gray-400 mt-3' }, `No students yet — share the code ${cls.code} to invite some.`)
      : el('div', { className: 'mt-3 space-y-1' }, ...roster.map(s =>
          el('div', { className: 'flex items-center justify-between py-2 border-t border-gray-100' },
            el('span', { className: 'text-sm font-bold text-black' }, s.name),
            el('button', {
              className: 'text-[10px] font-bold text-red-500 hover:underline uppercase tracking-wider',
              onClick: () => removeStudentFromClassroom(cls.id, s.id)
            }, 'Remove')
          )
        ))
  );
}

function HomeworkCard(hw, isTeacher) {
  const classroom = state.classrooms.find(c => c.id === hw.classroomId);
  const assignedLabel = hw.assignedStudentIds === 'all' ? 'All students' : `${(hw.assignedStudentIds || []).length} student(s)`;
  const fileCount = (hw.attachedFileIds || []).length;

  // For teacher: count submissions
  const submissionCount = isTeacher
    ? state.studentFiles.filter(sf => sf.homeworkId === hw.id && sf.submittedAt).length
    : 0;

  // For student: check if they have a copy / submitted
  let studentStatus = null;
  if (!isTeacher) {
    const myFile = state.studentFiles.find(sf => sf.homeworkId === hw.id && sf.studentId === state.currentUser.id);
    if (myFile) studentStatus = myFile.submittedAt ? 'submitted' : 'in-progress';
  }

  return el('div', { className: 'py-6 px-8 border border-gray-100 flex justify-between items-center bg-white group hover:border-black transition' },
    el('div', { className: 'flex-1 min-w-0' },
      el('p', { className: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center' },
        classroom ? [ColorDot(classroom.color, 'w-2 h-2'), classroom.name] : 'Class'
      ),
      el('h4', { className: 'font-bold text-black' }, hw.name),
      el('div', { className: 'flex gap-3 mt-1 flex-wrap' },
        el('span', { className: 'text-[10px] text-gray-400' }, '👥 ' + assignedLabel),
        isTeacher && submissionCount > 0 ? el('span', { className: 'text-[10px] text-green-600 font-bold' }, `✓ ${submissionCount} submitted`) : null,
        studentStatus === 'submitted' ? el('span', { className: 'text-[10px] text-green-600 font-bold' }, '✓ Submitted') : null,
        studentStatus === 'in-progress' ? el('span', { className: 'text-[10px] text-yellow-600 font-bold' }, '● In Progress') : null,
        (() => {
          if (isTeacher) return null;
          const g = state.grades.find(gr => gr.homeworkId === hw.id && gr.studentId === state.currentUser.id);
          if (g && g.value && String(g.value).trim()) return el('span', { className: 'text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 border border-purple-200' }, `✏️ Grade: ${g.value}`);
          return null;
        })()
      ),
      // Attached files row — visible to teacher with delete button
      isTeacher && (hw.attachedFileIds || []).length > 0
        ? el('div', { className: 'mt-2 flex flex-wrap gap-2' },
          ...(hw.attachedFileIds || []).map(fid => {
            const f = state.files.find(x => x.id === fid);
            if (!f) return null;
            const typeColors = {
              doc:    'bg-blue-50 text-blue-700 border-blue-200',
              slides: 'bg-orange-50 text-orange-700 border-orange-200',
              sheets: 'bg-green-50 text-green-700 border-green-200'
            };
            const tc = typeColors[f.type] || 'bg-gray-50 text-gray-700 border-gray-200';
            return el('div', { className: `flex items-center gap-1 px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${tc}` },
              Icon(f.type, 'w-3 h-3'),
              el('span', { className: 'mx-1' }, f.name),
              el('button', {
                className: 'text-red-400 hover:text-red-600 font-black leading-none transition',
                title: 'Delete this file',
                onClick: async (e) => {
                  e.stopPropagation();
                  await deleteFile(fid);
                }
              }, '×')
            );
          })
        )
        : null
    ),
    el('div', { className: 'flex items-center gap-4 flex-shrink-0 ml-4' },
      el('span', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block' }, hw.date),
      isTeacher
        ? el('div', { className: 'flex gap-2' },
          el('button', {
            className: 'text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline',
            onClick: () => { state.view = 'submissions'; state.viewingSubmissions = hw.id; render(); }
          }, 'Submissions'),
          el('button', { className: 'text-xs font-bold text-black uppercase tracking-widest hover:underline', onClick: () => openCreateAssignment(hw) }, 'Edit'),
          el('button', { className: 'text-xs font-bold text-red-500 uppercase tracking-widest hover:underline', onClick: () => deleteHomework(hw.id) }, 'Del')
        )
        : el('div', { className: 'flex gap-2' },
          fileCount > 0
            ? el('button', {
              className: 'px-4 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition',
              onClick: () => {
                // Open student's copy
                const myFile = state.studentFiles.find(sf => sf.homeworkId === hw.id && sf.studentId === state.currentUser.id);
                if (myFile) {
                  state._editorReturnView = 'dashboard';
                  openEditor({ id: myFile.masterFileId, name: myFile.name, type: myFile.type, content: myFile.content }, true, myFile.id);
                } else showToast('No file assigned to you yet.');
              }
            }, 'Open File')
            : null
        )
    )
  );
}

// ==============================================
// SUBMISSIONS VIEW (Teacher)
// ==============================================
function SubmissionsView() {
  const hwId = state.viewingSubmissions;
  const hw = state.homework.find(h => h.id === hwId);
  if (!hw) return el('div', {}, 'Assignment not found.');

  const studentFilesForHw = state.studentFiles.filter(sf => sf.homeworkId === hwId);
  const typeStyle = {
    doc:    { bg: 'bg-blue-50',   icon: 'text-blue-500' },
    slides: { bg: 'bg-orange-50', icon: 'text-orange-500' },
    sheets: { bg: 'bg-green-50',  icon: 'text-green-500' },
  };

  return el('div', { className: 'space-y-8' },
    el('div', { className: 'flex items-center gap-4 mb-8' },
      el('button', {
        className: 'flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black uppercase tracking-wider transition',
        onClick: () => { state.view = state.viewingClassroomId ? 'classroom-assignments' : 'dashboard'; render(); }
      }, Icon('back', 'w-4 h-4'), 'Back'),
      el('div', { className: 'w-px h-5 bg-gray-200' }),
      el('h3', { className: 'text-lg font-bold text-black' }, `Submissions — ${hw.name}`)
    ),

    studentFilesForHw.length === 0
      ? el('div', { className: 'py-12 border-t border-gray-200 text-gray-400 font-light text-center' }, 'No student files yet. Assign a file to students when creating the assignment.')
      : el('div', { className: 'space-y-4' },
        ...studentFilesForHw.map(sf => {
          const student = state.students.find(s => s.id === sf.studentId);
          const ts = typeStyle[sf.type] || typeStyle.doc;
          const isSubmitted = !!sf.submittedAt;
          return el('div', { className: `flex items-center justify-between p-6 border-2 transition ${isSubmitted ? 'border-green-200 bg-green-50' : 'border-gray-100 hover:border-gray-300'}` },
            el('div', { className: 'flex items-center gap-4' },
              el('div', { className: `w-10 h-10 flex items-center justify-center font-bold text-sm ${isSubmitted ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}` },
                student ? student.name[0].toUpperCase() : '?'
              ),
              el('div', {},
                el('p', { className: 'font-bold text-black' }, student ? student.name : `Student #${sf.studentId}`),
                el('div', { className: 'flex items-center gap-2 mt-1' },
                  el('div', { className: `p-1 ${ts.bg}` }, Icon(sf.type, `w-3 h-3 ${ts.icon}`)),
                  el('span', { className: 'text-xs text-gray-500' }, sf.name),
                ),
                el('p', { className: `text-xs mt-1 font-bold ${isSubmitted ? 'text-green-600' : 'text-gray-400'}` },
                  isSubmitted
                    ? `Submitted ${new Date(sf.submittedAt).toLocaleString()}`
                    : sf.lastEditedAt ? `Last edited ${new Date(sf.lastEditedAt).toLocaleString()}` : 'Not started'
                )
              )
            ),
            el('div', { className: 'flex items-center gap-3' },
              isSubmitted ? el('span', { className: 'text-xs font-bold text-green-600 uppercase tracking-wider px-3 py-1 bg-white border border-green-300' }, '✓ Submitted') : null,
              el('div', { className: 'flex items-center gap-2' },
                el('input', {
                  className: 'w-20 px-2 py-1.5 text-xs border-2 border-gray-200 focus:border-black outline-none font-bold text-black text-center',
                  placeholder: 'Grade',
                  value: (state.grades.find(gr => gr.homeworkId === hwId && gr.studentId === sf.studentId) || {}).value || '',
                  title: 'Enter grade/mark',
                  onChange: (e) => { saveGrade(hwId, sf.studentId, e.target.value); }
                }),
                el('button', {
                  className: 'px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition flex items-center gap-2',
                  onClick: () => {
                    state._editorReturnView = 'submissions';
                    openEditor({
                      id: sf.masterFileId,
                      name: sf.name + ` (${student ? student.name : 'Student'})`,
                      type: sf.type,
                      content: sf.content
                    }, true, sf.id);
                  }
                }, Icon('eye', 'w-4 h-4'), 'View & Edit')
              )
            )
          );
        })
      )
  );
}

// ==============================================
// CREATE ASSIGNMENT PAGE
// ==============================================
function CreateAssignmentPage() {
  const myClasses = state.classrooms.filter(c => c.teacherId === state.currentUser.id);
  const selectedClassId = Number(state.newHomework.classroomId);
  const classStudents = selectedClassId
    ? state.students.filter(s => s.classroomIds && s.classroomIds.includes(selectedClassId))
    : [];

  const isAllSelected = state.assignedStudentIds === 'all';

  function toggleSelectAll() { state.assignedStudentIds = isAllSelected ? [] : 'all'; render(); }
  function toggleStudent(id) {
    if (state.assignedStudentIds === 'all') {
      state.assignedStudentIds = classStudents.map(s => s.id).filter(sid => sid !== id);
    } else {
      const arr = [...state.assignedStudentIds];
      const idx = arr.indexOf(id);
      if (idx === -1) arr.push(id); else arr.splice(idx, 1);
      state.assignedStudentIds = arr;
    }
    render();
  }
  function isStudentSelected(id) { return state.assignedStudentIds === 'all' || state.assignedStudentIds.includes(id); }

  // Scoped to only this assignment's own files — a file created here (via +Doc/+Slides/
  // +Sheet, which auto-attaches, see createFile() in actions.js) is only ever reachable
  // again through this same assignment, not from some teacher-wide file browser.
  const myFiles = state.files.filter(f => state.attachedFileIds.includes(f.id));
  const typeStyle = {
    doc:    { border: 'border-blue-200',   bg: 'bg-blue-50',   text: 'text-blue-700',   btnBg: 'bg-blue-50 border-blue-200 text-blue-700'    },
    slides: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', btnBg: 'bg-orange-50 border-orange-200 text-orange-700' },
    sheets: { border: 'border-green-200',  bg: 'bg-green-50',  text: 'text-green-700',  btnBg: 'bg-green-50 border-green-200 text-green-700'   },
  };

  return el('div', { className: 'min-h-screen bg-white' },
    el('div', { className: 'sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between' },
      el('div', { className: 'flex items-center gap-4' },
        el('button', { className: 'flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black uppercase tracking-wider transition', onClick: () => { state.view = state.viewingClassroomId ? 'classroom-assignments' : 'dashboard'; render(); } }, Icon('back', 'w-4 h-4'), 'Back'),
        el('div', { className: 'w-px h-5 bg-gray-200' }),
        el('h2', { className: 'text-lg font-bold text-black' }, state.editingHomeworkId ? 'Edit Assignment' : 'New Assignment')
      ),
      el('div', { className: 'flex items-center gap-3' },
        el('p', { className: 'text-xs text-gray-400 hidden sm:block' }, 'Attached files will be copied to each student'),
        PendingButton('saveHomework', state.editingHomeworkId ? 'Save Changes' : 'Assign', state.editingHomeworkId ? 'Saving…' : 'Assigning…', saveHomework, 'px-8 py-2.5 bg-black text-white text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition')
      )
    ),
    el('div', { className: 'max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10' },
      el('div', { className: 'lg:col-span-2 space-y-8' },
        el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Title'),
          el('input', { className: 'w-full text-3xl font-light border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent transition', placeholder: 'e.g. Chapter 5 Review', value: state.newHomework.name, onInput: (e) => { state.newHomework.name = e.target.value; } })
        ),
        el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Instructions'),
          el('textarea', { className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent transition font-light text-lg resize-none', placeholder: 'Describe what students need to do...', rows: 3, value: state.newHomework.description, onInput: (e) => { state.newHomework.description = e.target.value; } })
        ),
        el('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-6' },
          el('div', {},
            el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Classroom'),
            el('select', { className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition', onInput: (e) => { state.newHomework.classroomId = Number(e.target.value); state.assignedStudentIds = []; render(); } },
              el('option', { value: '' }, 'Select...'),
              ...myClasses.map(c => { const opt = el('option', { value: c.id }, c.name); if (c.id === selectedClassId) opt.selected = true; return opt; })
            )
          ),
          el('div', {},
            el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Due Date'),
            el('input', { type: 'date', className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition', value: state.newHomework.date, onInput: (e) => { state.newHomework.date = e.target.value; } })
          ),
          el('div', {},
            el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Points'),
            el('input', { type: 'number', className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition', placeholder: '100', value: state.newHomework.points, onInput: (e) => { state.newHomework.points = e.target.value; } })
          )
        ),
        // Weekly repeat — only meaningful for a brand-new assignment with a due date; each
        // extra week becomes its own independent assignment (saveHomework() in actions.js).
        !state.editingHomeworkId ? el('div', {},
          el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Repeat weekly'),
          el('div', { className: 'flex items-center gap-3' },
            el('input', {
              type: 'number', min: 1, max: 52,
              className: 'w-24 border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition',
              value: state.newHomework.repeatWeeks,
              onInput: (e) => { state.newHomework.repeatWeeks = e.target.value; }
            }),
            el('span', { className: 'text-sm text-gray-400' }, Number(state.newHomework.repeatWeeks) > 1 ? `weeks in a row (needs a due date above)` : 'week (no repeat)')
          )
        ) : null,
        // Files
        el('div', {},
          el('div', { className: 'flex items-center justify-between mb-4' },
            el('div', {},
              el('label', { className: 'text-xs font-bold text-gray-400 uppercase tracking-widest' }, 'Files'),
              el('p', { className: 'text-xs text-gray-400 mt-1' }, 'Attached files will be copied individually for each student to edit')
            ),
            el('div', { className: 'flex gap-2' },
              ...['doc', 'slides', 'sheets'].map(type =>
                el('button', { className: `px-3 py-1.5 text-xs font-bold border transition ${typeStyle[type].btnBg} hover:opacity-80`, onClick: () => { state._editorReturnView = 'create-assignment'; createFile(type); } }, '+ ' + type.charAt(0).toUpperCase() + type.slice(1))
              )
            )
          ),
          myFiles.length === 0
            ? el('div', { className: 'border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm' }, 'No files yet. Create a Doc, Slides, or Sheet above.')
            : el('div', { className: 'space-y-2' },
              ...myFiles.map(file => {
                const ts = typeStyle[file.type];
                return el('div', { className: 'flex items-center justify-between p-3 border-2 border-black bg-gray-50' },
                  el('div', { className: 'flex items-center gap-3 flex-1' },
                    el('div', { className: `p-1.5 ${ts.bg}` }, Icon(file.type, `w-4 h-4 ${ts.text}`)),
                    el('span', { className: 'text-sm font-bold text-black' }, file.name),
                    el('span', { className: `text-[10px] font-bold uppercase px-2 py-0.5 ${ts.bg} ${ts.text}` }, file.type),
                    el('span', { className: 'text-[10px] font-bold text-black uppercase tracking-wider flex items-center gap-1 ml-2' }, Icon('check', 'w-3 h-3'), 'Will be copied to each student')
                  ),
                  el('div', { className: 'flex items-center gap-1' },
                    el('button', { className: 'p-1.5 text-gray-400 hover:text-black transition', onClick: () => { state._editorReturnView = 'create-assignment'; openEditor(file); } }, Icon('edit', 'w-4 h-4')),
                    el('button', { className: 'p-1.5 text-gray-400 hover:text-red-500 transition', title: 'Delete file', onClick: () => deleteFile(file.id) }, Icon('trash', 'w-4 h-4'))
                  )
                );
              })
            )
        )
      ),
      // Right: Assign to students
      el('div', {},
        el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4' }, 'Assign To'),
        !selectedClassId
          ? el('div', { className: 'border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm' }, 'Select a classroom first')
          : el('div', { className: 'space-y-2' },
            el('button', { className: `w-full flex items-center justify-between px-4 py-3 border-2 font-bold text-sm transition ${isAllSelected ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`, onClick: toggleSelectAll },
              el('span', {}, 'All Students'),
              isAllSelected ? Icon('check', 'w-4 h-4') : el('span', { className: 'text-xs text-gray-400 font-normal' }, classStudents.length + ' total')
            ),
            el('div', { className: 'flex items-center gap-2 py-2' },
              el('div', { className: 'flex-1 h-px bg-gray-100' }),
              el('span', { className: 'text-[10px] text-gray-400 uppercase tracking-wider' }, 'or individually'),
              el('div', { className: 'flex-1 h-px bg-gray-100' })
            ),
            classStudents.length === 0
              ? el('div', { className: 'text-sm text-gray-400 text-center py-4' }, 'No students in this class yet.')
              : el('div', { className: 'space-y-2' },
                ...classStudents.map(student => {
                  const selected = isStudentSelected(student.id);
                  return el('button', { className: `w-full flex items-center justify-between px-4 py-3 border-2 text-sm transition ${selected ? 'border-black bg-gray-50 text-black font-bold' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`, onClick: () => toggleStudent(student.id) },
                    el('div', { className: 'flex items-center gap-3' },
                      el('div', { className: `w-7 h-7 flex items-center justify-center text-xs font-bold ${selected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}` }, student.name[0].toUpperCase()),
                      el('span', {}, student.name)
                    ),
                    selected ? Icon('check', 'w-4 h-4') : null
                  );
                })
              )
          )
      )
    )
  );
}


