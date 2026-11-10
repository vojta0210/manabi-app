// ==============================================
// ECHO — AI drafting panel for teachers, shown on the New Assignment page.
// Depends on: state.js, ui-core.js (el, render, runPending, PendingButton, showToast),
// data.js (mapFile), mascots.js (EchoMascot, optional), config.js (sb).
// Server side: supabase/functions/echo. Echo only ever fills in the form; nothing reaches
// students until the teacher presses Assign.
// ==============================================

const ECHO_ERRORS = {
  not_signed_in: 'Please sign in again.',
  not_teacher: 'Echo is available to teachers only.',
  user_limit: 'You have used all your Echo requests for today.',
  global_limit: 'Echo has reached its daily limit. Try again tomorrow.',
  not_configured: 'Echo is not set up yet.',
  bad_request: 'Please fill in the topic.',
  ai_too_long: 'That draft came out too long. Try a narrower topic.',
};
const ECHO_DEFAULT_ERROR = 'Echo could not finish that. Please try again.';

// Uses the Echo mascot when mascots.js is loaded, otherwise a plain badge.
function EchoIcon(expression, size) {
  if (typeof EchoMascot === 'function') return EchoMascot(expression, size);
  return el('div', { className: 'flex items-center justify-center text-white font-bold shrink-0', style: { width: size + 'px', height: size + 'px', background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)' } }, 'E');
}

function echoState() {
  if (!state.echo) {
    state.echo = { open: false, kind: 'assignment', subject: '', grade: '', topic: '', notes: '', draft: null, error: '', confirmReplace: false, remaining: null };
  }
  return state.echo;
}

function echoReset() {
  const open = state.echo?.open || false;
  state.echo = null;
  echoState().open = open;
}

// mapHomework() doesn't carry topics, so they are read on demand when editing.
async function echoLoadTopics(homeworkId) {
  const { data, error } = await sb.from('homework').select('topics').eq('id', homeworkId).maybeSingle();
  if (error || !data || state.editingHomeworkId !== homeworkId) return;
  state.newHomework.topics = data.topics || [];
  render();
}

async function echoGenerate() {
  const e = echoState();
  e.error = '';
  e.confirmReplace = false;
  if (!e.topic.trim()) { e.error = ECHO_ERRORS.bad_request; render(); return; }
  await runPending('echoGenerate', async () => {
    const { data, error } = await sb.functions.invoke('echo', {
      body: { kind: e.kind, subject: e.subject, grade: e.grade, topic: e.topic, notes: e.notes },
    });
    if (error) {
      let code = '';
      try { code = (await error.context.json()).error; } catch (_) { /* network failure: no body */ }
      e.error = ECHO_ERRORS[code] || ECHO_DEFAULT_ERROR;
      return;
    }
    e.draft = data.draft;
    e.remaining = data.remaining;
  });
}

function echoEscape(text) {
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML;
}

// The doc editor renders file.content as innerHTML, so every string is escaped here.
function echoBlocksToHtml(blocks) {
  let html = '';
  let inList = false;
  let taskNumber = 0;
  blocks.forEach(block => {
    if (block.type !== 'bullet' && inList) { html += '</ul>'; inList = false; }
    const text = echoEscape(block.text);
    if (block.type === 'heading') html += `<h2>${text}</h2>`;
    else if (block.type === 'paragraph') html += `<p>${text}</p>`;
    else if (block.type === 'task') html += `<p><strong>${++taskNumber}.</strong> ${text}</p><p><br></p>`;
    else if (block.type === 'bullet') {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${text}</li>`;
    }
  });
  if (inList) html += '</ul>';
  return html;
}

async function echoApply() {
  const e = echoState();
  const hw = state.newHomework;
  if ((hw.name.trim() || hw.description.trim()) && !e.confirmReplace) {
    e.confirmReplace = true;
    render();
    return;
  }
  const draft = e.draft;
  await runPending('echoApply', async () => {
    if (draft.worksheet.length > 0) {
      const { data, error } = await sb.from('files').insert({
        name: draft.title,
        type: 'doc',
        content: echoBlocksToHtml(draft.worksheet),
        owner_id: state.currentUser.id,
      }).select().single();
      if (error) { e.error = 'Could not create the file: ' + error.message; return; }
      const file = mapFile(data);
      state.files.push(file);
      state.attachedFileIds.push(file.id);
    }
    hw.name = draft.title;
    hw.description = draft.instructions;
    if (draft.suggested_points !== null) hw.points = draft.suggested_points;
    hw.topics = draft.topics;
    e.draft = null;
    e.confirmReplace = false;
    e.open = false;
    showToast('Draft added. Review it before assigning.');
  });
}

function EchoField(label, key, placeholder) {
  const e = echoState();
  return el('div', {},
    el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, label),
    el('input', {
      className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition',
      placeholder, value: e[key],
      onInput: (ev) => { e[key] = ev.target.value; },
    })
  );
}

function EchoWorksheetPreview(blocks) {
  let taskNumber = 0;
  return el('div', { className: 'border-t border-gray-200 pt-3 space-y-2 max-h-72 overflow-y-auto' },
    ...blocks.map(b => {
      if (b.type === 'heading') return el('p', { className: 'font-bold text-black' }, b.text);
      if (b.type === 'bullet') return el('p', { className: 'text-sm text-gray-700 pl-4' }, '• ' + b.text);
      if (b.type === 'task') return el('p', { className: 'text-sm text-gray-700' }, `${++taskNumber}. ${b.text}`);
      return el('p', { className: 'text-sm text-gray-700' }, b.text);
    })
  );
}

function EchoDraftPreview(draft) {
  const e = echoState();
  return el('div', { className: 'border-2 border-black p-5 space-y-3 bg-white' },
    el('p', { className: 'text-xl font-bold text-black' }, draft.title),
    el('p', { className: 'text-sm text-gray-700 whitespace-pre-wrap' }, draft.instructions),
    el('div', { className: 'flex flex-wrap items-center gap-2' },
      draft.suggested_points !== null ? el('span', { className: 'text-xs font-bold text-black' }, draft.suggested_points + ' points') : null,
      ...draft.topics.map(t => el('span', { className: 'text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-700' }, t))
    ),
    draft.worksheet.length > 0 ? EchoWorksheetPreview(draft.worksheet) : null,
    el('p', { className: 'text-xs text-gray-400' }, 'AI can make mistakes. Check the content before assigning it.'),
    el('div', { className: 'flex flex-wrap gap-3' },
      PendingButton('echoApply', e.confirmReplace ? 'Replace my text' : 'Use this draft', 'Adding…', echoApply, 'px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
      PendingButton('echoGenerate', 'Try again', 'Writing…', echoGenerate, 'px-6 py-2.5 bg-white text-black border-2 border-black text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition')
    )
  );
}

function EchoPanel() {
  if (state.currentUser?.role !== 'teacher') return null;
  const e = echoState();
  const toggle = () => { e.open = !e.open; render(); };

  if (!e.open) {
    return el('button', { className: 'w-full flex items-center gap-3 border-2 border-gray-200 hover:border-black p-3 text-left transition', onClick: toggle },
      EchoIcon('happy', 40),
      el('span', {},
        el('span', { className: 'block text-sm font-bold text-black' }, 'Draft with Echo'),
        el('span', { className: 'block text-xs text-gray-400' }, 'Assignments, worksheets and templates')
      )
    );
  }

  const kinds = [['assignment', 'Assignment'], ['assignment_worksheet', 'With worksheet'], ['template', 'Template']];
  const busy = isPending('echoGenerate');
  return el('div', { className: 'border-2 border-black p-5 space-y-5 bg-gray-50' },
    el('div', { className: 'flex items-center justify-between' },
      el('div', { className: 'flex items-center gap-3' },
        EchoIcon(busy ? 'thinking' : 'happy', 40),
        el('p', { className: 'text-sm font-bold text-black' }, 'Draft with Echo')
      ),
      el('button', { className: 'text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider', onClick: toggle }, 'Close')
    ),
    el('div', { className: 'flex flex-wrap gap-2' },
      ...kinds.map(([value, label]) => el('button', {
        className: `px-3 py-1.5 text-xs font-bold border-2 transition ${e.kind === value ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}`,
        onClick: () => { e.kind = value; render(); },
      }, label))
    ),
    el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
      EchoField('Subject', 'subject', 'Matematika'),
      EchoField('Grade', 'grade', '7. třída')
    ),
    EchoField('Topic', 'topic', 'Sčítání zlomků s různým jmenovatelem'),
    el('div', {},
      el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Notes (optional)'),
      el('textarea', {
        className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base resize-none transition',
        rows: 2, placeholder: 'Length, difficulty, what to focus on. Please leave out student names.', value: e.notes,
        onInput: (ev) => { e.notes = ev.target.value; },
      })
    ),
    e.error ? el('p', { className: 'text-sm font-bold text-red-600' }, e.error) : null,
    !e.draft ? el('div', { className: 'flex items-center gap-4' },
      PendingButton('echoGenerate', 'Generate', 'Writing…', echoGenerate, 'px-6 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
      e.remaining !== null ? el('span', { className: 'text-xs text-gray-400' }, e.remaining + ' requests left today') : null
    ) : null,
    e.draft ? EchoDraftPreview(e.draft) : null
  );
}

function EchoTopicsField() {
  return el('div', {},
    el('label', { className: 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2' }, 'Topics'),
    el('input', {
      className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-2 text-black bg-transparent font-light text-base transition',
      placeholder: 'zlomky - sčítání, společný jmenovatel',
      value: (state.newHomework.topics || []).join(', '),
      onInput: (ev) => {
        state.newHomework.topics = ev.target.value.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10);
      },
    })
  );
}
