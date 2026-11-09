# Bedroom Portfolio

A personal website where visitors walk around a blocky, Minecraft-style 3D copy
of my bedroom in first person, hear an entry song, and read my projects as notes
pinned to a board. Built with Three.js and Vite.

- Designs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`
- How to edit the room: `docs/ROOM-GUIDE.md`

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build into dist/
```

## Controls

- Click **Enter**, then move the mouse to look and use **W A S D** or the arrow
  keys to walk.
- Aim the crosshair at a note on the left wall and press **E** to read it. The
  card has an "Open project" link. **Esc** closes the card.
- **Esc** also lets go of the mouse at any time; click "Click to resume" to
  carry on.
- The Sound button (top right) mutes the music. The music also mutes while the
  tab is hidden.

Phones, narrow windows and touch-only devices go to `fallback.html`, a plain
list of the projects. Adding `?game=1` to the address forces the room on a
narrow desktop window.

## Edit the projects

Edit `src/data/projects.json`. Each project needs a `title`, `description` and a
`link` starting with `http://` or `https://`. `tags` is optional. The notes, the
card and `fallback.html` all come from this file. A bad entry stops
`npm run build` with a message naming the entry.

## Change the room and music

- The room is `src/data/room.json`; see `docs/ROOM-GUIDE.md`.
- Put your song in `public/assets/music/` and change `MUSIC_URL` in
  `src/config.js`. `node scripts/make-placeholder-assets.js` regenerates the
  placeholder tune; do not run it after you add your own file with the same name.

## Deploy to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo's Settings > Pages, set the source to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` tests, builds with the right
   base path, and publishes. (Pages on a free account needs a public repo.)

## The computer

Aim at the monitor on the desk (within about 1.5 m) and press **E** to sit down at a Windows 95-style desktop. Double-click an icon, or select it and press Enter, to open it. **Esc** or **Start → Shut Down** returns to the room.

- **Photos** shows the pictures listed in `src/data/photos.json` (see `docs/ROOM-GUIDE.md`). The six placeholders come from `node scripts/make-placeholder-assets.js`.
- **Chess** is a game against the computer (you play white; Easy, Medium or Hard). The opponent is Stockfish running in the browser, loaded only when Chess is first opened. If it cannot load, a small built-in search plays instead.

Sizes (measured): the page's JavaScript is about 604 KB raw / 156 KB gzipped, including chess.js. Stockfish adds about 655 KB raw / 191 KB gzipped, downloaded only when Chess opens.

## Credits

- **Stockfish** (GPL-3.0) powers the chess computer, running in the browser via stockfish.js. Files and licence are in `public/assets/stockfish/`.
- **chess.js** (BSD-2-Clause) provides the chess rules.
- **three.js** (MIT) renders the room.

See `THIRD-PARTY.md` for versions and sources.
