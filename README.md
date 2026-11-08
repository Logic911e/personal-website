# Bedroom Portfolio

A personal website where visitors walk around a top-down pixel-art bedroom,
hear an entry song, and open a project board that links to my projects.
Built with Phaser 3, Vite and Tiled.

- Design: `docs/superpowers/specs/2026-11-08-bedroom-portfolio-design.md`
- Plan: `docs/superpowers/plans/2026-11-08-bedroom-portfolio.md`

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build into dist/
```

Controls: arrow keys or WASD to walk, **E** next to the project board to open
it, **Esc** to close it. The Sound button top-right mutes the music.

## Edit the projects on the board

Edit `src/data/projects.json`. Each project needs a `title`, `description` and
a `link` starting with `http://` or `https://`. `tags` is optional. The board
and the plain-HTML fallback page (`fallback.html`) both come from this file.
A bad entry stops `npm run build` with a message naming the entry.

## Swap in your own art, room and music

- Room map and art: see `docs/ART-CONTRACT.md`. Replace `public/assets/room.json`
  and `public/assets/tiles.png`.
- Music: put your file in `public/assets/music/` and change `MUSIC_URL` in
  `src/config.js`.
- `node scripts/make-placeholder-assets.js` regenerates the placeholder tiles
  and tune. Do not run it after you add your own files with the same names.

## Deploy to GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In the repo's Settings > Pages, set the source to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` tests, builds with the right
   base path, and publishes.

## Small screens

Phones and windows narrower than 700px (and touch-only devices) are sent to
`fallback.html`, the plain project list.
