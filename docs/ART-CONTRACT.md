# Art and room map guide

The room is a [Tiled](https://www.mapeditor.org/) map exported as JSON. If your
map follows the rules below, the game picks up your art and layout with no code
changes.

## Files

| File | What it is |
| --- | --- |
| `public/assets/room.json` | The room map (export from Tiled as JSON) |
| `public/assets/tiles.png` | The tile sheet the map uses |
| `public/assets/music/entry.wav` | The song that loops while a visitor is in the room |

For the song, put your file in `public/assets/music/` and change `MUSIC_URL`
in `src/config.js` (for example to `assets/music/entry.mp3`).

## Tile size

The grid is **16 pixels** per tile. If you draw at another size, change
`TILE_SIZE` in `src/config.js` and use the same size in Tiled.

## Layers (names must match exactly)

| Layer | Type | Required | What it does |
| --- | --- | --- | --- |
| `floor` | Tile layer | yes | The floor and walls you can see |
| `furniture` | Tile layer | no | Your furniture art, drawn above the floor |
| `solid` | Object layer | yes | Rectangles the player cannot walk through |
| `interact` | Object layer | no | Rectangles the player can use. An object named `board` opens the project board |
| `spawn` | Object layer | yes | One **point** object where the player starts |

## Placeholder boxes

A rectangle in the `solid` layer with a custom string property `color` (for
example `#c9a066`) is drawn as a coloured box. A second string property
`label` prints text on it. Delete the `color` property once your real art
covers that spot, and the rectangle then only blocks movement.

## Moving the project board

Move or resize the object named `board` in the `interact` layer. The player
can press **E** when standing within a few pixels of that rectangle.

## Tips

- Keep `solid` rectangles a little smaller than your furniture art so the
  player can stand close without looking stuck.
- Leave the room's door gap open in the `solid` layer so the room matches the
  entrance.
