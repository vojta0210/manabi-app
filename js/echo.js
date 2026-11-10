// ==============================================
// ECHO — global floating assistant bubble. Teachers get a small chat-style panel that drafts
// assignments/worksheets/templates; any other signed-in role sees a short "not yet" notice.
// Mounted once, globally, from appendOverlays() in ui-core.js — reachable from any screen
// (dashboard, a classroom, the editor), not just one page.
// Depends on: state.js, ui-core.js (el, render, runPending, PendingButton, showToast, isPending),
// data.js (mapFile), mascots.js (EchoMascot, optional), config.js (sb), actions.js (openCreateAssignment).
// Server side: supabase/functions/echo. Echo only ever fills in a fresh New Assignment form;
// nothing reaches students until the teacher presses Assign there.
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
    state.echo = { open: false, kind: 'assignment', subject: '', grade: '', topic: '', notes: '', draft: null, error: '', remaining: null };
  }
  return state.echo;
}

// Clears the current question/draft but keeps the panel open/closed as it was and the
// day's remaining-requests count. Used for "ask something else", not on every page visit —
// the bubble is global now, so navigating around the app no longer resets it.
function echoReset() {
  const open = state.echo?.open || false;
  const remaining = state.echo?.remaining ?? null;
  state.echo = { open, kind: 'assignment', subject: '', grade: '', topic: '', notes: '', draft: null, error: '', remaining };
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

// "Open in New Assignment": always lands on a FRESH assignment (openCreateAssignment() with
// no args), pre-filled from the draft — there's no page to "replace text on" any more since
// Echo can be invoked from anywhere, not just from inside an in-progress assignment form.
async function echoUseDraft() {
  const e = echoState();
  const draft = e.draft;
  if (!draft) return;
  await runPending('echoApply', async () => {
    let fileToAttach = null;
    if (draft.worksheet.length > 0) {
      const { data, error } = await sb.from('files').insert({
        name: draft.title,
        type: 'doc',
        content: echoBlocksToHtml(draft.worksheet),
        owner_id: state.currentUser.id,
      }).select().single();
      if (error) { e.error = 'Could not create the file: ' + error.message; return; }
      fileToAttach = mapFile(data);
    }
    openCreateAssignment();
    const hw = state.newHomework;
    hw.name = draft.title;
    hw.description = draft.instructions;
    if (draft.suggested_points !== null) hw.points = draft.suggested_points;
    hw.topics = draft.topics;
    if (fileToAttach) {
      state.files.push(fileToAttach);
      state.attachedFileIds.push(fileToAttach.id);
    }
    e.draft = null;
    e.open = false;
    showToast('Draft opened — review it and assign a classroom.');
  });
}

function EchoChatField(label, key, placeholder) {
  const e = echoState();
  return el('div', {},
    el('label', { className: 'block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1' }, label),
    el('input', {
      className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-1.5 text-black bg-transparent font-light text-sm transition',
      placeholder, value: e[key],
      onInput: (ev) => { e[key] = ev.target.value; },
    })
  );
}

function EchoWorksheetPreview(blocks) {
  let taskNumber = 0;
  return el('div', { className: 'border-t border-gray-200 pt-2 mt-2 space-y-1.5 max-h-40 overflow-y-auto' },
    ...blocks.map(b => {
      if (b.type === 'heading') return el('p', { className: 'font-bold text-black text-xs' }, b.text);
      if (b.type === 'bullet') return el('p', { className: 'text-xs text-gray-700 pl-3' }, '• ' + b.text);
      if (b.type === 'task') return el('p', { className: 'text-xs text-gray-700' }, `${++taskNumber}. ${b.text}`);
      return el('p', { className: 'text-xs text-gray-700' }, b.text);
    })
  );
}

function EchoDraftBubble(draft) {
  return el('div', { className: 'space-y-3' },
    el('div', { className: 'border-2 border-black p-3 space-y-2 bg-white' },
      el('p', { className: 'text-base font-bold text-black' }, draft.title),
      el('p', { className: 'text-xs text-gray-700 whitespace-pre-wrap' }, draft.instructions),
      el('div', { className: 'flex flex-wrap items-center gap-1.5' },
        draft.suggested_points !== null ? el('span', { className: 'text-[10px] font-bold text-black' }, draft.suggested_points + ' points') : null,
        ...draft.topics.map(t => el('span', { className: 'text-[9px] font-bold uppercase px-1.5 py-0.5 bg-gray-100 text-gray-700' }, t))
      ),
      draft.worksheet.length > 0 ? EchoWorksheetPreview(draft.worksheet) : null
    ),
    el('p', { className: 'text-[10px] text-gray-400' }, 'AI can make mistakes. Check the content before assigning it.'),
    el('div', { className: 'flex flex-wrap gap-2' },
      PendingButton('echoApply', 'Open in New Assignment', 'Opening…', echoUseDraft, 'px-3 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
      PendingButton('echoGenerate', 'Try again', 'Writing…', echoGenerate, 'px-3 py-2 bg-white text-black border-2 border-black text-[11px] font-bold uppercase tracking-widest hover:bg-gray-50 transition')
    )
  );
}

function EchoTeacherChatBody() {
  const e = echoState();
  const kinds = [['assignment', 'Assignment'], ['assignment_worksheet', 'With worksheet'], ['template', 'Template']];
  const busy = isPending('echoGenerate');
  return el('div', { className: 'space-y-3' },
    el('div', { className: 'bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600' },
      e.draft ? "Here's a draft:" : 'Tell me what to draft — a topic is enough — and I’ll put together a suggestion.'
    ),
    !e.draft ? el('div', { className: 'space-y-3' },
      el('div', { className: 'flex flex-wrap gap-1.5' },
        ...kinds.map(([value, label]) => el('button', {
          className: `px-2.5 py-1 text-[10px] font-bold border-2 transition ${e.kind === value ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'}`,
          onClick: () => { e.kind = value; render(); },
        }, label))
      ),
      el('div', { className: 'grid grid-cols-2 gap-3' },
        EchoChatField('Subject', 'subject', 'Matematika'),
        EchoChatField('Grade', 'grade', '7. třída')
      ),
      EchoChatField('Topic', 'topic', 'Sčítání zlomků s různým jmenovatelem'),
      el('textarea', {
        className: 'w-full border-b-2 border-gray-200 focus:border-black outline-none py-1.5 text-black bg-transparent font-light text-sm resize-none transition',
        rows: 2, placeholder: 'Notes (optional) — please leave out student names.', value: e.notes,
        onInput: (ev) => { e.notes = ev.target.value; },
      }),
      e.error ? el('p', { className: 'text-xs font-bold text-red-600' }, e.error) : null,
      el('div', { className: 'flex items-center gap-3' },
        PendingButton('echoGenerate', 'Generate', 'Writing…', echoGenerate, 'px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
        e.remaining !== null ? el('span', { className: 'text-[10px] text-gray-400' }, e.remaining + ' left today') : null
      )
    ) : EchoDraftBubble(e.draft)
  );
}

function EchoComingSoonBody() {
  return el('div', { className: 'bg-gray-50 border border-gray-200 px-3 py-3 text-xs text-gray-600' },
    'Echo currently helps teachers draft assignments and templates. Help for students is on the way.'
  );
}

function EchoChatPanel() {
  const e = echoState();
  const isTeacher = state.currentUser?.role === 'teacher';
  const busy = isPending('echoGenerate');
  return el('div', { className: 'w-80 max-h-[32rem] bg-white border-2 border-black shadow-xl flex flex-col' },
    el('div', { className: 'flex items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0' },
      EchoIcon(busy ? 'thinking' : 'happy', 32),
      el('div', { className: 'flex-1 min-w-0' },
        el('p', { className: 'text-sm font-bold text-black' }, 'Echo'),
        el('p', { className: 'text-[10px] text-gray-400 truncate' }, isTeacher ? 'Assignment drafts & templates' : 'Coming soon for your role')
      ),
      isTeacher ? el('button', { className: 'text-gray-400 hover:text-black transition text-sm leading-none px-1', title: 'Ask something else', onClick: () => { echoReset(); render(); } }, '↺') : null,
      el('button', { className: 'text-gray-400 hover:text-black transition text-lg leading-none px-1', title: 'Close', onClick: () => { e.open = false; render(); } }, '×')
    ),
    el('div', { className: 'flex-1 overflow-y-auto px-4 py-3' }, isTeacher ? EchoTeacherChatBody() : EchoComingSoonBody())
  );
}

// Mounted globally from appendOverlays() — a fixed bubble in the corner on every signed-in
// screen. Clicking it opens/closes the small chat panel above it.
function EchoBubble() {
  if (!state.currentUser) return null;
  const e = echoState();
  return el('div', { className: 'fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3' },
    e.open ? EchoChatPanel() : null,
    el('button', {
      className: 'w-14 h-14 rounded-full bg-white border-2 border-black shadow-lg flex items-center justify-center hover:scale-105 transition overflow-hidden shrink-0',
      title: e.open ? 'Close Echo' : 'Open Echo',
      onClick: () => { e.open = !e.open; render(); },
    }, e.open ? el('span', { className: 'text-xl text-black' }, '×') : EchoIcon('happy', 40))
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
