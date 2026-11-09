import * as THREE from 'three';
import { buildRoom } from './buildRoom.js';
import { makeNoteTexture } from './noteTexture.js';
import { solidRects } from '../lib/roomLayout.js';
import { stepPlayer } from '../lib/movement.js';
import { applyLook, moveDir } from '../lib/look.js';
import { layoutNotes, noteLabel, pickTarget } from '../lib/board.js';
import { EYE_HEIGHT, FOV, PLAYER_SIZE, WALK_SPEED } from '../config.js';

const KEY_MAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};
const noop = () => {};

export class World {
  /**
   * @param {HTMLElement} container  element the canvas is added to
   * @param {object} layout          a parsed RoomLayout
   * @param {Array} projects         parsed projects, one note each
   *
   * Callbacks to assign before start():
   *   onLockChange(locked), onFocusTarget(target | null), onActivateTarget(target), onLockUnavailable()
   * A target is a note index (the project index, or -1 for the "See all projects" note) or 'computer'.
   */
  constructor(container, layout, projects) {
    this.container = container;
    this.layout = layout;
    this.projects = projects;
    this.solids = solidRects(layout);
    this.yaw = layout.spawn.yaw;
    this.pitch = 0;
    this.position = { x: layout.spawn.x, z: layout.spawn.z };
    this.keys = { forward: false, back: false, left: false, right: false };
    this.paused = true; // movement and looking wait for the mouse lock
    this.locked = false;
    this.focused = null;
    this.onLockChange = noop;
    this.onFocusTarget = noop;
    this.onActivateTarget = noop;
    this.onLockUnavailable = noop;
    this._frame = null;
    this._lastTime = 0;
    this._targetMeshes = []; // everything the crosshair can pick: the notes and the monitor
  }

  start() {
    // No antialiasing and a capped pixel ratio keep the edges blocky and the page light.
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1b1b20');
    this.scene.add(buildRoom(this.layout));
    this._buildNotes();
    this._markMonitor();

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
    this.camera.rotation.order = 'YXZ'; // yaw first, then pitch, so looking never rolls
    this._applyPose();
    this.raycaster = new THREE.Raycaster();

    this._listen(window, 'resize', () => this._resize());
    this._listen(document, 'pointerlockchange', () => this._onLockChange());
    this._listen(document, 'pointerlockerror', () => this._lockUnavailable());
    this._listen(document, 'mousemove', (e) => this._onMouseMove(e));
    this._listen(window, 'keydown', (e) => this._onKeyDown(e));
    this._listen(window, 'keyup', (e) => this._onKeyUp(e));
    this._resize();

    const loop = (now) => {
      this._frame = requestAnimationFrame(loop);
      const dt = this._lastTime ? now - this._lastTime : 16;
      this._lastTime = now;
      this._update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this._frame = requestAnimationFrame(loop);
  }

  /** Ask the browser to capture the mouse. Must be called from a click or key press. */
  lock() {
    const canvas = this.renderer.domElement;
    this._reportedUnavailable = false;
    if (!canvas.requestPointerLock) {
      this._lockUnavailable();
      return;
    }
    try {
      const result = canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') result.catch(() => this._lockUnavailable());
    } catch {
      this._lockUnavailable();
    }
  }

  // A refused lock is reported by both the returned promise and the browser's error event;
  // tell the caller once per attempt.
  _lockUnavailable() {
    if (this._reportedUnavailable) return;
    this._reportedUnavailable = true;
    this.onLockUnavailable();
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) this._clearKeys();
  }

  /** Put the camera somewhere specific (used for checking the room). */
  setPose(x, z, yaw, pitch = 0) {
    this.position = { x, z };
    this.yaw = yaw;
    this.pitch = pitch;
    this._applyPose();
  }

  dispose() {
    cancelAnimationFrame(this._frame);
    for (const [target, type, handler] of this._listeners ?? []) target.removeEventListener(type, handler);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---- internals ----

  _listen(target, type, handler) {
    (this._listeners ??= []).push([target, type, handler]);
    target.addEventListener(type, handler);
  }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    this.paused = !this.locked;
    // Whatever was held when the lock was lost can never see its key-up, so forget it.
    if (!this.locked) this._clearKeys();
    this.onLockChange(this.locked);
  }

