// ==============================================
// MASCOTS — Zeměkoule (learning: classes, assignments, grades) and Echo (technical: files,
// editor, offline). Load after ui-core.js and before any view-*.js file.
//
// Role split (keep it — mixing them on the same kind of screen makes the brand feel random):
//   Globe(...)      → anything about school/learning content being empty or finished
//   EchoMascot(...) → anything about files, the editor, connection, technical errors
//
// Both return a real DOM node built with document.createElement + innerHTML, so they can be
// passed as children to el(). Every SVG gets unique gradient/clip IDs (mascotUid) — several
// mascots on one page would otherwise share IDs and render with the wrong colours.
// ==============================================

var mascotUid = 0;

function mascotWrap(svg, size) {
  var wrap = document.createElement('div');
  wrap.className = 'mascot';
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.lineHeight = '0';
  wrap.innerHTML = svg;
  return wrap;
}

// Globe({ eyes, mouth, extras, size, stand, tilt })
//   eyes:   'open' | 'happy' | 'closed' | 'wide' | 'sad' | 'look' | 'wink' | 'heart' | 'dizzy' | 'focus'
//   mouth:  'smile' | 'grin' | 'sad' | 'o' | 'flat' | 'wavy' | 'side' | 'sleep' | 'tongue'
//   extras: array of 'blush' | 'tears' | 'sweat' | 'zzz' | 'q' | 'bang' | 'spark' | 'confetti' |
//           'cap' | 'book' | 'bulb' | 'lens' | 'trophy' | 'wifi' | 'clock'
//   stand:  false hides the stand — use it below ~48px, the face gets lost otherwise
function Globe(o) {
  o = o || {};
  var p = 'mg' + (++mascotUid);
  var ink = '#0c1a2e';
  var size = o.size || 140;
  var stand = o.stand !== false;

  var E = {
    open: '<circle cx="64" cy="66" r="9" fill="#fff"/><circle cx="96" cy="66" r="9" fill="#fff"/><circle cx="65" cy="68" r="5" fill="' + ink + '"/><circle cx="97" cy="68" r="5" fill="' + ink + '"/><circle cx="67" cy="65" r="2" fill="#fff"/><circle cx="99" cy="65" r="2" fill="#fff"/>',
    happy: '<path d="M56 68 Q64 58 72 68" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M88 68 Q96 58 104 68" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" fill="none"/>',
    closed: '<path d="M56 66 Q64 72 72 66" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M88 66 Q96 72 104 66" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
    wide: '<circle cx="64" cy="64" r="12" fill="#fff"/><circle cx="96" cy="64" r="12" fill="#fff"/><circle cx="64" cy="65" r="4" fill="' + ink + '"/><circle cx="96" cy="65" r="4" fill="' + ink + '"/>',
    sad: '<circle cx="64" cy="68" r="9" fill="#fff"/><circle cx="96" cy="68" r="9" fill="#fff"/><circle cx="64" cy="71" r="5" fill="' + ink + '"/><circle cx="96" cy="71" r="5" fill="' + ink + '"/><circle cx="66" cy="68" r="2" fill="#fff"/><circle cx="98" cy="68" r="2" fill="#fff"/><path d="M54 54 Q62 50 72 56" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(-12 63 54)"/><path d="M88 56 Q98 50 106 54" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none" transform="rotate(12 97 54)"/>',
    look: '<circle cx="64" cy="66" r="9" fill="#fff"/><circle cx="96" cy="66" r="9" fill="#fff"/><circle cx="68" cy="62" r="5" fill="' + ink + '"/><circle cx="100" cy="62" r="5" fill="' + ink + '"/><path d="M88 52 Q96 48 104 52" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
    wink: '<circle cx="64" cy="66" r="9" fill="#fff"/><circle cx="65" cy="68" r="5" fill="' + ink + '"/><circle cx="67" cy="65" r="2" fill="#fff"/><path d="M88 68 Q96 60 104 68" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" fill="none"/>',
    heart: '<path d="M64 74 C52 64 56 56 64 62 C72 56 76 64 64 74 Z" fill="#f43f5e"/><path d="M96 74 C84 64 88 56 96 62 C104 56 108 64 96 74 Z" fill="#f43f5e"/>',
    dizzy: '<path d="M58 60 L70 72 M70 60 L58 72" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/><path d="M90 60 L102 72 M102 60 L90 72" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>',
    focus: '<circle cx="64" cy="66" r="9" fill="#fff"/><circle cx="96" cy="66" r="9" fill="#fff"/><circle cx="65" cy="68" r="5" fill="' + ink + '"/><circle cx="97" cy="68" r="5" fill="' + ink + '"/><path d="M54 56 L72 58" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/><path d="M88 58 L106 56" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>'
  };
  var M = {
    smile: '<path d="M68 84 Q80 94 92 84" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
    grin: '<path d="M66 82 H94 Q92 98 80 98 Q68 98 66 82 Z" fill="' + ink + '"/><path d="M72 92 Q80 88 88 92 Q85 97 80 97 Q75 97 72 92 Z" fill="#fb7185"/>',
    sad: '<path d="M70 92 Q80 84 90 92" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
    o: '<ellipse cx="80" cy="90" rx="6" ry="7" fill="' + ink + '"/>',
    flat: '<path d="M72 88 H88" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>',
    wavy: '<path d="M68 88 Q72 84 76 88 T84 88 T92 88" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
    side: '<path d="M74 88 Q84 92 92 84" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/>',
    sleep: '<ellipse cx="80" cy="90" rx="4" ry="3" fill="' + ink + '"/>',
    tongue: '<path d="M68 84 Q80 94 92 84" stroke="' + ink + '" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M80 90 Q80 98 86 97 Q90 95 88 88" fill="#fb7185"/>'
  };
  var X = {
    blush: '<ellipse cx="52" cy="80" rx="6" ry="4" fill="#f9a8d4" opacity=".85"/><ellipse cx="108" cy="80" rx="6" ry="4" fill="#f9a8d4" opacity=".85"/>',
    tears: '<path d="M60 78 Q56 88 60 92 Q64 88 60 78 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1"/><path d="M100 78 Q96 88 100 92 Q104 88 100 78 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1"/>',
    sweat: '<path d="M118 44 Q112 54 118 58 Q124 54 118 44 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="1"/>',
    zzz: '<text x="118" y="30" font-family="Inter,sans-serif" font-weight="900" font-size="16" fill="#64748b">Z</text><text x="134" y="18" font-family="Inter,sans-serif" font-weight="900" font-size="11" fill="#94a3b8">z</text>',
    q: '<text x="122" y="34" font-family="Inter,sans-serif" font-weight="900" font-size="26" fill="#f59e0b">?</text>',
    bang: '<text x="124" y="34" font-family="Inter,sans-serif" font-weight="900" font-size="26" fill="#ef4444">!</text>',
    spark: '<path d="M130 22 L133 30 L141 33 L133 36 L130 44 L127 36 L119 33 L127 30 Z" fill="#fbbf24"/><path d="M24 30 L26 35 L31 37 L26 39 L24 44 L22 39 L17 37 L22 35 Z" fill="#fbbf24"/>',
    confetti: '<rect x="22" y="22" width="6" height="10" rx="1" fill="#f43f5e" transform="rotate(25 25 27)"/><rect x="132" y="18" width="6" height="10" rx="1" fill="#22c55e" transform="rotate(-30 135 23)"/><circle cx="140" cy="44" r="3.5" fill="#3b82f6"/><circle cx="18" cy="50" r="3" fill="#a855f7"/><rect x="30" y="8" width="5" height="9" rx="1" fill="#fbbf24" transform="rotate(-20 32 12)"/><rect x="120" y="4" width="5" height="9" rx="1" fill="#f97316" transform="rotate(40 122 8)"/>',
    cap: '<path d="M48 22 L80 10 L112 22 L80 34 Z" fill="#1f2937"/><path d="M62 27 V36 Q80 44 98 36 V27 L80 34 Z" fill="#111827"/><path d="M112 22 V38" stroke="#fbbf24" stroke-width="2.5"/><circle cx="112" cy="40" r="3.5" fill="#fbbf24"/>',
    book: '<g transform="translate(0 4)"><path d="M46 104 Q63 98 80 104 Q97 98 114 104 V124 Q97 118 80 124 Q63 118 46 124 Z" fill="#fff" stroke="#b91c1c" stroke-width="3" stroke-linejoin="round"/><path d="M80 104 V124" stroke="#b91c1c" stroke-width="2"/><path d="M54 110 H72 M54 115 H70 M88 110 H106 M88 115 H104" stroke="#cbd5e1" stroke-width="1.5"/></g>',
    bulb: '<circle cx="126" cy="26" r="11" fill="#fde047" stroke="#ca8a04" stroke-width="2"/><rect x="121" y="36" width="10" height="7" rx="2" fill="#94a3b8"/><path d="M126 8 V4 M142 16 L146 13 M110 16 L106 13" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>',
    lens: '<circle cx="122" cy="96" r="16" fill="#e0f2fe" fill-opacity=".6" stroke="#334155" stroke-width="5"/><path d="M133 108 L146 122" stroke="#334155" stroke-width="7" stroke-linecap="round"/><path d="M114 88 Q118 84 124 85" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    trophy: '<path d="M112 26 H136 V36 Q136 48 124 48 Q112 48 112 36 Z" fill="#fbbf24" stroke="#b45309" stroke-width="2"/><path d="M120 48 H128 V54 H132 V58 H116 V54 H120 Z" fill="#d97706"/>',
    wifi: '<g transform="translate(124 28)"><circle r="13" fill="#ef4444"/><path d="M-6 -1 Q0 -6 6 -1 M-3 3 Q0 0 3 3" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M-7 -7 L7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>',
    clock: '<g transform="translate(126 30)"><circle r="13" fill="#fff" stroke="#334155" stroke-width="3"/><path d="M0 -7 V0 L5 3" stroke="#334155" stroke-width="2.5" stroke-linecap="round" fill="none"/></g>'
  };
  var onFace = { blush: 1, tears: 1 };
  var extras = o.extras || [];

  var s = '<defs><radialGradient id="' + p + 's" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".7" stop-color="#0284c7"/><stop offset="1" stop-color="#075985"/></radialGradient><clipPath id="' + p + 'c"><circle cx="80" cy="68" r="50"/></clipPath></defs>';
  s += '<ellipse cx="80" cy="150" rx="34" ry="4" fill="#000" opacity=".12"/>';
  if (stand) {
    s += '<path d="M80 118 V134" stroke="#a16207" stroke-width="6"/><rect x="54" y="134" width="52" height="12" rx="6" fill="#ca8a04"/>';
    s += '<path d="M24 92 A60 60 0 0 0 136 44" stroke="#ca8a04" stroke-width="5" stroke-linecap="round" fill="none"/>';
  }
  s += '<g transform="rotate(' + (o.tilt || 0) + ' 80 68)">';
  s += '<circle cx="80" cy="68" r="50" fill="url(#' + p + 's)"/>';
  s += '<g clip-path="url(#' + p + 'c)" fill="#4ade80"><path d="M34 40 Q50 30 62 40 Q58 54 46 56 Q36 54 34 40 Z"/><path d="M98 26 Q120 30 124 50 Q112 52 104 44 Q96 36 98 26 Z"/><path d="M100 96 Q116 92 122 104 Q110 118 98 112 Z"/><path d="M30 92 Q40 88 46 98 Q38 108 30 104 Z"/></g>';
  s += '<ellipse cx="56" cy="44" rx="14" ry="7" fill="#fff" opacity=".35" transform="rotate(-25 56 44)"/>';
  s += (E[o.eyes] || E.open) + (M[o.mouth] || M.smile);
  extras.forEach(function (k) { if (onFace[k] && X[k]) s += X[k]; });
  s += '</g>';
  extras.forEach(function (k) { if (!onFace[k] && X[k]) s += X[k]; });

  // Without the stand the sphere sits high in the box — crop the viewBox around it.
  var vb = stand ? '0 0 160 160' : '20 8 120 120';
  return mascotWrap('<svg width="100%" height="100%" viewBox="' + vb + '" fill="none" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>', size);
}

