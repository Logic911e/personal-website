# Bedroom Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static website where a visitor walks around a top-down pixel-art bedroom, hears an entry song, and opens a project board that links to the owner's projects.

**Architecture:** Pure, unit-tested logic modules (map parsing, movement, project data, HTML rendering, mute storage) sit under `src/lib/`. A thin Phaser 3 scene and DOM glue consume them and are verified by running the site in a browser. The room is a Tiled JSON map with a documented contract, so the owner's art and layout drop in without code changes. A build step generates a static HTML fallback from the same project data.

**Tech Stack:** Phaser 3, Vite, Vitest, plain JavaScript (ES modules), Tiled map format. Node 25 / npm 11 are installed.

**Spec:** `docs/superpowers/specs/2026-11-08-bedroom-portfolio-design.md`

## Global Constraints

- Top-down view, 90s/early-2000s pixel-art look; render crisp (`pixelArt: true`, nearest-neighbour, whole-number scale with letterboxing).
- Internal tile size is 16px unless the owner says otherwise; keep it in one constant, `TILE_SIZE`, in `src/config.js`.
- Movement: arrow keys and WASD. Interaction: press `E` next to the board. `Esc` closes the board.
- Entry: the site opens on a real-HTML "Enter" screen; the click starts music and the game. Music loops. A mute button exists and the choice persists in the browser.
- Project data lives in one JSON file, `src/data/projects.json`: each project has `title`, `description`, `link`, optional `tags` (string array).
- The HTML fallback is generated statically at build time from that same file.
- Phones and very small screens (viewport width under 700px, or touch-only device) go to the fallback.
- No backend. Deploy target: GitHub Pages, Vite `base` configurable via the `BASE_PATH` env var.
- Bass, guitar, bed, computer and closet are solid placeholders that do nothing when approached. Do not build instrument playing.
- Placeholder art is flat coloured shapes; placeholder music is a generated tone loop. The spec says MP3; the placeholder is a generated WAV, and the owner's MP3 replaces it by changing the single `MUSIC_URL` constant.
- Keep first-load weight low: no unneeded dependencies, no large assets.

## Review Focus

Failure modes the spec implies that no task's feature tests would otherwise cover; each is pinned in the task named.

1. A project title/description containing HTML such as `<script>` must render as plain text (Task 5).
2. A project link using `javascript:` or another non-http(s) scheme must be rejected, never rendered as a link (Tasks 2 and 5).
3. `localStorage` unavailable (private window, blocked data) must not crash; mute still works for the session (Task 6).
4. A huge frame gap (tab was in the background) must not let the player jump through a wall (Task 4).
5. An empty projects list must show a friendly "no projects yet" message on the board and the fallback, not a blank panel (Task 5).

---

## File Structure

```
package.json, vite.config.js, .gitignore, index.html
public/assets/tiles.png            placeholder tile sheet (generated)
public/assets/room.json            placeholder Tiled map
public/assets/music/entry.wav      placeholder loop (generated)
scripts/make-placeholder-assets.js generates tiles.png and entry.wav
scripts/build-fallback.js          writes public/fallback.html from projects.json
src/config.js                      constants
src/data/projects.json             owner-editable project list
src/lib/projects.js                parseProjects
src/lib/room.js                    parseRoom, collides, nearestInteractable
src/lib/movement.js                stepPlayer
src/lib/projectHtml.js             escapeHtml, renderProjectListHtml, renderFallbackPage
src/lib/mute.js                    loadMuted, saveMuted
src/lib/viewport.js                shouldUseFallback
src/game/RoomScene.js              Phaser scene (player, room, board interaction)
src/ui/boardPanel.js               DOM overlay for the board
src/main.js                        Enter screen, mute button, boot
docs/ART-CONTRACT.md               how to build the owner's room map and art
.github/workflows/deploy.yml       GitHub Pages deploy
tests/*.test.js                    one file per lib module
```

---

### Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `index.html` (minimal), `src/main.js` (empty stub), `src/config.js`, `tests/config.test.js`

**Interfaces:**
- Produces: `src/config.js` exports `TILE_SIZE = 16`, `MUSIC_URL = 'assets/music/entry.wav'`, `MOBILE_MAX_WIDTH = 700`, `INTERACT_REACH = 12` (pixels).

