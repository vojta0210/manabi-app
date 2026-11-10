// ==============================================
// ECHO — global floating assistant bubble. The teacher types ONE free-text request (no
// separate subject/grade/topic fields); the Echo backend infers everything it needs — subject,
// grade, whether a worksheet is wanted — from that message alone. See supabase/functions/echo.
// The bubble can be dragged anywhere on screen; its position is remembered (localStorage).
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
  bad_request: 'Please describe what you want Echo to draft.',
  ai_too_long: 'That draft came out too long. Try being more specific.',
};
const ECHO_DEFAULT_ERROR = 'Echo could not finish that. Please try again.';
const ECHO_BUBBLE_SIZE = 56; // px — matches the w-14 h-14 button
const ECHO_POS_KEY = 'echoBubblePos';

// Uses the Echo mascot when mascots.js is loaded, otherwise a plain badge.
function EchoIcon(expression, size) {
  if (typeof EchoMascot === 'function') return EchoMascot(expression, size);
  return el('div', { className: 'flex items-center justify-center text-white font-bold shrink-0', style: { width: size + 'px', height: size + 'px', background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)' } }, 'E');
}

function echoClampPos(left, top) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - ECHO_BUBBLE_SIZE - margin);
  const maxTop = Math.max(margin, window.innerHeight - ECHO_BUBBLE_SIZE - margin);
  return { left: Math.min(Math.max(left, margin), maxLeft), top: Math.min(Math.max(top, margin), maxTop) };
}

function echoLoadStoredPos() {
  try {
    const raw = localStorage.getItem(ECHO_POS_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos?.left !== 'number' || typeof pos?.top !== 'number') return null;
    return echoClampPos(pos.left, pos.top);
  } catch (_) { return null; }
}

function echoState() {
  if (!state.echo) {
    state.echo = { open: false, message: '', draft: null, error: '', remaining: null, pos: echoLoadStoredPos() };
  }
  return state.echo;
}

// Clears the current request/draft but keeps the panel open/closed, the bubble's position,
// and the day's remaining-requests count as they were. Used for "ask something else", not on
// every page visit — the bubble is global now, so navigating around the app no longer resets it.
function echoReset() {
  const e = state.echo;
  state.echo = { open: e?.open || false, message: '', draft: null, error: '', remaining: e?.remaining ?? null, pos: e?.pos ?? null };
}

// mapHomework() doesn't carry topics, so they are read on demand when editing.
async function echoLoadTopics(homeworkId) {
  const { data, error } = await sb.from('homework').select('topics').eq('id', homeworkId).maybeSingle();
  if (error || !data || state.editingHomeworkId !== homeworkId) return;
  state.newHomework.topics = data.topics || [];
  render();
}

