/** The address to load a photo from: web addresses as they are, local paths under the site's base. */
export function resolveSrc(src, base = '') {
  if (/^https?:\/\//i.test(src)) return src;
  return `${base}${src.replace(/^\.?\//, '')}`;
}

/** Which photo the Photos window is showing, with no page in sight so it can be tested alone. */
export function createPhotosController(photos) {
  const count = photos.length;
  let view = 'grid';
  let index = null;

  return {
    state: () => ({ view, index, count }),
    open(i) {
      if (!Number.isInteger(i) || i < 0 || i >= count) return;
      view = 'viewer';
      index = i;
    },
    next() {
      if (view === 'viewer') index = (index + 1) % count;
    },
    prev() {
      if (view === 'viewer') index = (index - 1 + count) % count;
    },
    back() {
      view = 'grid';
      index = null;
    },
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A picture that falls back to a plain "Photo unavailable" box if the file will not load.
function pictureFor(photo, base, className) {
  const img = document.createElement('img');
  img.className = className;
  img.alt = photo.caption || 'Photo';
  img.src = resolveSrc(photo.src, base);
  img.addEventListener('error', () => img.replaceWith(el('div', `${className} photo-missing`, 'Photo unavailable')));
  return img;
}

/** Draw the Photos window inside `container`. Captions are set as text, never as HTML. */
export function mountPhotosApp(container, photos, { base = '' } = {}) {
  container.textContent = '';
  const root = el('div', 'photos-app');
  container.appendChild(root);
  const controller = createPhotosController(photos);

  function render() {
    root.textContent = '';
    const s = controller.state();
    if (s.count === 0) {
      root.appendChild(el('p', 'photos-empty', 'No photos yet'));
      return;
    }
    if (s.view === 'grid') {
      const grid = el('div', 'photos-grid');
      photos.forEach((photo, i) => {
        const cell = el('button', 'photo-thumb');
        cell.type = 'button';
        cell.setAttribute('aria-label', photo.caption || `Photo ${i + 1}`);
        cell.appendChild(pictureFor(photo, base, 'photo-img'));
        cell.appendChild(el('span', 'photo-caption', photo.caption));
        cell.addEventListener('click', () => {
          controller.open(i);
          render();
        });
        grid.appendChild(cell);
      });
      root.appendChild(grid);
      return;
    }
    const photo = photos[s.index];
    const viewer = el('div', 'photo-viewer');
    viewer.appendChild(pictureFor(photo, base, 'photo-large'));
    viewer.appendChild(el('p', 'photo-caption-large', photo.caption));
    const bar = el('div', 'photo-bar');
    for (const [label, action] of [
      ['Back', () => controller.back()],
      ['Previous', () => controller.prev()],
      ['Next', () => controller.next()],
    ]) {
      const button = el('button', 'win-button', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        action();
        render();
      });
      bar.appendChild(button);
    }
    bar.appendChild(el('span', 'photo-count', `${s.index + 1} of ${s.count}`));
    viewer.appendChild(bar);
    root.appendChild(viewer);
  }

  render();
  return {
    dispose() {
      container.textContent = '';
    },
  };
}
