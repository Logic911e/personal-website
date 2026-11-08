import Phaser from 'phaser';
import { parseRoom, nearestInteractable } from '../lib/room.js';
import { stepPlayer } from '../lib/movement.js';
import { INTERACT_REACH } from '../config.js';

const BASE = import.meta.env.BASE_URL;
const PLAYER_SIZE = 12;

export default class RoomScene extends Phaser.Scene {
  constructor() {
    super('room');
    this.inputEnabled = true;
    this.nearBoard = false;
  }

  preload() {
    this.load.tilemapTiledJSON('room', `${BASE}assets/room.json`);
    this.load.image('tiles', `${BASE}assets/tiles.png`);
  }

  create() {
    this.room = parseRoom(this.cache.tilemap.get('room').data);

    const map = this.make.tilemap({ key: 'room' });
    const tileset = map.addTilesetImage('tiles', 'tiles');
    map.createLayer('floor', tileset, 0, 0);
    if (map.layers.some((l) => l.name === 'furniture')) map.createLayer('furniture', tileset, 0, 0);

    for (const { rect, color, label } of this.room.decor) {
      this.add.rectangle(rect.x, rect.y, rect.w, rect.h, Phaser.Display.Color.HexStringToColor(color).color).setOrigin(0, 0);
      if (label) {
        this.add
          .text(rect.x + rect.w / 2, rect.y + rect.h / 2, label, { fontFamily: 'monospace', fontSize: '8px', color: '#000' })
          .setOrigin(0.5);
      }
    }

    this.player = { x: this.room.spawn.x, y: this.room.spawn.y, w: PLAYER_SIZE, h: PLAYER_SIZE };
    this.playerSprite = this.add.rectangle(this.player.x, this.player.y, PLAYER_SIZE, PLAYER_SIZE, 0xff66cc).setOrigin(0, 0);
    this.playerSprite.setStrokeStyle(1, 0xffffff);

    this.cameras.main.setBounds(0, 0, this.room.widthPx, this.room.heightPx);

    this.keys = this.input.keyboard.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', a: 'A', s: 'S', d: 'D',
    });
  }

  /** Turn movement on or off (off while the project board is open). */
  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    // Also release the arrow keys so the board panel can scroll with them.
    this.input.keyboard.enabled = enabled;
    // Forget any key held when the panel opened, so a key released while the
    // panel is open cannot stay "down" and make the player drift afterwards.
    if (!enabled) this.input.keyboard.resetKeys();
  }

  update(_time, delta) {
    if (this.inputEnabled) {
      const k = this.keys;
      const dir = {
        x: (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0),
        y: (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0),
      };
      this.player = stepPlayer(this.player, dir, delta, this.room.solids);
      this.playerSprite.setPosition(this.player.x, this.player.y);
    }

    const near = nearestInteractable(this.player, this.room.interactables, INTERACT_REACH);
    const nearBoard = near?.name === 'board';
    if (nearBoard !== this.nearBoard) {
      this.nearBoard = nearBoard;
      this.game.events.emit('near-board', nearBoard);
    }
  }
}