- [ ] **Step 1:** `git init` already done. Run `npm init -y`, then `npm install phaser@3` and `npm install -D vite vitest`. Set `"type": "module"` and scripts `dev` (vite), `build` (`node scripts/build-fallback.js && vite build`), `test` (`vitest run`).
- [ ] **Step 2:** Write failing test `tests/config.test.js`: `expect(TILE_SIZE).toBe(16)` and `expect(MOBILE_MAX_WIDTH).toBe(700)` importing from `../src/config.js`. Run `npm test`; expected: FAIL, module not found.
- [ ] **Step 3:** Create `src/config.js` with the four constants above. `vite.config.js` sets `base: process.env.BASE_PATH ?? '/'`. `.gitignore`: `node_modules`, `dist`, `.superpowers`, `public/fallback.html`.
- [ ] **Step 4:** Run `npm test`; expected: PASS.
- [ ] **Step 5:** Commit `chore: scaffold Vite, Phaser and Vitest`.

---

### Task 2: Project data and validation

**Files:**
- Create: `src/data/projects.json`, `src/lib/projects.js`, `tests/projects.test.js`

**Interfaces:**
- Produces: `parseProjects(raw: unknown): Project[]` where `Project = { title: string, description: string, link: string, tags: string[] }`. Throws `Error` with a message naming the bad entry index and field. Rejects links whose scheme is not `http:` or `https:`. Missing `tags` becomes `[]`.

- [ ] **Step 1:** Write failing tests in `tests/projects.test.js`:
  - valid entry round-trips with `tags` defaulting to `[]`
  - `parseProjects([{title:'a',description:'b',link:'javascript:alert(1)'}])` throws, message contains `link`
  - missing `title` throws, message contains `0` and `title`
  - non-array input throws
  - `parseProjects([])` returns `[]`
- [ ] **Step 2:** Run `npx vitest run tests/projects.test.js`; expected FAIL.
- [ ] **Step 3:** Implement `parseProjects`. Use `new URL(link)` to read the scheme.
- [ ] **Step 4:** Create `src/data/projects.json` with three entries clearly marked placeholder (title starts with `Placeholder:`), links to `https://example.com`. Add a test that the real file passes `parseProjects`.
- [ ] **Step 5:** Run tests; expected PASS. Commit `feat: validate project data`.

---

### Task 3: Room map parsing, collision and interaction, with placeholder map

**Files:**
- Create: `src/lib/room.js`, `tests/room.test.js`, `public/assets/room.json`, `docs/ART-CONTRACT.md`

**Interfaces:**
- Consumes: `TILE_SIZE`.
- Produces:
  - `type Rect = { x, y, w, h }` (pixels)
  - `parseRoom(json): { widthPx, heightPx, spawn: {x,y}, solids: Rect[], interactables: {name: string, rect: Rect}[], decor: {rect: Rect, color: string, label: string}[] }`
  - `collides(rect: Rect, solids: Rect[]): boolean`
  - `nearestInteractable(playerRect: Rect, interactables, reach: number): {name, rect} | null` (returns the closest whose rect expanded by `reach` overlaps the player)
- Map contract (also written into `docs/ART-CONTRACT.md`): Tiled JSON, 16px tiles, tile layer `floor`; optional tile layer `furniture`; object layer `solid` (rectangles block movement; an optional `color` and `label` custom property draws a placeholder box); object layer `interact` (rectangles; object `name` identifies it, `board` opens the project board); object layer `spawn` with one point object.

- [ ] **Step 1:** Write failing tests with a small inline Tiled-shaped fixture: spawn is read; solids and interactables are extracted; `collides` true on overlap and false when only touching edges; `nearestInteractable` returns `null` when out of reach and the nearer of two when both in reach; `parseRoom` throws a message naming the missing layer when `spawn` or `solid` is absent.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement the three functions.
- [ ] **Step 4:** Author `public/assets/room.json`: 14 by 22 tiles (224 by 352 px), following the owner's sketch: bed top, window gap in top wall, bass top-left, guitar top-right above desk, board along the left wall (mid-height) with an `interact` rect named `board` slightly larger than it, computer desk right wall, closet bottom right, door gap bottom, spawn just inside the door. Perimeter walls are `solid` rects. Add a test that this file parses and that spawn does not collide with any solid.
- [ ] **Step 5:** Write `docs/ART-CONTRACT.md` stating the contract above, how to replace `tiles.png`, and how to move the board.
- [ ] **Step 6:** Run tests; expected PASS. Commit `feat: room map parsing and placeholder room`.

