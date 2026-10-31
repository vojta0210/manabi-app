// ==============================================
// UI CORE — el() DOM builder, Icon() svg set, App() root router, LoadingScreen, render().
// Depends on: state.js. Everything else calls render()/el()/Icon() from here.
// ==============================================

function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') element.className = value;
    else if (key === 'onClick') element.addEventListener('click', value);
    else if (key === 'onInput') element.addEventListener('input', value);
    else if (key === 'onChange') element.addEventListener('change', value);
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
    else if (key.startsWith('data-')) element.setAttribute(key, value);
    else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else element[key] = value;
  });
  children.flat().forEach(child => {
    if (child === null || child === undefined) return;
    if (typeof child === 'string' || typeof child === 'number') element.appendChild(document.createTextNode(String(child)));
    else element.appendChild(child);
  });
  return element;
}

function Icon(name, cls = 'w-5 h-5') {
  const icons = {
    dashboard: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
    calendar: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
    students: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>',
    settings: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
    doc: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
    slides: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v6h8V6z" clip-rule="evenodd"/></svg>',
    sheets: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clip-rule="evenodd"/></svg>',
    trash: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
    edit: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>',
    back: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>',
    check: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>',
    eye: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>',
    submit: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>',
    plus: '<svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>',
    copy: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg>',
    grades: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>',
    megaphone: '<svg fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 00-1.6-.8L5.333 5H3a1 1 0 00-1 1v3a1 1 0 001 1h.5l.724 3.618a1 1 0 00.98.802H6.5a1 1 0 00.98-1.198L6.85 10H7v.01l2.4 1.79A1 1 0 0011 11V3zm2 1.5a1 1 0 112 0v8a1 1 0 11-2 0v-8z"/></svg>',
  };
  const w = document.createElement('span');
  w.className = cls;
  w.innerHTML = icons[name] || '';
  return w;
}

// A small colored dot — the classroom-color indicator reused everywhere a classroom shows
// up (its card, its homework, calendar events, the class filter).
function ColorDot(color, size = 'w-2.5 h-2.5') {
  return el('span', { className: `inline-block rounded-full flex-shrink-0 mr-2 ${size}`, style: { backgroundColor: color || '#94a3b8' } });
}

// ==============================================
// TOAST — replaces alert(). Every call site that used to say `alert('msg')` now says
// `showToast('msg')` (still fine as the tail of a `return showToast(...)` early-return
// guard, since this returns undefined too) and gets a bordered, non-blocking box instead of
// a native browser dialog. Pass 'success' as the second argument for a positive message
// (e.g. "Profile saved!") instead of the default error styling.
// ==============================================
let toastTimer = null;
function showToast(message, kind = 'error') {
  state.toast = { message, kind };
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 4000);
}
function dismissToast() {
  clearTimeout(toastTimer);
  state.toast = null;
  render();
}
function ToastDisplay() {
  if (!state.toast) return null;
  const isSuccess = state.toast.kind === 'success';
  // bottom-20 (not bottom-6) so this clears the "Powered by Netlify" badge Netlify injects
  // bottom-right on the free tier — the same corner that forced the principal-login dot to
  // move to bottom-left earlier. Left side stays clear since that dot lives there.
  return el('div', { className: `fixed bottom-20 right-6 z-[100] max-w-sm p-4 border-2 border-black shadow-2xl flex items-start gap-4 ${isSuccess ? 'bg-black text-white' : 'bg-white text-black'}` },
    el('p', { className: 'text-sm font-bold flex-1 whitespace-pre-wrap' }, state.toast.message),
    el('button', { className: `flex-shrink-0 font-bold ${isSuccess ? 'text-gray-400 hover:text-white' : 'text-gray-300 hover:text-black'} transition`, onClick: dismissToast }, '×')
  );
}

