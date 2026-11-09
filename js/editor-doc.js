// ==============================================
// EDITOR: DOC — EditorPage() (shared chrome for all 3 editor types) + DocEditor(),
// a contentEditable rich text editor (headings, lists, tables, links, images).
// Depends on: state.js, ui-core.js, actions.js (saveEditorFile/saveEditorFileNow).
// ==============================================

// ==============================================
// EDITOR PAGE — FULL FEATURED
// ==============================================
function EditorPage() {
  const file = state.editorFile;
  if (!file) return el('div', {}, 'No file open.');

  const isReadonlyByStudent = file.isStudentCopy && !!state.studentFiles.find(sf => sf.id === file.studentFileId)?.submittedAt && state.currentUser.role === 'student';
  // A teacher's own master file, forced read-only by openEditor()'s `locked` flag when they
  // double-click it from HomeworkCard() and submissions already exist for that assignment.
  const isLockedByTeacher = !!file.locked && !file.isStudentCopy;
  const isReadonly = isReadonlyByStudent || isLockedByTeacher;

  async function goBack() {
    await saveEditorFileNow();
    const returnTo = state._editorReturnView || 'dashboard';
    state._editorReturnView = null;
    state.view = returnTo;
    render();
  }

  let editorContent;
  if (file.type === 'doc') editorContent = DocEditor(file, isReadonly);
  else if (file.type === 'slides') editorContent = SlidesEditor(file, isReadonly);
  else editorContent = SheetsEditor(file, isReadonly);

  const submittedFile = file.isStudentCopy ? state.studentFiles.find(sf => sf.id === file.studentFileId) : null;

  return el('div', { className: 'min-h-screen bg-white flex flex-col' },
    el('div', { className: 'sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm' },
      el('button', { className: 'flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black uppercase tracking-wider transition', onClick: goBack }, Icon('back', 'w-4 h-4'), 'Back'),
      el('div', { className: 'w-px h-5 bg-gray-300' }),
      el('input', {
        className: 'text-base font-bold text-black border-none outline-none bg-transparent flex-1 min-w-0',
        value: file.name,
        readOnly: isReadonly,
        onInput: (e) => { state.editorFile.name = e.target.value; }
      }),
      el('div', { className: 'ml-auto flex items-center gap-3' },
        el('span', {
          className: `text-xs font-bold uppercase tracking-wider px-3 py-1 ${file.type === 'doc' ? 'bg-blue-50 text-blue-600' : file.type === 'slides' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`
        }, file.type),
        file.isStudentCopy && submittedFile?.submittedAt
          ? el('span', { className: 'text-xs font-bold text-green-600 px-3 py-1 bg-green-50 border border-green-200' }, '✓ Submitted')
          : null,
        !isReadonly ? el('button', {
          className: 'px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition',
          onClick: async () => { await saveEditorFileNow(); }
        }, 'Save') : null,
        file.isStudentCopy && !submittedFile?.submittedAt && state.currentUser.role === 'student'
          ? PendingButton(
              'submitStudentFile:' + file.studentFileId, 'Submit', 'Submitting…',
              async () => { await saveEditorFileNow(); await submitStudentFile(file.studentFileId); },
              'px-6 py-2 bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition'
            ) : null
      )
    ),
    isReadonly ? el('div', { className: 'bg-yellow-50 border-b border-yellow-200 px-6 py-2 text-xs font-bold text-yellow-700 uppercase tracking-wider' },
      isLockedByTeacher
        ? '⚠ Students have already submitted this assignment — the file is read-only so it stays consistent with what they turned in'
        : '⚠ This file has been submitted and is now read-only'
    ) : null,
    el('div', { className: 'flex-1' }, editorContent)
  );
}