// EchoMascot('happy' | 'sad' | 'thinking', size)
function EchoMascot(expression, size) {
  expression = expression || 'happy';
  size = size || 140;
  var p = 'me' + (++mascotUid);
  var eyes = {
    happy: '<circle cx="60" cy="60" r="14" fill="white"/><circle cx="100" cy="60" r="14" fill="white"/><circle cx="60.5" cy="61" r="8.5" fill="#2e1065"/><circle cx="100.5" cy="61" r="8.5" fill="#3b0764"/><circle cx="63" cy="58" r="3.5" fill="white"/><circle cx="103" cy="58" r="3.5" fill="white"/>',
    sad: '<circle cx="60" cy="60" r="14" fill="white"/><circle cx="100" cy="60" r="14" fill="white"/><circle cx="60.5" cy="63" r="8.5" fill="#2e1065"/><circle cx="100.5" cy="63" r="8.5" fill="#3b0764"/><circle cx="63" cy="58" r="3.5" fill="white"/><circle cx="103" cy="58" r="3.5" fill="white"/><path d="M50 48 Q60 44 70 50" stroke="#5b21b6" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M90 50 Q100 44 110 48" stroke="#5b21b6" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
    thinking: '<circle cx="60" cy="60" r="14" fill="white"/><circle cx="100" cy="60" r="14" fill="white"/><circle cx="62" cy="61" r="8.5" fill="#2e1065"/><circle cx="103" cy="61" r="8.5" fill="#3b0764"/><circle cx="65" cy="58" r="3.5" fill="white"/><circle cx="106" cy="58" r="3.5" fill="white"/>'
  };
  var mouth = {
    happy: '<path d="M58 82 Q80 94 102 82" stroke="#5b21b6" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
    sad: '<path d="M58 82 Q80 74 102 82" stroke="#5b21b6" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
    thinking: '<path d="M64 82 Q75 86 90 80" stroke="#5b21b6" stroke-width="2.5" stroke-linecap="round" fill="none"/><circle cx="104" cy="80" r="3" fill="#5b21b6" opacity="0.5"/>'
  };
  var keys = '';
  for (var i = 0; i < 8; i++) keys += '<rect x="' + (34 + i * 12) + '" y="124" width="8" height="6" rx="1.5" fill="#7c3aed" opacity="0.3"/>';
  var s =
    '<defs>' +
      '<filter id="' + p + 'f"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#7c3aed" flood-opacity="0.22"/></filter>' +
      '<linearGradient id="' + p + 'l" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#c4b5fd"/><stop offset="100%" stop-color="#5b21b6"/></linearGradient>' +
      '<linearGradient id="' + p + 'b" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#4c1d95"/></linearGradient>' +
      '<linearGradient id="' + p + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ede9fe"/><stop offset="100%" stop-color="#ddd6fe"/></linearGradient>' +
      '<radialGradient id="' + p + 'h" cx="28%" cy="20%" r="55%"><stop offset="0%" stop-color="white" stop-opacity="0.5"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>' +
    '</defs>' +
    '<ellipse cx="80" cy="150" rx="52" ry="8" fill="#5b21b6" opacity="0.14"/>' +
    '<g filter="url(#' + p + 'f)">' +
      '<path d="M14 116 L14 136 Q14 142 22 142 L138 142 Q146 142 146 136 L146 116 Z" fill="url(#' + p + 'b)"/>' +
      '<rect x="30" y="122" width="100" height="14" rx="4" fill="#6d28d9" opacity="0.4"/>' + keys +
      '<rect x="52" y="132" width="56" height="4" rx="2" fill="#6d28d9" opacity="0.3"/>' +
      '<path d="M18 24 Q18 16 26 16 L134 16 Q142 16 142 24 L142 112 Q142 118 134 118 L26 118 Q18 118 18 112 Z" fill="url(#' + p + 'l)"/>' +
      '<rect x="26" y="22" width="108" height="90" rx="6" fill="url(#' + p + 'r)"/>' +
      (eyes[expression] || eyes.happy) + (mouth[expression] || mouth.happy) +
      '<ellipse cx="44" cy="76" rx="8" ry="5" fill="#c4b5fd" opacity="0.4"/><ellipse cx="116" cy="76" rx="8" ry="5" fill="#c4b5fd" opacity="0.4"/>' +
      '<circle cx="80" cy="22" r="3" fill="#6d28d9" opacity="0.5"/>' +
      '<rect x="26" y="22" width="108" height="90" rx="6" fill="url(#' + p + 'h)"/>' +
    '</g>';
  return mascotWrap('<svg width="100%" height="100%" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>', size);
}

// Shared empty-state block. `mascot` is a node from Globe()/EchoMascot().
// btnLabel/btnAction optional. compact=true for smaller in-section states.
function MascotEmptyState(mascot, title, sub, btnLabel, btnAction, compact) {
  return el('div', { className: (compact ? 'py-8' : 'py-14') + ' border-t border-gray-100 flex flex-col items-center text-center gap-4 mascot-empty' },
    mascot,
    el('div', {},
      el('p', { className: 'text-base font-bold text-black mb-1' }, title),
      sub ? el('p', { className: 'text-sm text-gray-400 font-light max-w-xs mx-auto' }, sub) : null
    ),
    btnLabel
      ? el('button', {
          className: 'px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition',
          onClick: btnAction
        }, btnLabel)
      : null
  );
}
