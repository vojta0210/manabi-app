// ==============================================
// EDITOR: SHEETS — spreadsheet editor with real formulas (SUM/AVERAGE/MIN/MAX/COUNT/IF,
// cell refs and ranges), per-cell formatting, and resizable rows/cols.
// Depends on: state.js, ui-core.js, actions.js.
// ==============================================

// ==============================================
// SHEETS EDITOR — FULL FEATURED WITH FORMULAS
// ==============================================
function SheetsEditor(file, readonly = false) {
  let sheetsData;
  try { sheetsData = JSON.parse(file.content); } catch (_) { sheetsData = { rows: 20, cols: 8, data: {}, formatting: {} }; }
  if (!sheetsData.data) sheetsData.data = {};
  if (!sheetsData.formatting) sheetsData.formatting = {};

  let selectedCell = null;
  let selectedRow = null;
  let selectedCol = null;

  const rows = sheetsData.rows || 20;
  const cols = sheetsData.cols || 8;
  const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, cols);

  function cellKey(r, c) { return `${colLetters[c]}${r + 1}`; }
  function getRawValue(r, c) { return sheetsData.data[cellKey(r, c)] || ''; }

  // Formula evaluation
  function evaluateCell(r, c) {
    const raw = getRawValue(r, c);
    if (typeof raw === 'string' && raw.startsWith('=')) {
      try { return evaluateFormula(raw.slice(1)); } catch (_) { return '#ERR'; }
    }
    return raw;
  }

  function cellRefToRC(ref) {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    const col = colLetters.indexOf(match[1]);
    const row = parseInt(match[2]) - 1;
    return { row, col };
  }

  function getCellValue(ref) {
    const rc = cellRefToRC(ref);
    if (!rc) return 0;
    const val = sheetsData.data[ref] || '';
    if (typeof val === 'string' && val.startsWith('=')) {
      try { return evaluateFormula(val.slice(1)); } catch (_) { return 0; }
    }
    return isNaN(parseFloat(val)) ? val : parseFloat(val);
  }

  function getRangeValues(rangeStr) {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return [];
    const start = cellRefToRC(parts[0]);
    const end = cellRefToRC(parts[1]);
    if (!start || !end) return [];
    const values = [];
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = `${colLetters[c]}${r + 1}`;
        const val = sheetsData.data[key] || '';
        const num = parseFloat(val);
        if (!isNaN(num)) values.push(num);
      }
    }
    return values;
  }

  function evaluateFormula(formula) {
    formula = formula.trim().toUpperCase();

    // SUM
    let m = formula.match(/^SUM\(([A-Z0-9:,]+)\)$/);
    if (m) {
      const parts = m[1].split(',');
      let sum = 0;
      parts.forEach(p => {
        if (p.includes(':')) sum += getRangeValues(p).reduce((a, b) => a + b, 0);
        else { const v = getCellValue(p); if (!isNaN(parseFloat(v))) sum += parseFloat(v); }
      });
      return sum;
    }

    // AVERAGE
    m = formula.match(/^AVERAGE\(([A-Z0-9:,]+)\)$/);
    if (m) {
      const parts = m[1].split(',');
      let vals = [];
      parts.forEach(p => { if (p.includes(':')) vals = vals.concat(getRangeValues(p)); else { const v = getCellValue(p); if (!isNaN(parseFloat(v))) vals.push(parseFloat(v)); } });
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }

    // MIN
    m = formula.match(/^MIN\(([A-Z0-9:,]+)\)$/);
    if (m) {
      const vals = getRangeValues(m[1]);
      return vals.length ? Math.min(...vals) : 0;
    }

    // MAX
    m = formula.match(/^MAX\(([A-Z0-9:,]+)\)$/);
    if (m) {
      const vals = getRangeValues(m[1]);
      return vals.length ? Math.max(...vals) : 0;
    }

    // COUNT
    m = formula.match(/^COUNT\(([A-Z0-9:,]+)\)$/);
    if (m) { return getRangeValues(m[1]).length; }

    // IF
    m = formula.match(/^IF\((.+),(.+),(.+)\)$/);
    if (m) {
      try {
        const cond = evaluateFormula(m[1].trim());
        return cond ? evaluateFormula(m[2].trim()) : evaluateFormula(m[3].trim());
      } catch (_) { return '#ERR'; }
    }

    // Basic math with cell refs
    const withValues = formula.replace(/[A-Z]+\d+/g, (ref) => {
      const val = getCellValue(ref);
      return isNaN(parseFloat(val)) ? 0 : parseFloat(val);
    });

    // Evaluate arithmetic
    if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(withValues)) {
      return Function('"use strict"; return (' + withValues + ')')();
    }

    return formula;
  }

  function setCellValue(r, c, val) {
    if (val === '') delete sheetsData.data[cellKey(r, c)];
    else sheetsData.data[cellKey(r, c)] = val;
    state.editorFile.content = JSON.stringify(sheetsData);
    saveEditorFile();
  }

  function getCellFormatting(r, c) { return sheetsData.formatting[cellKey(r, c)] || {}; }
  function setCellFormatting(r, c, props) {
    sheetsData.formatting[cellKey(r, c)] = { ...getCellFormatting(r, c), ...props };
    state.editorFile.content = JSON.stringify(sheetsData);
    saveEditorFile();
  }

  // Formula bar
  const formulaBar = el('div', { className: 'flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 sticky top-14 z-10' },
    el('div', { className: 'w-16 px-2 py-1 bg-gray-50 border border-gray-200 text-xs font-mono text-gray-600 text-center', id: 'cell-ref-display' }, 'A1'),
    el('div', { className: 'w-px h-5 bg-gray-200' }),
    el('span', { className: 'text-xs font-bold text-gray-400' }, 'fx'),
    el('input', {
      id: 'formula-input',
      className: 'flex-1 px-2 py-1 text-sm font-mono border border-gray-200 bg-white text-black outline-none focus:border-blue-400',
      placeholder: 'Enter value or formula (e.g. =SUM(A1:A10))',
      readOnly: readonly,
      onInput: (e) => {
        if (selectedCell) {
          const { r, c } = selectedCell;
          setCellValue(r, c, e.target.value);
          // Update the cell display
          const cellEl = document.querySelector(`[data-cell="${cellKey(r, c)}"]`);
          if (cellEl) cellEl.textContent = evaluateCell(r, c);
        }
      }
    })
  );

  // Formatting toolbar
  const fmtColors = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#6b7280','#fef08a'];

  const fmtToolbar = readonly ? null : el('div', { className: 'flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-200 flex-wrap sticky z-10', style: { top: '96px' } },
    el('button', {
      className: 'px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded border border-gray-200',
      title: 'Bold',
      onClick: () => { if (selectedCell) { const f = getCellFormatting(selectedCell.r, selectedCell.c); setCellFormatting(selectedCell.r, selectedCell.c, { bold: !f.bold }); renderSheet(); } }
    }, 'B'),
    el('button', {
      className: 'px-2 py-1 text-xs italic text-gray-600 hover:bg-gray-100 rounded border border-gray-200',
      title: 'Italic',
      onClick: () => { if (selectedCell) { const f = getCellFormatting(selectedCell.r, selectedCell.c); setCellFormatting(selectedCell.r, selectedCell.c, { italic: !f.italic }); renderSheet(); } }
    }, 'I'),
    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),
    el('button', { className: 'px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200', title: 'Align Left', onClick: () => { if (selectedCell) { setCellFormatting(selectedCell.r, selectedCell.c, { align: 'left' }); renderSheet(); } } }, '⬛◻'),
    el('button', { className: 'px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200', title: 'Center', onClick: () => { if (selectedCell) { setCellFormatting(selectedCell.r, selectedCell.c, { align: 'center' }); renderSheet(); } } }, '◻⬛◻'),
    el('button', { className: 'px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-200', title: 'Align Right', onClick: () => { if (selectedCell) { setCellFormatting(selectedCell.r, selectedCell.c, { align: 'right' }); renderSheet(); } } }, '◻⬛'),
    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),
    el('span', { className: 'text-[10px] text-gray-400' }, 'Cell color:'),
    ...fmtColors.map(c => el('button', {
      className: 'w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform',
      style: { backgroundColor: c },
      onClick: () => { if (selectedCell) { setCellFormatting(selectedCell.r, selectedCell.c, { bgColor: c }); renderSheet(); } }
    })),
    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),
    el('span', { className: 'text-[10px] text-gray-400' }, 'Text color:'),
    ...fmtColors.map(c => el('button', {
      className: 'w-5 h-5 rounded-sm border border-gray-200 hover:scale-125 transition-transform',
      style: { backgroundColor: c },
      onClick: () => { if (selectedCell) { setCellFormatting(selectedCell.r, selectedCell.c, { textColor: c }); renderSheet(); } }
    })),
    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),
    el('button', {
      className: 'px-3 py-1 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition',
      onClick: () => {
        const r = parseInt(prompt('Add rows:', '5') || 0);
        if (r > 0) { sheetsData.rows = (sheetsData.rows || 20) + r; state.editorFile.content = JSON.stringify(sheetsData); saveEditorFile(); renderSheet(); }
      }
    }, '+ Rows'),
    el('button', {
      className: 'px-3 py-1 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition',
      onClick: () => {
        const c = parseInt(prompt('Add columns:', '2') || 0);
        if (c > 0 && sheetsData.cols + c <= 26) { sheetsData.cols = (sheetsData.cols || 8) + c; state.editorFile.content = JSON.stringify(sheetsData); saveEditorFile(); renderSheet(); }
      }
    }, '+ Cols')
  );

  const tableContainer = el('div', { className: 'overflow-auto', style: { height: 'calc(100vh - 160px)' } });

  function renderSheet() {
    const currentRows = sheetsData.rows || 20;
    const currentCols = sheetsData.cols || 8;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, currentCols);

    const table = el('table', { className: 'border-collapse text-sm select-none' },
      el('thead', {},
        el('tr', {},
          el('th', { className: 'w-10 h-8 bg-gray-100 border border-gray-300 sticky top-0 left-0 z-20 text-xs text-gray-400' }),
          ...letters.map((letter, ci) => {
            const isSelected = selectedCol === ci;
            return el('th', {
              className: `w-28 h-8 border border-gray-300 text-xs font-bold sticky top-0 z-10 text-center cursor-pointer transition ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
              onClick: () => { selectedCol = ci; selectedRow = null; selectedCell = null; renderSheet(); }
            }, letter);
          })
        )
      ),
      el('tbody', {},
        ...Array.from({ length: currentRows }, (_, r) => {
          const isRowSelected = selectedRow === r;
          return el('tr', {},
            el('td', {
              className: `w-10 h-8 border border-gray-300 text-xs font-bold text-center sticky left-0 z-10 cursor-pointer transition ${isRowSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`,
              onClick: () => { selectedRow = r; selectedCol = null; selectedCell = null; renderSheet(); }
            }, r + 1),
            ...Array.from({ length: currentCols }, (_, c) => {
              const key = `${letters[c]}${r + 1}`;
              const fmt = sheetsData.formatting[key] || {};
              const displayVal = evaluateCell(r, c);
              const isSelectedCell = selectedCell && selectedCell.r === r && selectedCell.c === c;
              const isHighlighted = isRowSelected || selectedCol === c;

              const cellEl = el('td', {
                className: `border border-gray-200 p-0 relative ${isSelectedCell ? 'outline outline-2 outline-blue-500 z-10' : ''} ${isHighlighted && !isSelectedCell ? 'bg-blue-50' : ''}`,
                style: { backgroundColor: fmt.bgColor || (isHighlighted ? '#eff6ff' : 'white') }
              },
                el('div', {
                  'data-cell': key,
                  className: 'w-28 h-8 px-2 text-sm overflow-hidden whitespace-nowrap',
                  style: {
                    fontWeight: fmt.bold ? 'bold' : 'normal',
                    fontStyle: fmt.italic ? 'italic' : 'normal',
                    textAlign: fmt.align || 'left',
                    color: fmt.textColor || '#111',
                    lineHeight: '32px',
                  }
                }, displayVal !== undefined ? String(displayVal) : ''),
                readonly ? null : el('input', {
                  className: 'absolute inset-0 w-full h-full px-2 text-sm border-0 outline-none bg-transparent opacity-0 cursor-cell',
                  value: getRawValue(r, c),
                  style: { fontWeight: fmt.bold ? 'bold' : 'normal', fontStyle: fmt.italic ? 'italic' : 'normal', textAlign: fmt.align || 'left', color: fmt.textColor || '#111' },
                  onInput: (e) => {
                    setCellValue(r, c, e.target.value);
                    const displayEl = cellEl.querySelector('[data-cell]');
                    if (displayEl) displayEl.textContent = evaluateCell(r, c);
                    const formulaInput = document.getElementById('formula-input');
                    if (formulaInput && selectedCell && selectedCell.r === r && selectedCell.c === c) formulaInput.value = e.target.value;
                  },
                  onClick: () => {
                    selectedCell = { r, c };
                    selectedRow = null;
                    selectedCol = null;
                    const refDisplay = document.getElementById('cell-ref-display');
                    if (refDisplay) refDisplay.textContent = key;
                    const formulaInput = document.getElementById('formula-input');
                    if (formulaInput) formulaInput.value = getRawValue(r, c);
                    // Re-render to show selection border
                    renderSheet();
                  }
                })
              );
              return cellEl;
            })
          );
        })
      )
    );

    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
  }

  renderSheet();

  return el('div', { className: 'flex flex-col h-[calc(100vh-57px)]' },
    formulaBar,
    fmtToolbar,
    tableContainer
  );
}