// ==============================================
// DOC EDITOR — FULL FEATURED
// ==============================================
function DocEditor(file, readonly = false) {
  const fontFamilies = ['Default', 'Georgia', 'Arial', 'Courier New', 'Times New Roman', 'Verdana', 'Trebuchet MS'];
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
  const colors = ['#000000','#1e3a5f','#c0392b','#27ae60','#e67e22','#8e44ad','#2980b9','#e74c3c','#16a085','#d35400','#7f8c8d','#ffffff'];

  function cmd(command, value = null) {
    document.execCommand(command, false, value);
    editor.focus();
  }

  function makeBtn(label, command, value = null, title = '') {
    return el('button', {
      className: 'px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-black transition rounded',
      title: title || label,
      onClick: (e) => { e.preventDefault(); cmd(command, value); }
    }, label);
  }

  const toolbar = el('div', { className: 'sticky top-14 z-10 bg-white border-b border-gray-100 px-4 py-2 flex gap-1 flex-wrap items-center' },
    // Headings
    el('select', {
      className: 'text-xs border border-gray-200 rounded px-1 py-1 text-gray-600 bg-white mr-1',
      onChange: (e) => { cmd('formatBlock', e.target.value); e.target.value = 'p'; }
    },
      el('option', { value: 'p' }, 'Paragraph'),
      el('option', { value: 'h1' }, 'Heading 1'),
      el('option', { value: 'h2' }, 'Heading 2'),
      el('option', { value: 'h3' }, 'Heading 3'),
      el('option', { value: 'h4' }, 'Heading 4'),
      el('option', { value: 'blockquote' }, 'Quote'),
      el('option', { value: 'pre' }, 'Code')
    ),

    // Font family
    el('select', {
      className: 'text-xs border border-gray-200 rounded px-1 py-1 text-gray-600 bg-white mr-1',
      onChange: (e) => { cmd('fontName', e.target.value); }
    }, ...fontFamilies.map(f => el('option', { value: f === 'Default' ? 'inherit' : f }, f))),

    // Font size
    el('select', {
      className: 'text-xs border border-gray-200 rounded px-1 py-1 text-gray-600 bg-white mr-1',
      onChange: (e) => { 
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          const span = document.createElement('span');
          span.style.fontSize = e.target.value;
          range.surroundContents(span);
        }
      }
    }, ...fontSizes.map(s => el('option', { value: s }, s))),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Format buttons
    makeBtn('B', 'bold', null, 'Bold'),
    makeBtn('I', 'italic', null, 'Italic'),
    makeBtn('U', 'underline', null, 'Underline'),
    makeBtn('S̶', 'strikeThrough', null, 'Strikethrough'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Alignment
    makeBtn('⬛◻', 'justifyLeft', null, 'Align Left'),
    makeBtn('◻⬛◻', 'justifyCenter', null, 'Center'),
    makeBtn('◻⬛', 'justifyRight', null, 'Align Right'),
    makeBtn('▤', 'justifyFull', null, 'Justify'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Lists
    makeBtn('• List', 'insertUnorderedList', null, 'Bullet List'),
    makeBtn('1. List', 'insertOrderedList', null, 'Numbered List'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Indent
    makeBtn('→ Indent', 'indent', null, 'Indent'),
    makeBtn('← Outdent', 'outdent', null, 'Outdent'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Link
    el('button', {
      className: 'px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 transition rounded',
      onClick: (e) => {
        e.preventDefault();
        const url = prompt('Enter URL:');
        if (url) cmd('createLink', url);
      }
    }, '🔗 Link'),

    el('button', {
      className: 'px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 transition rounded',
      onClick: (e) => { e.preventDefault(); cmd('unlink'); }
    }, 'Unlink'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Table
    el('button', {
      className: 'px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 transition rounded',
      onClick: (e) => {
        e.preventDefault();
        const rows = parseInt(prompt('Rows:', '3')) || 3;
        const cols = parseInt(prompt('Columns:', '3')) || 3;
        let table = '<table border="1" style="border-collapse:collapse;width:100%;margin:8px 0"><tbody>';
        for (let r = 0; r < rows; r++) {
          table += '<tr>';
          for (let c = 0; c < cols; c++) {
            table += r === 0
              ? `<th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;font-weight:bold;">Header ${c+1}</th>`
              : `<td style="border:1px solid #ddd;padding:8px;">Cell</td>`;
          }
          table += '</tr>';
        }
        table += '</tbody></table>';
        cmd('insertHTML', table);
      }
    }, '⊞ Table'),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Image
    (() => {
      const imageInput = el('input', {
        type: 'file', accept: 'image/*', style: { display: 'none' },
        onChange: async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const dataUrl = await readImageAsDataURL(file, 900);
            cmd('insertHTML', `<img src="${dataUrl}" style="max-width:100%;margin:8px 0;" />`);
          } catch (err) {
            showToast('Could not insert image: ' + err.message);
          }
          e.target.value = '';
        }
      });
      const imageBtn = el('button', {
        className: 'px-2 py-1 text-xs font-bold text-gray-600 hover:bg-gray-100 transition rounded',
        title: 'Insert Image',
        onClick: (e) => { e.preventDefault(); imageInput.click(); }
      }, '🖼 Image');
      return el('span', {}, imageBtn, imageInput);
    })(),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    // Colors
    el('div', { className: 'flex items-center gap-1' },
      el('span', { className: 'text-[10px] text-gray-400 mr-1' }, 'Color:'),
      ...colors.map(c =>
        el('button', {
          className: 'w-4 h-4 rounded-sm border border-gray-200 hover:scale-125 transition-transform flex-shrink-0',
          style: { backgroundColor: c },
          title: c,
          onClick: (e) => { e.preventDefault(); cmd('foreColor', c); }
        })
      )
    ),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),

    el('div', { className: 'flex items-center gap-1' },
      el('span', { className: 'text-[10px] text-gray-400 mr-1' }, 'Highlight:'),
      ...['#ffff00','#00ff00','#ff9999','#99ccff','transparent'].map(c =>
        el('button', {
          className: 'w-4 h-4 rounded-sm border border-gray-200 hover:scale-125 transition-transform flex-shrink-0',
          style: { backgroundColor: c === 'transparent' ? '#fff' : c },
          title: c === 'transparent' ? 'Remove highlight' : c,
          onClick: (e) => { e.preventDefault(); cmd('hiliteColor', c); }
        })
      )
    ),

    el('div', { className: 'w-px h-5 bg-gray-200 mx-1' }),
    makeBtn('↶ Undo', 'undo'),
    makeBtn('↷ Redo', 'redo'),
    makeBtn('Clear', 'removeFormat', null, 'Remove Formatting')
  );

  const editor = el('div', {
    className: 'outline-none text-black text-base leading-8 font-light min-h-[600px] doc-content',
    contentEditable: !readonly,
    innerHTML: file.content || '<p>Start typing your document...</p>',
  });

  editor.addEventListener('input', () => { state.editorFile.content = editor.innerHTML; });

  // Disable toolbar if readonly
  if (readonly) toolbar.style.pointerEvents = 'none';

  const page = el('div', { className: 'max-w-3xl mx-auto mt-8 mb-24 px-16 py-12 shadow-sm border border-gray-100 bg-white' });
  page.appendChild(editor);

  const wrapper = el('div', {}, toolbar, el('div', { className: 'bg-gray-50 min-h-screen pb-24' }, page));
  return wrapper;
}

