# First-Person 3D Bedroom: Design

Date: 2026-11-08
Builds on: `2026-11-08-bedroom-portfolio-design.md` (the 2D version, now merged).

## Intent

Turn the walkable bedroom portfolio from a top-down 2D game into a
first-person 3D one. The visitor stands inside the owner's bedroom, looks
around with the mouse, walks with the keyboard, and looks at the project board
on the wall to open the owner's projects. The look is "Minecraft-style":
chunky blocks and flat colours, not realistic. The point is the same as
before, personality: it should feel like being let into the owner's room.

## Goals

1. **First-person view.** Eye-height camera, mouse look (the click on the
   Enter screen captures the mouse), WASD and arrow keys to walk. No jumping,
   no head bob. The visitor cannot walk through walls or furniture and slides
   along them.
2. **The room, built from blocks.** One room, laid out as in the owner's
   sketch (plan view, door at the bottom):
   - Bed along the top wall, window above it.
   - Bass in the top-left corner beside the bed.
   - Guitar in the top-right area above the desk.
   - Project board along the left wall, about mid-wall.
   - Computer desk and chair along the right wall.
   - Closet at the bottom right beside the door.
   - Door at the bottom. The visitor starts just inside it, facing the room.
3. **Colours and furniture taken from the owner's photo.**
   - Floor: dark grey carpet.
   - Left wall white. Right wall pine wood planks (a simple stripe pattern,
     not a detailed texture).
   - Bed with a sage-green duvet, two matching pillows and a wooden headboard
     edge.
   - Window above the bed with grey curtains.
   - White desk against the wood wall, a white wall-mounted shelf unit with
     cubby holes above it, a dark blue-black office chair, a laptop on the
     desk.
   - Small clutter in the photo (food packets, water bottle, cloth, boxes) is
     deliberately left out.
4. **Project board interaction.** A crosshair shows in the middle of the
   screen. Looking at the board from close enough and pressing **E** opens the
   existing project overlay; **Esc** closes it. While it is open, movement and
   mouse look are paused and the mouse is released. A "Press E" prompt shows
   only while the board is in reach.
5. **Entry music and mute carry over unchanged.** Enter click starts the
   looping song, the Sound button mutes and remembers the choice.
6. **Bass and guitar are visible models** in their spots but do nothing yet.
7. **Everything that is not the game stays.** Enter screen, project data file,
   plain-HTML fallback page, `?game=1` override, mute storage, deploy workflow.

### Orientation, so the layout is not mirrored

The owner's sketch is a plan view as drawn: the bed wall is at the **top**, the
door at the **bottom**, the board wall on the **left**, the desk on the
**right**. The visitor spawns just inside the door **facing the bed wall**, so
the sketch's left is the visitor's left. The board is therefore on the
visitor's left, the desk and wood-panelled wall on their right, the window
straight ahead above the bed. Plan view (not to scale):

```
          window
   +-----------------------+
   | bass  [    bed    ]   |
   |                guitar |
   | board            desk |
   |                +chair |
   |                       |
   |          you   closet |
   +---------[door]--------+
```

## Non-goals (for now)

- Playing the bass or guitar. Still a later add-on.
- Anything for the closet, desk, laptop, bed or door to do.
- More than one room, outdoor areas, or a driving/free-roam world.
- Realistic textures, 3D scanning, or models authored in Blender by the owner.
- Phone controls. Phones and small screens keep going to the fallback page.
- Physics objects (things you can knock over or pick up).

## Anti-goals (a failure even if it technically works)

- Motion sickness. No camera shake or bob, a moderate field of view, smooth
  steady movement, and mouse look that is not twitchy.
- Walking through the walls, getting stuck on furniture, or ending up outside
  the room.
- A slow first load. Blocks and flat colours should keep the page light. The
  3D library is the main weight, so nothing else heavy goes in.
- The mouse stuck captured when the project board is open, or Esc leaving the
  game in a broken state.
- Looking like generic low-poly. It should read as blocky and Minecraft-like.
- Hard-coding the room so the owner cannot change the layout or colours
  without editing game logic.

## Constraints

