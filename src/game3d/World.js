import * as THREE from 'three';
import { buildRoom } from './buildRoom.js';
import { EYE_HEIGHT, FOV } from '../config.js';

export class World {
  /**
   * @param {HTMLElement} container  element the canvas is added to
   * @param {object} layout          a parsed RoomLayout
   * @param {Array} projects         parsed projects (used by the board in a later task)
   */
  constructor(container, layout, projects) {
    this.container = container;
    this.layout = layout;
    this.projects = projects;
    this.yaw = layout.spawn.yaw;
    this.pitch = 0;
    this.position = { x: layout.spawn.x, z: layout.spawn.z };
    this._frame = null;
  }

  start() {
    // No antialiasing and a capped pixel ratio keep the edges blocky and the page light.
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1b1b20');
    this.scene.add(buildRoom(this.layout));

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
    this.camera.rotation.order = 'YXZ'; // yaw first, then pitch, so looking never rolls
    this._applyPose();

    this._onResize = () => this._resize();
    window.addEventListener('resize', this._onResize);
    this._resize();

    const loop = () => {
      this._frame = requestAnimationFrame(loop);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  /** Put the camera somewhere specific (used for checking the room, and by later tasks). */
  setPose(x, z, yaw, pitch = 0) {
    this.position = { x, z };
    this.yaw = yaw;
    this.pitch = pitch;
    this._applyPose();
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

  dispose() {
    cancelAnimationFrame(this._frame);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
