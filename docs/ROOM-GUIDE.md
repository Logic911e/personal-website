# Room guide

The 3D bedroom is described by one file, `src/data/room.json`. Edit it and
reload; no game code needs to change. If the file is wrong, the page stops with a
message naming the box or field (and `npm run build` fails the same way).

## Directions and units

Everything is in **metres**. The room interior is 3.5 m wide (x), 5.5 m long
(z) and 2.4 m high (y).

```
          back wall  z = 0   (bed, window)
   x = 0  +-----------------------+  x = 3.5
  (left)  |                       |  (right)
 board    |                       |  desk
          |                       |
          +---------[door]--------+
          door wall  z = 5.5
```

- `x` grows toward the right wall, `z` toward the door, `y` upward.
- The visitor starts just inside the door looking at the back wall, so the
  left wall is on their left.

## The file

```json
{
  "size":  { "w": 3.5, "l": 5.5, "h": 2.4 },
  "unit":  0.25,
  "spawn": { "x": 1.2, "z": 5.0, "yaw": 0 },
  "board": { "center": { "z": 3.1, "y": 1.4 }, "w": 1.5, "h": 1.0 },
  "boxes": [ ... ]
}
```

- `spawn` is where the camera starts (the centre of the player). `yaw` 0 looks
  at the back wall; positive turns left.
- `board` says where the project notes go on the left wall: `center.z` and
  `center.y` are the middle of the board, `w` is its length along the wall.
  The pinboard itself is the box named `board`; keep the two in step.

## Boxes

Everything in the room is a box:

```json
{"name":"desk-body","x":2.8,"y":0,"z":2.2,"w":0.7,"h":0.72,"d":1.7,"color":"#ddd8cc","solid":true}
```

| Field | Meaning |
| --- | --- |
| `name` | Unique. Names starting with `wall`, `floor` or `ceiling` may sit outside the room; every other box must be inside it |
| `x`, `y`, `z` | The corner of the box with the smallest x, y and z |
| `w`, `h`, `d` | Size along x, y (height) and z |
| `color` | `#rrggbb` |
| `solid` | `true` stops the player walking through it; `false` is for looks only |

Tips:

- Change a colour: edit `color`. Move furniture: change `x` and `z`. Remember to
  move the soft parts (cushions, monitor, handles) with the solid box underneath.
- Keep at least 0.8 m between solid pieces so the player can get through.
- Keep the spawn point clear of solid boxes, or the page will refuse to start.
- The walls are solid boxes just outside the room (`wall-*`). If you remove one,
  the player can walk out of the room.
- The pine planks are thin non-solid boxes on the side walls (`pine-left-*`,
  `pine-right-*`).

## The project notes

Each project in `src/data/projects.json` becomes a note on the board, in order,
five across and four down (20 at most). If there are more than 20, the last note
becomes "See all projects" and links to the plain project list. With no projects
the board shows a single "No projects yet" note.

## Music

Put your song in `public/assets/music/` and change `MUSIC_URL` in
`src/config.js` (for example to `assets/music/entry.mp3`).

## Textures

Any box in `src/data/room.json` can have an optional `"texture"`: one of `planks`, `plaster`, `carpet`, `weave`, `curtain`, `wood`, `door`. The texture is a small grey pixel pattern drawn in code (`src/lib/pixelTextures.js`); the box's `color` tints it, so change the colour to change the look. A box with no `"texture"` stays a flat colour.

Each texture covers a fixed real-world size (its `tileW`/`tileH` in metres), so a big wall and a small shelf get the same pixel size. To add a texture, add an entry to `TEXTURES` with a `shade(x, y)` function that returns a grey value. To use your own art instead, replace a texture's pixels with your PNG's.

## Photos on the computer

The Photos app on the desk computer shows the pictures listed in `src/data/photos.json`, each with a `src` (a path under `public/`, such as `assets/photos/me.jpg`, or an `https://` address) and an optional `caption`. Put your image files in `public/assets/photos/` and list them there. The six `placeholder-N.svg` pictures come from `node scripts/make-placeholder-assets.js`; delete their entries once you add real photos.

## The monitor

The box named `monitor-screen` in `room.json` is the computer: aim at it within 1.5 m and press E to open the desktop. Keep that name, and keep the box where the crosshair can reach it from the floor in front of the desk. Its colour is a teal tint so it looks switched on.