// Everything — subject, grade, whether a worksheet or template is wanted — is inferred by the
// Echo backend from this one free-text message.
async function echoGenerate() {
  const e = echoState();
  e.error = '';
  if (!e.message.trim()) { e.error = ECHO_ERRORS.bad_request; render(); return; }
  await runPending('echoGenerate', async () => {
    const { data, error } = await sb.functions.invoke('echo', {
      body: { message: e.message },
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
  return el('div', { className: 'space-y-3' },
    el('div', { className: 'bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600' },
      e.draft ? "Here's a draft:" : 'Tell me what to draft, in your own words — subject, grade, topic, whether you want a worksheet — and I’ll put together a suggestion.'
    ),
    !e.draft ? el('div', { className: 'space-y-3' },
      el('textarea', {
        className: 'w-full border-2 border-gray-200 focus:border-black outline-none p-2 text-black bg-white font-light text-sm resize-none transition rounded',
        rows: 4,
        placeholder: 'Např.: Zadání s pracovním listem pro 7. třídu, matematika — sčítání zlomků s různým jmenovatelem, asi 6 úloh.',
        value: e.message,
        onInput: (ev) => { e.message = ev.target.value; },
        onKeyDown: (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); echoGenerate(); } },
      }),
      e.error ? el('p', { className: 'text-xs font-bold text-red-600' }, e.error) : null,
      el('div', { className: 'flex items-center gap-3' },
        PendingButton('echoGenerate', 'Send', 'Writing…', echoGenerate, 'px-4 py-2 bg-black text-white text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition'),
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
        el('p', { className: 'text-[10px] text-gray-400 truncate' }, isTeacher ? 'Tell me what to draft' : 'Coming soon for your role')
      ),
      isTeacher ? el('button', { className: 'text-gray-400 hover:text-black transition text-sm leading-none px-1', title: 'Ask something else', onClick: () => { echoReset(); render(); } }, '↺') : null,
      el('button', { className: 'text-gray-400 hover:text-black transition text-lg leading-none px-1', title: 'Close', onClick: () => { e.open = false; render(); } }, '×')
    ),
    el('div', { className: 'flex-1 overflow-y-auto px-4 py-3' }, isTeacher ? EchoTeacherChatBody() : EchoComingSoonBody())
  );
}

// Pointer-drag handling for the bubble — see EchoBubble(). Moves the wrapper's inline
// left/top directly on pointermove (NOT via state+render(), which would tear down and
// rebuild the whole app on every pixel of movement); only commits the final position to
// state + localStorage once the drag ends. A short movement is treated as a click instead.
function echoBubbleDragStart(ev) {
  const wrapper = document.getElementById('echo-bubble-wrapper');
  if (!wrapper) return;
  ev.preventDefault();
  const startX = ev.clientX, startY = ev.clientY;
  const rect = wrapper.getBoundingClientRect();
  const startLeft = rect.left, startTop = rect.top;
  let dragging = false;
  const DRAG_THRESHOLD = 6;

  function onMove(moveEv) {
    const dx = moveEv.clientX - startX;
    const dy = moveEv.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragging = true;
    const { left, top } = echoClampPos(startLeft + dx, startTop + dy);
    wrapper.style.left = left + 'px';
    wrapper.style.top = top + 'px';
    wrapper.style.right = 'auto';
    wrapper.style.bottom = 'auto';
  }
  function onUp(upEv) {
    window.removeEventListener('pointermove', onMove);
    if (dragging) {
      const dx = upEv.clientX - startX, dy = upEv.clientY - startY;
      const pos = echoClampPos(startLeft + dx, startTop + dy);
      const e = echoState();
      e.pos = pos;
      try { localStorage.setItem(ECHO_POS_KEY, JSON.stringify(pos)); } catch (_) { /* best effort */ }
    } else {
      const e = echoState();
      e.open = !e.open;
      render();
    }
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

// Mounted globally from appendOverlays() — a bubble the teacher can drag anywhere on screen;
// its position is remembered (localStorage). Clicking (not dragging) it opens/closes the
// small chat panel, which appears on whichever side of the bubble has more room.
function EchoBubble() {
  if (!state.currentUser) return null;
  const e = echoState();
  const pos = e.pos ? echoClampPos(e.pos.left, e.pos.top) : null;
  const panelBelow = pos ? pos.top < window.innerHeight / 2 : false;
  const panelAlignEnd = pos ? pos.left > window.innerWidth / 2 : true;

  const button = el('button', {
    className: 'w-14 h-14 rounded-full bg-white border-2 border-black shadow-lg flex items-center justify-center hover:scale-105 transition overflow-hidden shrink-0 cursor-grab active:cursor-grabbing',
    style: { touchAction: 'none' },
    title: e.open ? 'Close Echo (drag to move)' : 'Open Echo (drag to move)',
    onPointerDown: echoBubbleDragStart,
  }, e.open ? el('span', { className: 'text-xl text-black' }, '×') : EchoIcon('happy', 40));

  const panel = e.open ? EchoChatPanel() : null;
  const children = panelBelow ? [button, panel] : [panel, button];

  return el('div', {
    id: 'echo-bubble-wrapper',
    className: `fixed z-40 flex flex-col gap-3 ${panelAlignEnd ? 'items-end' : 'items-start'} ${pos ? '' : 'bottom-6 right-6'}`,
    style: pos ? { left: pos.left + 'px', top: pos.top + 'px' } : {},
  }, ...children);
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
