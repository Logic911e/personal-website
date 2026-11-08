import Phaser from 'phaser';
import RoomScene from './game/RoomScene.js';
import { shouldUseFallback } from './lib/viewport.js';
import { loadMuted, saveMuted } from './lib/mute.js';
import { MUSIC_URL } from './config.js';
import { parseProjects } from './lib/projects.js';
import { createBoardPanel } from './ui/boardPanel.js';
import projectsData from './data/projects.json';

const BASE = import.meta.env.BASE_URL;
const ROOM_W = 224; // internal resolution = the placeholder room size (14 x 22 tiles of 16px)
const ROOM_H = 352;

const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
if (shouldUseFallback({ width: window.innerWidth, touchOnly })) {
  window.location.replace(`${BASE}fallback.html`);
}

const enterScreen = document.getElementById('enter');
const gameBox = document.getElementById('game');
const muteBtn = document.getElementById('mute-btn');

let muted = loadMuted();
const music = new Audio(`${BASE}${MUSIC_URL}`);
music.loop = true;

function renderMute() {
  music.muted = muted;
  muteBtn.textContent = muted ? 'Sound: off' : 'Sound: on';
  muteBtn.setAttribute('aria-pressed', String(muted));
}

function wholeNumberZoom() {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / ROOM_W, window.innerHeight / ROOM_H)));
}

function startGame() {
  enterScreen.style.display = 'none';
  gameBox.style.display = 'flex';
  muteBtn.style.display = 'block';

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameBox,
    width: ROOM_W,
    height: ROOM_H,
    pixelArt: true,
    backgroundColor: '#1a1424',
    scale: { mode: Phaser.Scale.NONE, zoom: wholeNumberZoom() },
    scene: [RoomScene],
  });
  window.addEventListener('resize', () => game.scale.setZoom(wholeNumberZoom()));

  const panel = createBoardPanel(document.getElementById('board-panel'), parseProjects(projectsData));
  const prompt = document.getElementById('board-prompt');
  let nearBoard = false;

  function showPrompt() {
    prompt.hidden = !(nearBoard && !panel.isOpen());
  }
  function setBoardOpen(open) {
    if (open) panel.open();
    else panel.close();
    game.scene.getScene('room').setInputEnabled(!open);
    showPrompt();
  }

  game.events.on('near-board', (near) => {
    nearBoard = near;
    showPrompt();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'e' || e.key === 'E') && nearBoard && !panel.isOpen()) setBoardOpen(true);
    else if (e.key === 'Escape' && panel.isOpen()) setBoardOpen(false);
  });
  document.querySelector('#board-panel .panel-close').addEventListener('click', () => setBoardOpen(false));

  renderMute();
  music.play().catch(() => {
    // autoplay refused: the mute button still lets the visitor try again
  });
}

document.getElementById('enter-btn').addEventListener('click', startGame);
muteBtn.addEventListener('click', () => {
  muted = !muted;
  saveMuted(muted);
  renderMute();
  if (!muted && music.paused) music.play().catch(() => {});
});
