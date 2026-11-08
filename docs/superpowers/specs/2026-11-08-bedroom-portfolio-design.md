# Bedroom Portfolio Website: Design

Date: 2026-11-08

## Intent

A personal website that hosts the owner's projects. Instead of a normal list of
links, the site is a small retro pixel-art game: the visitor walks around the
owner's bedroom, seen from above, and finds a project board on the wall that
links out to the owner's projects. The owner writes the music and draws the
art. Claude builds the code.

The point is personality. A visitor should feel they have been let into the
owner's room, not handed a CV.

## Goals

1. **A single walkable room** in a top-down, 90s/early-2000s pixel-art style
   (think old Pokemon). The visitor moves with the keyboard (arrow keys / WASD)
   and cannot walk through furniture or walls.
2. **A project board** on the left wall. Walking up to it and pressing a key
   opens a list of projects. Each project has a title, a short description, and
   a link out to the real thing.
3. **Music on entry.** An owner-made song plays once the visitor enters the
   room. Browsers block audio until the visitor interacts, so the site opens on
   a simple "Enter" screen; clicking it starts the music and the game. (Builder
   decision, not the owner's.)
4. **Easy swapping of the owner's own art and music.** Placeholder shapes and a
   placeholder tune ship first. The owner's finished pixel art, room map and
   songs drop in without code changes.
5. **Editable project list.** The projects on the board come from one plain
   data file the owner can edit without touching game code.
6. **A real-HTML fallback for the projects.** The game is drawn on a canvas, so
   search engines and screen readers cannot see inside it. The project list must
   also exist as ordinary HTML links (for example a "skip the game" page or a
   text link on the Enter screen).
7. **Hostable for free** as a static site (GitHub Pages or Netlify). No server.

## Layout (from the owner's sketch)

Top-down, tall narrow room. The door is at the bottom, and the visitor starts
just inside it.

- Bed along the top wall, window above it.
- Bass in the top-left corner beside the bed.
- Guitar in the top-right area, above the computer desk.
- Project board along the left wall (about the middle of the wall).
- Computer desk and chair along the right wall.
- Closet at the bottom right, next to the door.

For the first version, the bass, guitar, bed, computer and closet are solid
objects that look like their placeholders but do nothing when approached.

## Non-goals (for now)

- Playable bass and guitar. The owner expects visitors to want to play them,
  but this is a later add-on once the core works.
- Anything for the closet, the computer or the bed to do.
- More than one room.
- Accounts, saved progress, scores or any backend.
- Mobile touch controls, unless cheap to add. Desktop keyboard is the target
  for v1. The HTML fallback must still work on phones.

## Anti-goals (a failure even if it technically works)

- A slow first load. The game engine is already heavy, so art and music files
  must be kept small and nothing unnecessary added.
- Project links only reachable through the canvas.
- Music that autoplays against browser rules or cannot be muted. The visitor
  needs a way to mute.
- Code that makes dropping in the owner's own art and music hard.

## Decisions the owner made

- Top-down, pixel-art, retro style, single bedroom, matching the sketch.
- Claude builds the code; the owner makes the art and music.
- Core first (room, board, entry music); instrument interaction later.
- New project folder, separate from the chess project:
  `/Users/anjola/Desktop/Personal Projects/personal-website`, its own git repo.
- Owner approved the recommended stack below.

## Builder's calls (the owner approved the stack; everything else is open to change)

- **Phaser 3** for the game, **Vite** to build it, **Tiled** for the room map.
  Chosen for large community, tile-map support and audio handling.
  Kaplay was the lighter alternative.
- Plain JavaScript or TypeScript is the builder's call.
- The "Enter" screen, a mute button and the HTML fallback page are additions
  the owner has not specifically asked for.
- Placeholder art: flat coloured shapes at a small pixel resolution, scaled up
  with nearest-neighbour filtering so it stays crisp.

## Builder's calls added after the design review (owner can override)

- **Interaction:** press E when standing next to the board. A small prompt
  appears when in range. The board's position and interaction zone come from
  the Tiled map, so the owner can move it without code changes.
- **Audio:** MP3, loaded after the Enter click, so the Enter screen is not
  blocked by a large download. Mute choice is remembered in the browser.
- **Deploy:** GitHub Pages by default, with the Vite base path configurable.
  No custom domain assumed.
- **HTML fallback:** generated statically at build time from the same project
  data file, so it cannot drift from the board. The Enter screen is real HTML.
- **Project data:** one JSON file. Each project has title, description, link,
  and an optional tags list. The board panel scrolls, so any number of
  projects works.
- **Screen size:** the game scales by whole-number multiples with letterboxing.
  Phones and very small screens are sent to the HTML fallback in v1.
- **Art contract:** documented in the repo once the owner's tile size is
  known (see open items).

## Left to the builder

- Exact internal resolution and scale.
- Project file structure, naming, build scripts.
- How the board's project list is shown (overlay panel is the expectation).
- The deploy setup for GitHub Pages or Netlify.
- Tests and tooling.

## Open items for the owner

- Tile size and how the art is drawn (tileset vs separate furniture sprites).
  Placeholder uses 16px tiles until told otherwise.
- Whether the entry song loops or plays once. Placeholder loops.
- The real list of projects for the board (title, description, link). Until
  provided, the board shows clearly marked placeholder entries.
- The owner's songs and pixel art, when ready.
