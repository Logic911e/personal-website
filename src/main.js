import './computer/desktop.css';
import { World } from './game3d/World.js';
import { parseRoomLayout } from './lib/roomLayout.js';
import { parseProjects } from './lib/projects.js';
import { parsePhotos } from './lib/photos.js';
import { createDesktop } from './computer/desktop.js';
import { createEngine } from './computer/engine.js';
import { mountChessApp } from './computer/chessApp.js';
import { mountPhotosApp } from './computer/photosApp.js';
import { renderProjectCardHtml } from './lib/projectHtml.js';
import { shouldUseFallback, needsKeyboardMouse } from './lib/viewport.js';
import { loadMuted, saveMuted, effectiveMuted } from './lib/mute.js';
import { MUSIC_URL } from './config.js';
import roomData from './data/room.json';
import projectsData from './data/projects.json';
import photosData from './data/photos.json';

const BASE = import.meta.env.BASE_URL;
const FALLBACK = `${BASE}fallback.html`;
const $ = (id) => document.getElementById(id);

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function showMessage(text) {
  $('message-text').textContent = text;
  $('message').hidden = false;
}

const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const forceGame = new URLSearchParams(window.location.search).get('game') === '1';

if (shouldUseFallback({ width: window.innerWidth, touchOnly, forceGame })) {
  window.location.replace(FALLBACK); // small screens and phones get the plain list
} else if (needsKeyboardMouse({ touchOnly, forceGame })) {
  showMessage('This room needs a keyboard and a mouse.');
} else if (!webglAvailable()) {
  window.location.replace(FALLBACK); // no 3D support in this browser
} else {
  init();
}

function init() {
  // Check the data before anything is shown, so bad data cannot leave a half-started page.
  const layout = parseRoomLayout(roomData);
  const projects = parseProjects(projectsData);
  const photos = parsePhotos(photosData);

  // ---- Music and mute ----
  let userMuted = loadMuted();
  const music = new Audio(`${BASE}${MUSIC_URL}`);
  music.loop = true;
  const muteBtn = $('mute-btn');

  function applyAudio() {
    music.muted = effectiveMuted(userMuted, document.hidden); // hiding the tab never changes the saved choice
    muteBtn.textContent = userMuted ? 'Sound: off' : 'Sound: on';
    muteBtn.setAttribute('aria-pressed', String(userMuted));
  }
  muteBtn.addEventListener('click', () => {
    userMuted = !userMuted;
    saveMuted(userMuted);
    applyAudio();
    if (!userMuted && music.paused) music.play().catch(() => {});
  });
  document.addEventListener('visibilitychange', applyAudio);

  // ---- The room ----
  const prompt = $('note-prompt');
  const card = $('card');
  const resume = $('resume');
  let world = null;
  let cardOpen = false;
  let computerOpen = false;
  let desktop = null;
  let everLocked = false;
  let focusedTarget = null; // a note index, 'computer', or null

  function updatePrompt() {
    if (focusedTarget === null || cardOpen || computerOpen) {
      prompt.hidden = true;
      return;
    }
    const title =
      focusedTarget === 'computer' ? 'Use the computer'
      : focusedTarget === -1 ? 'See all projects'
      : projects[focusedTarget].title;
    prompt.textContent = `Press E: ${title}`; // textContent, so markup in a title stays plain text
    prompt.hidden = false;
  }

  function openComputer() {
    if (!desktop) {
      // Created on first use. The chess engine is only asked to load when the Chess window first opens.
      const engine = createEngine({ workerUrl: `${BASE}assets/stockfish/stockfish.wasm.js` });
      desktop = createDesktop({
        root: $('computer'),
        onShutDown: closeComputer,
        apps: [
          { id: 'photos', title: 'Photos', icon: 'photos', size: { w: 470, h: 400 }, mount: (c) => mountPhotosApp(c, photos, { base: BASE }) },
          { id: 'chess', title: 'Chess', icon: 'chess', size: { w: 380, h: 490 }, mount: (c) => mountChessApp(c, { engine }) },
        ],
      });
    }
    computerOpen = true; // set first: letting go of the mouse below must not show "Click to resume"
    world.unlock();
    world.setPaused(true);
    desktop.open();
    updatePrompt();
  }

  function closeComputer() {
    if (!computerOpen) return;
    computerOpen = false;
    desktop.close();
    resume.hidden = false; // browsers only allow capturing the mouse again after a click
    resume.focus();
    updatePrompt();
  }

  function openCard(index) {
    cardOpen = true;
    card.querySelector('.panel-body').innerHTML = renderProjectCardHtml(projects[index]);
    card.hidden = false;
    world.unlock(); // free the mouse so the link and button work
    world.setPaused(true);
    updatePrompt();
    card.querySelector('.panel-close').focus();
  }

  function closeCard() {
    if (!cardOpen) return;
    cardOpen = false;
    card.hidden = true;
    resume.hidden = false; // browsers only allow capturing the mouse again after a click
    resume.focus();
    updatePrompt();
  }

  function startRoom() {
    if (world) return; // a double-click on Enter must not start a second room
    $('enter').hidden = true;
    $('world').hidden = false;
    $('crosshair').hidden = false;
    muteBtn.hidden = false;
    applyAudio();

    world = new World($('world'), layout, projects);
    world.onFocusTarget = (target) => {
      focusedTarget = target;
      updatePrompt();
    };
    world.onActivateTarget = (target) => {
      if (target === 'computer') openComputer();
      else if (target === -1) window.location.href = FALLBACK;
      else openCard(target);
    };
    world.onLockChange = (locked) => {
      if (locked) {
        everLocked = true;
        resume.hidden = true;
      } else if (!cardOpen && !computerOpen) {
        resume.hidden = false; // Esc, alt-tab, or any other way of losing the mouse
      }
    };
    world.onLockUnavailable = () => {
      // The very first refusal means this browser will not run the room at all. After a successful
      // lock, a refusal is usually just "too soon after Esc", so keep the resume button up instead.
      if (!everLocked) showMessage('Your browser would not let the room capture the mouse.');
    };
    world.start();
    world.lock();
    music.play().catch(() => {});
  }

  $('enter-btn').addEventListener('click', startRoom);
  resume.addEventListener('click', () => world.lock());
  card.querySelector('.panel-close').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (computerOpen) closeComputer();
    else if (cardOpen) closeCard();
  });
}
