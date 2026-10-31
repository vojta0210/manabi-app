// ==============================================
// EDITOR: SLIDES — slide deck editor: per-slide title/body, background color or
// image, layout, and a slide list/reorder sidebar. Depends on: state.js, ui-core.js, actions.js.
// ==============================================

// ==============================================
// SLIDES EDITOR — FULL FEATURED
// ==============================================
function SlidesEditor(file, readonly = false) {
  let slides;
  try { slides = JSON.parse(file.content); } catch (_) { slides = []; }
  if (!Array.isArray(slides) || slides.length === 0) slides = [{ id: 1, title: 'Slide 1', body: '', bgColor: '#ffffff', textColor: '#1a1a2e', layout: 'center' }];

  let currentSlide = (state._slidesCurrentIdx != null && state._slidesCurrentIdx < slides.length) ? state._slidesCurrentIdx : 0;

  const bgColors = ['#ffffff','#1a1a2e','#0f3460','#16213e','#f8f9fa','#1a1a1a','#fef3c7','#dbeafe','#d1fae5','#fce7f3','#ede9fe','#fff7ed'];
  const textColors = ['#1a1a2e','#ffffff','#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#6b7280'];
  const layouts = ['center', 'left', 'top-left', 'top-center', 'bottom-left'];

  function saveSlides() {
    state.editorFile.content = JSON.stringify(slides);
    saveEditorFile();
  }

  function addSlide() {
    const lastSlide = slides[slides.length - 1];
    slides.push({
      id: Date.now(),
      title: `Slide ${slides.length + 1}`,
      body: '',
      bgColor: lastSlide?.bgColor || '#ffffff',
      textColor: lastSlide?.textColor || '#1a1a2e',
      layout: lastSlide?.layout || 'center'
    });
    currentSlide = slides.length - 1;
    state._slidesCurrentIdx = currentSlide;
    saveSlides();
    render();
  }

  function duplicateSlide(idx) {
    const copy = { ...slides[idx], id: Date.now(), title: slides[idx].title + ' (copy)' };
    slides.splice(idx + 1, 0, copy);
    currentSlide = idx + 1;
    state._slidesCurrentIdx = currentSlide;
    saveSlides();
    render();
  }

  function removeSlide(idx) {
    if (slides.length === 1) return showToast("Can't delete the only slide.");
    slides.splice(idx, 1);
    currentSlide = Math.min(currentSlide, slides.length - 1);
    state._slidesCurrentIdx = currentSlide;
    saveSlides();
    render();
  }

  function moveSlide(idx, direction) {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= slides.length) return;
    [slides[idx], slides[newIdx]] = [slides[newIdx], slides[idx]];
    currentSlide = newIdx;
    state._slidesCurrentIdx = currentSlide;
    saveSlides();
    render();
  }

  const slide = slides[currentSlide];

  const layoutStyles = {
    'center':      { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
    'left':        { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', textAlign: 'left' },
    'top-left':    { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', textAlign: 'left' },
    'top-center':  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center' },
    'bottom-left': { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'left' },
  };

  // Canvas slide preview
  const slideCanvas = el('div', {
    className: 'w-full bg-white shadow-xl overflow-hidden',
    style: {
      aspectRatio: '16/9', backgroundColor: slide.bgColor,
      backgroundImage: slide.bgImage ? `url(${slide.bgImage})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
      ...layoutStyles[slide.layout || 'center'], padding: '48px'
    }
  });

  // A background image needs a bit of contrast help so title/body text stays readable
  // over whatever's underneath — a plain text-shadow is enough without adding a full
  // overlay box that would fight with the layout options above.
  const textShadow = slide.bgImage ? '0 1px 4px rgba(0,0,0,0.7)' : 'none';

  const titleInput = el('input', {
    className: 'bg-transparent border-none outline-none w-full font-bold mb-4',
    style: { color: slide.textColor, fontSize: 'clamp(20px, 4vw, 44px)', lineHeight: '1.2', textShadow },
    placeholder: 'Slide Title',
    value: slide.title,
    readOnly: readonly,
    onInput: (e) => { slides[currentSlide].title = e.target.value; saveSlides(); }
  });

  const bodyTextarea = el('textarea', {
    className: 'bg-transparent border-none outline-none w-full resize-none leading-relaxed flex-1',
    style: { color: slide.textColor, fontSize: 'clamp(14px, 2vw, 22px)', opacity: '0.85', minHeight: '120px', textShadow },
    placeholder: 'Add content, bullet points, or notes...',
    value: slide.body,
    readOnly: readonly,
    onInput: (e) => { slides[currentSlide].body = e.target.value; saveSlides(); }
  });

  slideCanvas.appendChild(titleInput);
  slideCanvas.appendChild(bodyTextarea);

  // Properties panel
  const propertiesPanel = readonly ? null : el('div', { className: 'w-64 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0 p-4 space-y-6' },
    el('div', {},
      el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider mb-2' }, 'Background'),
      el('div', { className: 'grid grid-cols-6 gap-1' },
        ...bgColors.map(c =>
          el('button', {
            className: `w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${slide.bgColor === c ? 'border-black scale-110' : 'border-gray-200'}`,
            style: { backgroundColor: c },
            onClick: () => { slides[currentSlide].bgColor = c; saveSlides(); render(); }
          })
        )
      )
    ),
    el('div', {},
      el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider mb-2' }, 'Text Color'),
      el('div', { className: 'grid grid-cols-5 gap-1' },
        ...textColors.map(c =>
          el('button', {
            className: `w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${slide.textColor === c ? 'border-black scale-110' : 'border-gray-200'}`,
            style: { backgroundColor: c },
            onClick: () => { slides[currentSlide].textColor = c; saveSlides(); render(); }
          })
        )
      )
    ),
    el('div', {},
      el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider mb-2' }, 'Background Image'),
      (() => {
        const bgImageInput = el('input', {
          type: 'file', accept: 'image/*', style: { display: 'none' },
          onChange: async (e) => {
            const f = e.target.files[0];
            if (!f) return;
            try {
              const dataUrl = await readImageAsDataURL(f, 1200);
              slides[currentSlide].bgImage = dataUrl;
              saveSlides();
              render();
            } catch (err) {
              showToast('Could not insert image: ' + err.message);
            }
            e.target.value = '';
          }
        });
        return el('div', { className: 'space-y-2' },
          bgImageInput,
          el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition', onClick: () => bgImageInput.click() }, '🖼 Upload Image'),
          slide.bgImage ? el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-red-200 hover:border-red-400 text-red-500 transition', onClick: () => { delete slides[currentSlide].bgImage; saveSlides(); render(); } }, '✕ Remove Image') : null
        );
      })()
    ),
    el('div', {},
      el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider mb-2' }, 'Layout'),
      el('div', { className: 'space-y-1' },
        ...layouts.map(l =>
          el('button', {
            className: `w-full text-left px-3 py-2 text-xs font-bold transition border-2 ${slide.layout === l ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-500 hover:border-gray-300'}`,
            onClick: () => { slides[currentSlide].layout = l; saveSlides(); render(); }
          }, l.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()))
        )
      )
    ),
    el('div', {},
      el('p', { className: 'text-xs font-bold text-gray-400 uppercase tracking-wider mb-2' }, 'Slide Actions'),
      el('div', { className: 'space-y-2' },
        el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition', onClick: () => duplicateSlide(currentSlide) }, '⧉ Duplicate Slide'),
        el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition', onClick: () => moveSlide(currentSlide, -1) }, '↑ Move Up'),
        el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-gray-200 hover:border-gray-400 text-gray-600 transition', onClick: () => moveSlide(currentSlide, 1) }, '↓ Move Down'),
        slides.length > 1 ? el('button', { className: 'w-full px-3 py-2 text-xs font-bold border border-red-200 hover:border-red-400 text-red-500 transition', onClick: () => removeSlide(currentSlide) }, '🗑 Delete Slide') : null
      )
    )
  );

  return el('div', { className: 'flex h-[calc(100vh-57px)]' },
    // Slide list sidebar
    el('div', { className: 'w-48 border-r border-gray-200 overflow-y-auto bg-gray-50 flex flex-col flex-shrink-0' },
      !readonly ? el('div', { className: 'p-3 border-b border-gray-200' },
        el('button', { className: 'w-full py-2 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition', onClick: addSlide }, '+ Add Slide')
      ) : null,
      ...slides.map((s, i) =>
        el('div', {
          className: `relative cursor-pointer border-b border-gray-100 hover:bg-white transition ${i === currentSlide ? 'ring-2 ring-inset ring-black' : ''}`,
          onClick: () => { currentSlide = i; state._slidesCurrentIdx = i; render(); }
        },
          // Mini slide preview
          el('div', {
            className: 'h-20 w-full flex flex-col p-2 overflow-hidden',
            style: {
              backgroundColor: s.bgColor,
              backgroundImage: s.bgImage ? `url(${s.bgImage})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
            }
          },
            el('p', { className: 'text-[9px] font-bold truncate leading-tight', style: { color: s.textColor } }, s.title || `Slide ${i + 1}`),
            el('p', { className: 'text-[7px] mt-1 leading-tight opacity-70 line-clamp-3', style: { color: s.textColor } }, s.body)
          ),
          el('div', { className: 'px-2 py-1 bg-white border-t border-gray-100 flex justify-between items-center' },
            el('span', { className: 'text-[9px] font-bold text-gray-400' }, i + 1)
          )
        )
      )
    ),
    // Main canvas area
    el('div', { className: 'flex-1 flex flex-col items-center justify-center bg-gray-100 p-8 overflow-auto' },
      el('div', { className: 'w-full max-w-4xl' }, slideCanvas),
      el('div', { className: 'mt-4 flex gap-4 items-center' },
        el('button', { className: 'px-4 py-2 bg-white border border-gray-300 text-sm font-bold text-gray-500 hover:text-black hover:border-black transition', onClick: () => { if (currentSlide > 0) { currentSlide--; state._slidesCurrentIdx = currentSlide; render(); } } }, '← Prev'),
        el('span', { className: 'text-xs font-bold text-gray-400 uppercase' }, `${currentSlide + 1} / ${slides.length}`),
        el('button', { className: 'px-4 py-2 bg-white border border-gray-300 text-sm font-bold text-gray-500 hover:text-black hover:border-black transition', onClick: () => { if (currentSlide < slides.length - 1) { currentSlide++; state._slidesCurrentIdx = currentSlide; render(); } } }, 'Next →')
      )
    ),
    // Properties panel (right side)
    propertiesPanel
  );
}