---

### Task 4: Player movement

**Files:**
- Create: `src/lib/movement.js`, `tests/movement.test.js`

**Interfaces:**
- Consumes: `Rect`, `collides` from Task 3.
- Produces: `stepPlayer(rect: Rect, dir: {x: -1|0|1, y: -1|0|1}, dtMs: number, solids: Rect[], speed = 80): Rect` — moves one axis at a time so the player slides along walls; diagonal speed is normalised; `dtMs` is clamped to a maximum of 50.

- [ ] **Step 1:** Write failing tests: moves right by `speed * dt/1000`; blocked by a solid (position unchanged on that axis, other axis still moves); diagonal distance is about `speed*dt/1000` not 1.41 times; **a 5000 ms dt cannot move the player more than 50 ms worth of distance and never ends inside a solid** (Review Focus 4).
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement `stepPlayer`.
- [ ] **Step 4:** Run; expected PASS. Commit `feat: player movement with wall sliding`.

---

### Task 5: Project HTML renderers and static fallback

**Files:**
- Create: `src/lib/projectHtml.js`, `tests/projectHtml.test.js`, `scripts/build-fallback.js`

**Interfaces:**
- Consumes: `Project` from Task 2.
- Produces:
  - `escapeHtml(s: string): string`
  - `renderProjectListHtml(projects: Project[]): string` — a `<ul>` of `<li>`, each with an `<a href target="_blank" rel="noopener noreferrer">`, description and tags. Empty list returns `<p class="empty">No projects yet.</p>`.
  - `renderFallbackPage(projects: Project[]): string` — a full HTML document using `renderProjectListHtml`, with a link "Enter the room" to `./`.
- `scripts/build-fallback.js` reads `src/data/projects.json`, runs `parseProjects`, writes `public/fallback.html`, and exits non-zero on invalid data.

- [ ] **Step 1:** Write failing tests: `escapeHtml('<script>')` contains no `<`; a project titled `<img src=x onerror=1>` renders with `&lt;` and no raw tag (Review Focus 1); a project with an unsafe link never reaches the renderer because `parseProjects` rejects it, and the renderer escapes `href` quotes (Review Focus 2); empty list renders the "No projects yet." message (Review Focus 5); fallback page contains `<!doctype html>` and every project title.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement the three functions and the script.
- [ ] **Step 4:** Run tests; then `node scripts/build-fallback.js` and confirm `public/fallback.html` exists. Expected PASS.
- [ ] **Step 5:** Commit `feat: project list renderers and static fallback`.

---

### Task 6: Mute storage and music manager

**Files:**
- Create: `src/lib/mute.js`, `tests/mute.test.js`, `scripts/make-placeholder-assets.js` (music part), `public/assets/music/entry.wav`

**Interfaces:**
- Produces: `loadMuted(storage = globalThis.localStorage): boolean` (default `false`), `saveMuted(muted: boolean, storage = globalThis.localStorage): void`. Both swallow storage exceptions and a missing `storage` (Review Focus 3). Key: `bedroom.muted`.
- `scripts/make-placeholder-assets.js` writes an 8-second looping WAV (a simple arpeggio of sine tones, 22050 Hz mono) using only Node built-ins.

- [ ] **Step 1:** Write failing tests with a fake storage object: default false; round-trips true; a storage whose `getItem`/`setItem` throw returns false and does not throw; `storage` undefined does not throw.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement `mute.js`; implement the WAV generator and run `node scripts/make-placeholder-assets.js` once; commit the output file.
- [ ] **Step 4:** Run tests; expected PASS. Commit `feat: mute persistence and placeholder music`.

---

### Task 7: Enter screen, viewport check and walkable room

This task is verified by running the site; Phaser scenes are not unit-tested.

**Files:**
- Create: `src/lib/viewport.js`, `tests/viewport.test.js`, `src/game/RoomScene.js`
- Modify: `index.html`, `src/main.js`
- Extend: `scripts/make-placeholder-assets.js` (tile sheet part), create `public/assets/tiles.png`