// ==============================================
// CONFIRM DIALOG — replaces confirm(). A call site that used to say
// `if (!confirm('msg')) return; <rest>` now says `showConfirm('msg', () => { <rest> })`.
// Same overlay pattern as ClassroomModal()/CalendarAnnouncementModal().
// ==============================================
function showConfirm(message, onConfirm, confirmLabel = 'Confirm') {
  state.confirmDialog = { message, onConfirm, confirmLabel };
  render();
}
function closeConfirm() { state.confirmDialog = null; render(); }
function ConfirmDialogModal() {
  if (!state.confirmDialog) return null;
  const { message, onConfirm, confirmLabel } = state.confirmDialog;
  return el('div', { className: 'fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4', onClick: closeConfirm },
    el('div', { className: 'w-full max-w-sm p-10 bg-white shadow-2xl border border-gray-100', onClick: (e) => e.stopPropagation() },
      el('p', { className: 'text-base text-black font-light mb-8 whitespace-pre-wrap' }, message),
      el('div', { className: 'flex gap-4' },
        el('button', { className: 'flex-1 py-3 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition', onClick: () => { closeConfirm(); onConfirm(); } }, confirmLabel),
        el('button', { className: 'flex-1 py-3 bg-gray-100 text-black font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition', onClick: closeConfirm }, 'Cancel')
      )
    )
  );
}

// ==============================================
// PENDING ACTIONS — tracks which async button handlers are currently in flight so a button
// can show "Saving…"/be disabled instead of sitting there looking unresponsive, and so a
// second click while the first request hasn't come back yet is ignored rather than firing a
// duplicate request (e.g. double-posting an announcement on a slow connection).
// Usage: onClick: () => runPending('postAnnouncement', postAnnouncement), and the button's
// label/disabled attrs check isPending('postAnnouncement').
// ==============================================
async function runPending(key, fn) {
  if (state.pendingActions[key]) return;
  state.pendingActions[key] = true;
  render();
  try {
    await fn();
  } finally {
    state.pendingActions[key] = false;
    render();
  }
}
function isPending(key) { return !!state.pendingActions[key]; }

// A <button> that shows `pendingLabel` and disables itself while its runPending() key is in
// flight, so a Save/Send/Create/Submit button never just sits there looking unresponsive
// (or clickable a second time) on a slow connection. `className` is whatever that button
// would normally have; the disabled-looking opacity is added on top of it automatically.
function PendingButton(key, label, pendingLabel, onClick, className) {
  const pending = isPending(key);
  return el('button', {
    className: `${className} ${pending ? 'opacity-50 cursor-not-allowed' : ''}`,
    disabled: pending,
    onClick
  }, pending ? pendingLabel : label);
}

// ==============================================
// RENDER
// ==============================================

function App() {
  const root = document.getElementById('root');
  root.innerHTML = '';
  if (state.authLoading) { root.appendChild(LoadingScreen()); return; }
  if (!state.currentUser) { root.appendChild(AuthScreen()); appendOverlays(root); return; }
  if (state.view === 'editor') { root.appendChild(EditorPage()); appendOverlays(root); return; }
  root.appendChild(DashboardLayout());
  appendOverlays(root);
}

// Toast + confirm dialog float above every screen (auth, editor, dashboard) — appended once
// here rather than duplicated into each top-level view.
function appendOverlays(root) {
  const toast = ToastDisplay();
  if (toast) root.appendChild(toast);
  const confirmModal = ConfirmDialogModal();
  if (confirmModal) root.appendChild(confirmModal);
}

function LoadingScreen() {
  return el('div', { className: 'min-h-screen flex items-center justify-center bg-gray-100' },
    el('p', { className: 'text-gray-400 font-bold uppercase tracking-widest text-sm' }, 'Loading…')
  );
}

// Reads a local image file, downscales it to maxWidth (keeping aspect ratio) and returns a
// JPEG data: URL. Used by the Doc and Slides editors to embed images directly in their
// content — there's no separate file storage, so images live inline as base64. Downscaling
// keeps that from bloating the saved content (and the database row) too badly; still, a
// document/slide with many large images will get heavy — that's a real limitation to know
// about, not something this function can fully hide.
function readImageAsDataURL(file, maxWidth = 1000) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('Not an image file')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