  _clearKeys() {
    for (const k of Object.keys(this.keys)) this.keys[k] = false;
  }

  _onMouseMove(e) {
    if (!this.locked || this.paused) return;
    const next = applyLook({ yaw: this.yaw, pitch: this.pitch }, e.movementX, e.movementY);
    this.yaw = next.yaw;
    this.pitch = next.pitch;
  }

  _onKeyDown(e) {
    const dir = KEY_MAP[e.code];
    if (dir && !this.paused) {
      this.keys[dir] = true;
      if (e.code.startsWith('Arrow')) e.preventDefault();
    } else if (e.code === 'KeyE' && !e.repeat && !this.paused && this.focused !== null) {
      this.onActivateTarget(this.focused);
    }
  }

  _onKeyUp(e) {
    const dir = KEY_MAP[e.code];
    if (dir) this.keys[dir] = false;
  }

  _update(dtMs) {
    if (!this.paused) {
      const dir = moveDir(this.keys, this.yaw);
      if (dir.x !== 0 || dir.y !== 0) {
        const half = PLAYER_SIZE / 2;
        const from = { x: this.position.x - half, y: this.position.z - half, w: PLAYER_SIZE, h: PLAYER_SIZE };
        const to = stepPlayer(from, dir, dtMs, this.solids, WALK_SPEED);
        this.position = { x: to.x + half, z: to.y + half };
      }
    }
    this._applyPose();
    this._updateFocus();
  }

  _applyPose() {
    this.camera.position.set(this.position.x, EYE_HEIGHT, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  _resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _buildNotes() {
    const { center } = this.layout.board;
    const slots = layoutNotes(this.projects.length);
    const wallFace = 0.045; // just in front of the 0.04 m thick board, on the left wall

    for (const slot of slots) {
      const label =
        slot.kind === 'project' ? noteLabel(this.projects[slot.index].title)
        : slot.kind === 'more' ? 'See all projects'
        : 'No projects yet';

      // The group faces +x (into the room); u (right, as seen from inside) runs toward -z.
      const group = new THREE.Object3D();
      group.position.set(wallFace, center.y + slot.v, center.z - slot.u);
      group.rotation.y = Math.PI / 2;

      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(slot.w, slot.h),
        new THREE.MeshBasicMaterial({ map: makeNoteTexture(label) }),
      );
      paper.rotation.z = slot.tilt;
      if (slot.kind !== 'empty') {
        paper.userData.target = slot.index;
        paper.userData.highlight = { color: '#ffe28a', scale: 1.08 };
      }
      group.add(paper);

      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: '#d33a3a' }));
      pin.position.set(0, slot.h / 2 - 0.03, 0.012);
      paper.add(pin);

      this.scene.add(group);
      if (slot.kind !== 'empty') this._targetMeshes.push(paper);
    }
  }

  // The monitor on the desk opens the computer. It gets its own material so lighting it up never tints other boxes.
  _markMonitor() {
    const screen = this.scene.getObjectByName('monitor-screen');
    if (!screen) return;
    screen.material = screen.material.clone();
    screen.userData.target = 'computer';
    screen.userData.base = screen.material.color.getHex();
    screen.userData.highlight = { color: '#7fe0e0', scale: 1 };
    this._targetMeshes.push(screen);
  }

  _updateFocus() {
    let next = null;
    if (!this.paused) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const hits = this.raycaster
        .intersectObjects(this._targetMeshes, false) // not the pins stuck on the notes
        .map((h) => ({ distance: h.distance, target: h.object.userData.target }));
      next = pickTarget(hits);
    }
    if (next === this.focused) return;
    this.focused = next;
    for (const mesh of this._targetMeshes) {
      const on = mesh.userData.target === next;
      const { color, scale } = mesh.userData.highlight;
      if (on) mesh.material.color.set(color);
      else if (mesh.userData.base !== undefined) mesh.material.color.setHex(mesh.userData.base);
      else mesh.material.color.set('#ffffff');
      mesh.scale.setScalar(on ? scale : 1);
    }
    this.onFocusTarget(next);
  }
}