**Interfaces:**
- Produces: `shouldUseFallback(env: {width: number, touchOnly: boolean}): boolean` — true when `width < MOBILE_MAX_WIDTH` or `touchOnly`.
- `RoomScene` (Phaser scene key `'room'`) loads `assets/room.json`, `assets/tiles.png`; draws `decor` placeholder boxes with labels; spawns the player at `spawn`; moves with `stepPlayer` each frame from arrow/WASD; camera follows and is bounded to the room. Emits a scene event `'near-board'` with `true`/`false` when `nearestInteractable` changes (used by Task 8).
- `index.html` contains the Enter screen (real HTML: title, "Enter" button, "Skip the game" link to `fallback.html`) and a `#game` container plus a mute button.

- [ ] **Step 1:** Write failing tests for `shouldUseFallback`: width 400 true; width 1200 and not touchOnly false; width 1200 touchOnly true.
- [ ] **Step 2:** Run; expected FAIL. Implement. Run; expected PASS.
- [ ] **Step 3:** Generate `tiles.png` (16px floor tile variants, solid colours) in the assets script; run it.
- [ ] **Step 4:** Build `index.html`, `main.js` and `RoomScene.js`. `main.js`: on load, if `shouldUseFallback` redirect to `fallback.html`; on Enter click, hide the Enter screen, create the Phaser game (`pixelArt: true`, `Scale.FIT` with `autoCenter`, integer zoom, room-sized internal resolution), start the looping music from `MUSIC_URL` unless `loadMuted()`; the mute button toggles sound and calls `saveMuted`.
- [ ] **Step 5:** Verify: run `npm run dev`, open the URL, and confirm: Enter screen shows; clicking it starts music and shows the room; arrows/WASD move the player; walls and furniture block; mute silences and survives a reload; narrowing the window below 700px and reloading lands on the fallback page. Report what was seen.
- [ ] **Step 6:** Commit `feat: enter screen and walkable bedroom`.

---

### Task 8: Project board interaction

Verified by running the site.

**Files:**
- Create: `src/ui/boardPanel.js`
- Modify: `src/game/RoomScene.js`, `src/main.js`, `index.html` (panel container and styles)

**Interfaces:**
- Consumes: `renderProjectListHtml`, `parseProjects`, `projects.json`, the `'near-board'` event.
- Produces: `createBoardPanel(container: HTMLElement, projects: Project[]): { open(): void, close(): void, isOpen(): boolean }`. The panel is a scrollable overlay; focus moves into it on open and returns to the game on close.

- [ ] **Step 1:** Implement `createBoardPanel`. While open, the scene ignores movement keys (add a scene method `setInputEnabled(enabled: boolean)`).
- [ ] **Step 2:** In `RoomScene`, show a small "Press E" prompt when near the board; `E` opens the panel; `Esc` closes it.
- [ ] **Step 3:** Verify in the browser: prompt appears only next to the board; `E` opens the list; links open in a new tab; `Esc` closes; movement is frozen while open; with `projects.json` temporarily set to `[]` the panel shows "No projects yet." (restore the file afterwards). Report what was seen.
- [ ] **Step 4:** Commit `feat: interactive project board`.

---

### Task 9: Build, deploy and README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1:** Run `npm run build`; confirm `dist/` contains `index.html`, `fallback.html`, and the assets. Run `npx vite preview` and repeat the Task 7 checks against the built site.
- [ ] **Step 2:** Add the GitHub Pages workflow: install, test, build with `BASE_PATH=/<repo-name>/`, upload `dist/`, deploy with the official Pages actions.
- [ ] **Step 3:** Write `README.md`: how to run, test, build; how to edit `projects.json`; how to swap art, the map and the music (point to `docs/ART-CONTRACT.md` and `MUSIC_URL`); how to enable GitHub Pages.
- [ ] **Step 4:** Run `npm test` and `npm run build`; expected: all pass. Commit `docs: README and deploy workflow`.

---

## Self-review notes

- Spec coverage: walkable room (7), project board (3, 8), entry music with Enter screen (6, 7), swappable art/music (3, 6, 9), editable project list (2), HTML fallback (5), free static hosting (9), mute (6, 7), mobile to fallback (7). Non-goals are untouched.
- Open items assumed: 16px tile sheet and looping music, as agreed. The owner's real project list replaces the placeholders in `projects.json`.
