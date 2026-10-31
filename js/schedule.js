// ==============================================
// SCHEDULE (rozvrh) — data mapping + mutation actions for schedule_slots. Depends on:
// config.js (LESSON_PERIODS), state.js, data.js (fetchAllData), ui-core.js (render).
// The UI (grid + principal editor + student/teacher views) lives in view-schedule.js.
// ==============================================

function mapScheduleSlot(s) {
  return {
    id: s.id,
    schoolClassId: s.school_class_id,
    classroomId: s.classroom_id,
    dayOfWeek: s.day_of_week, // 1=Monday..5=Friday
    period: s.period,         // 0-based index into LESSON_PERIODS
  };
}

// Parses the ročník (1-4) a school class belongs to from the leading digit of its name
// (e.g. "2.A" -> 2). Used to filter the principal's drag-and-drop subject sidebar down to
// only the subjects tagged for that grade (classrooms.grade_levels — see actions.js).
function schoolClassGrade(sc) {
  if (!sc || !sc.name) return null;
  const m = /^(\d+)/.exec(sc.name);
  return m ? Number(m[1]) : null;
}

// Assigns a subject to one cell of the principal's schedule grid by dragging it in from the
// sidebar. Upserts on the (school_class_id, day_of_week, period) unique constraint (see
// schema.sql section 12 / patch_schedule.sql) — one subject per class per slot, so dropping a
// new subject onto an already-filled cell just replaces it rather than erroring.
async function assignScheduleSlot(schoolClassId, dayOfWeek, period, classroomId) {
  if (!classroomId) return;
  const { error } = await sb.from('schedule_slots').upsert(
    { school_class_id: schoolClassId, day_of_week: dayOfWeek, period, classroom_id: Number(classroomId) },
    { onConflict: 'school_class_id,day_of_week,period' }
  );
  if (error) { showToast('Could not save schedule slot: ' + error.message); return; }
  await fetchAllData();
  render();
}

// Clicking an already-filled cell removes it (with a confirm, since there's no undo).
function removeScheduleSlot(schoolClassId, dayOfWeek, period, label) {
  showConfirm(`Remove ${label} from this slot?`, async () => {
    const { error } = await sb.from('schedule_slots').delete()
      .eq('school_class_id', schoolClassId).eq('day_of_week', dayOfWeek).eq('period', period);
    if (error) { showToast('Could not clear slot: ' + error.message); return; }
    await fetchAllData();
    render();
  });
}
