import { clampWindow, formatClock } from '../lib/windowPos.js';

const TASKBAR_H = 32;
const SVG_NS = 'http://www.w3.org/2000/svg';

// Little 16 x 16 pixel pictures drawn from rectangles: [x, y, w, h, colour].
const ICONS = {
  photos: [
    [1, 2, 14, 12, '#ffffff'], [2, 3, 12, 10, '#6db3ff'], [2, 9, 12, 4, '#3a9a3a'],
    [10, 4, 3, 3, '#ffe14d'], [4, 7, 4, 3, '#2f7f2f'], [5, 6, 2, 1, '#2f7f2f'],
  ],
  chess: [
    [1, 1, 14, 14, '#202020'],
    ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => [2 + c * 3, 2 + r * 3, 3, 3, (r + c) % 2 === 0 ? '#f0d9b5' : '#8b5a2b'])),
  ],
  start: [
    [1, 2, 6, 6, '#ff5050'], [8, 2, 6, 6, '#50c050'], [1, 9, 6, 6, '#5080ff'], [8, 9, 6, 6, '#ffd040'],
  ],
};

function icon(kind, size = 32) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  for (const [x, y, w, h, fill] of ICONS[kind] ?? ICONS.photos) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w);
    r.setAttribute('height', h);
    r.setAttribute('fill', fill);
    svg.appendChild(r);
  }
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The retro desktop shown when the visitor sits down at the computer.
 *
 * apps: [{ id, title, icon, size?: { w, h }, mount(container) }]. An app is mounted the first time its
 * window opens (so heavy things like the chess engine load only then); closing a window hides it and keeps its state.
 */
export function createDesktop({ root, apps, onShutDown = () => {}, now = () => new Date() }) {
  root.textContent = '';
  root.classList.add('desktop');

  const surface = el('div', 'desk-surface');
  const iconColumn = el('div', 'desk-icons');
  const windowLayer = el('div', 'desk-windows');
  const taskbar = el('div', 'taskbar');
  const startButton = el('button', 'start-button');
  startButton.type = 'button';
  startButton.append(icon('start', 16), el('span', '', 'Start'));
  const startMenu = el('div', 'start-menu');
  startMenu.hidden = true;
  const shutDown = el('button', 'start-item', 'Shut Down…');
  shutDown.type = 'button';
  startMenu.appendChild(shutDown);
  const taskButtons = el('div', 'task-buttons');
  const clock = el('div', 'clock');
  taskbar.append(startButton, taskButtons, clock);
  surface.append(iconColumn, windowLayer);
  root.append(surface, taskbar, startMenu);

  const wins = new Map(); // app id -> { app, node, body, task, pos, size, mounted }
  let zTop = 1;
  let opened = 0;
  let clockTimer = null;
  let open = false;

  const viewport = () => ({ w: root.clientWidth || window.innerWidth, h: root.clientHeight || window.innerHeight });

  function place(win) {
    const v = viewport();
    const size = {
      w: Math.min(win.size.w, Math.max(200, v.w - 20)),
      h: Math.min(win.size.h, Math.max(160, v.h - TASKBAR_H - 20)),
    };
    win.node.style.width = `${size.w}px`;
    win.node.style.height = `${size.h}px`;
    win.pos = clampWindow(win.pos, size, v, TASKBAR_H);
    win.node.style.left = `${win.pos.x}px`;
    win.node.style.top = `${win.pos.y}px`;
    win.renderedSize = size;
  }

  function focusWindow(win) {
    win.node.style.zIndex = String(++zTop);
    for (const w of wins.values()) {
      w.node.classList.toggle('active', w === win);
      w.task.classList.toggle('active', w === win);
    }
  }

  function closeWindow(win) {
    win.node.hidden = true;
    win.task.hidden = true;
    win.node.classList.remove('active');
  }

  function startDrag(win, e) {
    if (e.button !== 0 || e.target.closest('.win-close')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...win.pos };
    const bar = e.currentTarget;
    try {
      bar.setPointerCapture(e.pointerId); // keeps the drag going if the pointer leaves the title bar
    } catch {
      // not an active pointer (for example a scripted event); dragging still works while it stays over the bar
    }
    const move = (ev) => {
      win.pos = clampWindow({ x: origin.x + ev.clientX - startX, y: origin.y + ev.clientY - startY }, win.renderedSize, viewport(), TASKBAR_H);
      win.node.style.left = `${win.pos.x}px`;
      win.node.style.top = `${win.pos.y}px`;
    };
    const end = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', end);
      bar.removeEventListener('pointercancel', end);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  function build(app) {
    const node = el('section', 'win');
    node.setAttribute('aria-label', app.title);
    const bar = el('div', 'win-title');
    const closeButton = el('button', 'win-close', '×');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', `Close ${app.title}`);
    bar.append(icon(app.icon, 16), el('span', 'win-title-text', app.title), closeButton);
    const body = el('div', 'win-body');
    node.append(bar, body);
    windowLayer.appendChild(node);

    const task = el('button', 'task-button');
    task.type = 'button';
    task.append(icon(app.icon, 16), el('span', '', app.title));
    taskButtons.appendChild(task);

    const win = {
      app, node, body, task, mounted: false, renderedSize: app.size ?? { w: 420, h: 360 },
      size: app.size ?? { w: 420, h: 360 },
      pos: { x: 130 + opened * 34, y: 30 + opened * 34 },
    };
    opened += 1;
    bar.addEventListener('pointerdown', (e) => startDrag(win, e));
    node.addEventListener('pointerdown', () => focusWindow(win));
    closeButton.addEventListener('click', () => closeWindow(win));
    task.addEventListener('click', () => focusWindow(win));
    wins.set(app.id, win);
    return win;
  }

  function openApp(id) {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const win = wins.get(id) ?? build(app);
    win.node.hidden = false;
    win.task.hidden = false;
    place(win);
    if (!win.mounted) {
      win.mounted = true;
      app.mount(win.body);
    }
    focusWindow(win);
    startMenu.hidden = true;
  }

  for (const app of apps) {
    const button = el('button', 'desk-icon');
    button.type = 'button';
    button.append(icon(app.icon, 32), el('span', '', app.title));
    button.addEventListener('click', () => {
      for (const b of iconColumn.children) b.classList.toggle('selected', b === button);
    });
    button.addEventListener('dblclick', () => openApp(app.id));
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openApp(app.id);
      }
    });
    iconColumn.appendChild(button);
  }

  startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.hidden = !startMenu.hidden;
  });
  shutDown.addEventListener('click', () => {
    startMenu.hidden = true;
    onShutDown();
  });
  surface.addEventListener('pointerdown', () => {
    startMenu.hidden = true;
  });

  const tick = () => {
    clock.textContent = formatClock(now());
  };
  const onResize = () => {
    for (const w of wins.values()) if (!w.node.hidden) place(w);
  };

  return {
    open() {
      open = true;
      root.hidden = false;
      onResize(); // the screen may have changed size while it was closed
      startMenu.hidden = true;
      tick();
      clockTimer = setInterval(tick, 15000);
      window.addEventListener('resize', onResize);
      iconColumn.firstElementChild?.focus();
    },
    close() {
      open = false;
      root.hidden = true;
      clearInterval(clockTimer);
      window.removeEventListener('resize', onResize);
    },
    isOpen: () => open,
  };
}
