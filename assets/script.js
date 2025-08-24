/* Optional: smooth scroll for internal links */
document.querySelectorAll('a[href^="#"]').forEach(a => {
a.addEventListener('click', e => {
const target = document.querySelector(a.getAttribute('href'));
if (target) {
e.preventDefault();
target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
});
});

/* Helper to swap placeholders with images later */
function setProjectImage(id, src, alt) {
const el = document.getElementById(id);
if (!el) return;
if (src) {
el.outerHTML = '<img src="' + src + '" alt="' + (alt || 'project image') + '">';
}
}

window.Portfolio = window.Portfolio || {};
window.Portfolio.setProjectImage = setProjectImage;

// ----- Simple Gallery (no deps) -----
(function() {
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function buildModal() {
    const modal = createEl('div', { class: 'gallery-modal', id: 'gallery-modal', role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true' });

    const title = createEl('div', { class: 'gallery-title', id: 'gallery-title', text: '' });
    const closeBtn = createEl('button', { class: 'gallery-close', 'aria-label': 'Close gallery', title: 'Close (Esc)' });
    closeBtn.innerHTML = '&times;';

    const header = createEl('div', { class: 'gallery-header' }, [title, closeBtn]);

    const prev = createEl('button', { class: 'gallery-arrow', id: 'gallery-prev', 'aria-label': 'Previous image', title: 'Prev (←)' });
    prev.textContent = '←';
    const next = createEl('button', { class: 'gallery-arrow', id: 'gallery-next', 'aria-label': 'Next image', title: 'Next (→)' });
    next.textContent = '→';

    const img = createEl('img', { id: 'gallery-image', alt: '' });
    const caption = createEl('div', { class: 'gallery-caption', id: 'gallery-caption', text: '' });
    const figure = createEl('div', { class: 'gallery-figure' }, [img, caption]);

    const body = createEl('div', { class: 'gallery-body' }, [prev, figure, next]);

    const pager = createEl('div', { class: 'gallery-pager', id: 'gallery-pager', text: '' });
    const footer = createEl('div', { class: 'gallery-footer' }, [pager]);

    const thumbs = createEl('div', { class: 'gallery-thumbs', id: 'gallery-thumbs' });

    const inner = createEl('div', { class: 'gallery-inner' }, [header, body, footer, thumbs]);
    modal.appendChild(inner);
    document.body.appendChild(modal);
    return modal;
  }

  let modal, state = { items: [], index: 0, title: '' };

  function ensureModal() {
    if (!modal) modal = buildModal();
    return modal;
  }

  function render() {
    const m = ensureModal();
    const item = state.items[state.index];
    const img = m.querySelector('#gallery-image');
    const cap = m.querySelector('#gallery-caption');
    const pager = m.querySelector('#gallery-pager');
    const title = m.querySelector('#gallery-title');
    const thumbs = m.querySelector('#gallery-thumbs');

    img.src = item.src;
    img.alt = item.alt || item.caption || 'image';
    cap.textContent = item.caption || '';
    pager.textContent = `${state.index + 1} / ${state.items.length}`;
    title.textContent = state.title || 'Gallery';

    // thumbs
    thumbs.innerHTML = '';
    state.items.forEach((it, i) => {
      const th = createEl('div', { class: 'gallery-thumb' + (i === state.index ? ' active' : '') });
      const ti = createEl('img', { src: it.thumb || it.src, alt: it.alt || `thumb ${i+1}` });
      th.appendChild(ti);
      th.addEventListener('click', () => { state.index = i; render(); });
      thumbs.appendChild(th);
    });
  }

  function open(items, title, startIndex = 0) {
    state.items = items; state.index = startIndex || 0; state.title = title || '';
    const m = ensureModal();
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    render();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function next() {
    state.index = (state.index + 1) % state.items.length; render();
  }
  function prev() {
    state.index = (state.index - 1 + state.items.length) % state.items.length; render();
  }

  // Events
  document.addEventListener('click', (e) => {
    // Close when clicking backdrop
    if (e.target.classList && e.target.classList.contains('gallery-modal')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Wire buttons when modal exists
  document.addEventListener('click', (e) => {
    if (!modal || !modal.classList.contains('open')) return;
    if (e.target.id === 'gallery-next') next();
    if (e.target.id === 'gallery-prev') prev();
    if (e.target.classList.contains('gallery-close')) close();
  });

  // Public API
  window.Portfolio = window.Portfolio || {};
  window.Portfolio.openGallery = open;

  // Helper: bind a gallery-cover to data defined in HTML
  window.Portfolio.bindGalleryFromElement = function(coverEl) {
    const galleryId = coverEl.getAttribute('data-gallery');
    if (!galleryId) return;
    const dataEl = document.getElementById(galleryId);
    if (!dataEl) return;

    // Parse items from child <figure data-src ... data-caption ... />
    const items = Array.from(dataEl.querySelectorAll('figure')).map(fig => ({
      src: fig.getAttribute('data-src'),
      thumb: fig.getAttribute('data-thumb') || fig.getAttribute('data-src'),
      caption: fig.getAttribute('data-caption') || '',
      alt: fig.getAttribute('data-alt') || ''
    })).filter(x => x.src);

    const title = dataEl.getAttribute('data-title') || coverEl.getAttribute('data-title') || 'Gallery';
    coverEl.addEventListener('click', () => open(items, title, 0));
  };

/* --- Gallery image click-to-zoom --- */
(function () {
  const ZOOM_SCALE = 2.2;      // desktop zoom
  const ZOOM_MOBILE = 1.6;     // smaller zoom on small screens
  let img, frame, zoomed = false;

  function getScale() {
    return (window.matchMedia && window.matchMedia('(max-width: 720px)').matches)
      ? ZOOM_MOBILE
      : ZOOM_SCALE;
  }

  function ensureRefs() {
    img = document.getElementById('gallery-image');
    frame = img ? img.closest('.gallery-figure') : null;
    return !!(img && frame);
  }

  function getPointerPos(e, rect) {
    if (e.touches && e.touches.length) {
      const t = e.touches;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMove(e) {
    if (!zoomed || !img || !frame) return;
    const rect = frame.getBoundingClientRect();
    const { x, y } = getPointerPos(e, rect);
    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));
    img.style.transformOrigin = `${(px * 100).toFixed(2)}% ${(py * 100).toFixed(2)}%`;
  }

  function toggleZoom(e) {
    if (!ensureRefs()) return;
    zoomed = !zoomed;
    if (zoomed) {
      img.classList.add('zoomed');
      img.style.transform = `scale(${getScale()})`;
      // set origin immediately at click/touch position
      onMove(e);
      frame.addEventListener('mousemove', onMove);
      frame.addEventListener('touchmove', onMove, { passive: true });
    } else {
      img.classList.remove('zoomed');
      img.style.transform = '';
      img.style.transformOrigin = '';
      frame.removeEventListener('mousemove', onMove);
      frame.removeEventListener('touchmove', onMove);
    }
  }

  // Click (or tap) to toggle zoom
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (target && target.id === 'gallery-image') {
      toggleZoom(e);
    } else if (zoomed) {
      // clicking outside the image while zoomed exits zoom
      toggleZoom(e);
    }
  });

  // Esc exits zoom
  document.addEventListener('keydown', function (e) {
    if (zoomed && e.key === 'Escape') toggleZoom(e);
  });

  // Reset zoom whenever a new image is rendered (watch src changes)
  const obs = new MutationObserver(() => {
    if (!img) return;
    zoomed = false;
    img.classList.remove('zoomed');
    img.style.transform = '';
    img.style.transformOrigin = '';
  });

  window.addEventListener('DOMContentLoaded', () => {
    ensureRefs();
    if (img) obs.observe(img, { attributes: true, attributeFilter: ['src'] });
  });
})();

  
})();