- 3D engine: Three.js. It replaces Phaser, which is removed from the shipped
  site (the 2D version stays in git history).
- Static site, free hosting, no backend. Same GitHub Pages deploy.
- Keyboard and mouse on desktop. Touch-only and narrow screens use the
  fallback page.
- Unit-testable logic stays separate from rendering, as in the 2D version.

## Decisions the owner made

- First-person point of view, not a bird's-eye view.
- Minecraft-style blocky look.
- The room's layout follows the original sketch. The photo is the guide for
  colours and furniture, even though the old photo's orientation differs.
- Leave out small clutter from the photo.
- The owner will not model the room in Blender. The builder builds it.

## Builder's calls (the owner has not confirmed these)

- **Room size:** about 3.5 m wide, 5.5 m long and 2.4 m high, estimated from
  the sketch's proportions. One block is 0.25 m. The owner's real
  measurements can replace the estimate.
- **Eye height 1.6 m, field of view 75 degrees,** walking speed about 3 m/s.
- **Room data lives in one file** that lists blocks, colours and furniture
  positions, so the layout can be edited without touching game logic. The
  collision boxes come from the same data.
- **Collision:** simple axis-aligned boxes with sliding, tested with unit
  tests. No physics engine unless a need appears. (Rapier and
  three-player-controller were considered as references.)
- **Interaction:** the board is "in reach" when the player is within about
  1.5 m and looking roughly toward it. Zone-style in/out events are borrowed
  from the folio-2019 reference (MIT licensed). None of its art is reused.
- **Mouse capture:** the browser's pointer lock. Esc releases it natively,
  and the game pauses movement while the mouse is released.
- **Tab hidden:** music auto-mutes while the tab is hidden, and returns
  when it is shown (an idea from folio-2019).
- **Placeholder look:** flat-coloured blocks, no image textures, no shadows
  beyond simple lighting.
- **The 2D code is replaced,** not kept alongside, to avoid carrying two
  engines. The pure logic (projects, mute, fallback, viewport) is reused.

## Builder's calls added after the design review (the owner can override)

- **Project board:** about 1.5 m wide and 1 m tall, centre at 1.4 m above the
  floor, thin, with a wood frame and a corkboard-coloured face so it reads as
  a board. It sits mid-wall on the left wall. "In reach" means within 1.5 m
  and within about 25 degrees of looking straight at it.
- **Mouse lock edge cases:** opening the board releases the mouse so its close
  button and links work. Closing it (button or Esc) shows a "Click to resume"
  state, because browsers only allow re-locking after a click. The same
  "Click to resume" state shows if the lock is lost while exploring. If pointer
  lock is unsupported or refused, the page shows a short message with a link
  to the plain project list.
- **Door:** a closed door, solid like the walls. The visitor cannot leave the
  room. The spawn point is clear of the closet.
- **Fallback and override:** `?game=1` still works on a desktop-sized window.
  On a touch-only device it shows a "needs a keyboard and mouse" message with
  the fallback link instead of a broken game. If WebGL is unavailable, the
  page goes to the fallback page.
- **Tab hidden:** music mutes while the tab is hidden and returns when it is
  visible again. This must not change the visitor's saved mute choice.
- **Testing:** unit tests for the pure logic (collision, reach and aim, room
  data validation, mute behaviour). The 3D rendering is checked by hand in a
  browser. The final built bundle size is reported.
- **Sketch and photo:** not committed to the repo. The plan view above is the
  layout record. The owner's bedroom photo stays out of the repo because the
  repo may become public.
- **Old 2D files** (Phaser scene, Tiled map, tile sheet, 2D movement code and
  their tests, and the placeholder asset script) are deleted or replaced.
  README and the art guide are rewritten for the 3D room.

## Left to the builder

- File structure, naming, build scripts, tests.
- How the room data file is shaped, as long as the owner can edit layout and
  colours there.
- Lighting setup, renderer settings and how blocks are drawn (merged or
  instanced) for performance.
- Updating the README and art guide to match.

## Open items for the owner

- Real room measurements (width, length, ceiling height), when convenient.
- Photos of the other walls (closet, door, board wall), if you want those to
  match your real room.
- The owner's songs and the real project list.
