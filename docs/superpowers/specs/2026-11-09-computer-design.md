# The computer in the bedroom — design

## Intent
The bedroom is the portfolio; the monitor on the desk is its second act. Walking up to it and pressing E should feel like sitting down at an old computer: a retro desktop fills the browser window, with photos of the owner and a chess game against the computer. It adds personality and a reason to linger, without getting in the way of the projects board.

## Goals
- Aim at the monitor within 1.5 m, see "Press E: Use the computer", press E, and a full-window desktop appears. Esc, or Start → Shut Down, returns to the room.
- A Windows 95-style desktop: teal background, grey bevelled windows with title bars, a taskbar with a Start button and a clock, chunky pixel icons.
- Two apps, opened from desktop icons: **Photos** and **Chess**.
- **Photos:** a thumbnail grid; click one to see it larger with previous / next. Pictures and captions come from a data file, with generated placeholders until the owner supplies real ones.
- **Chess:** the visitor plays white against the computer (black). Click a piece, see its legal moves, click a square. The visitor chooses the difficulty (Easy, Medium, Hard) from a dropdown, and can change it at any time; it applies to the computer's next move. The computer replies within a second or two. New Game button; a status line (your turn, check, checkmate, stalemate, draw).
- Windows can be dragged by the title bar, closed, and found again in the taskbar.

## Non-goals
Two-player or online play, undo, saved games, sound, a clock or timer, other apps (no file browser, no terminal), running the desktop as a texture on the 3D monitor, phones (they get the fallback page, as now).

## Anti-goals (a failure even if it technically works)
- The page freezes while the computer "thinks".
- WASD or E still moves or acts in the room while the computer is open.
- A broken or missing photo breaks the Photos window.
- An illegal chess move is ever accepted, or the game cannot finish (no end detection).
- The room's load time or the fallback page gets noticeably worse (the engine must not load until Chess is opened).

## Decided by the owner
Full-window screen; old-Windows/Mac retro desktop (the choice between them was left to me); photos and chess as the two things on it; an artificial opponent running locally in the browser, like the owner's chess project; a difficulty setting the visitor can change; placeholder photos for now.

## My calls (the owner can overrule)
- Windows 95 look, not Mac.
- Chess rules from the `chess.js` library (legal moves, check, mate, draws).
- The opponent is Stockfish compiled to WebAssembly (stockfish.js), running in the visitor's browser: no server, no API. It is loaded only when the Chess window is first opened, with a "Loading engine..." message, and runs in a Web Worker so the page never freezes.
- Difficulty maps to Stockfish's own skill setting plus a short think time (Easy is a low skill level and very short thinking; Hard is a high skill level and a longer think). The exact numbers are the builder's, tuned so Easy is genuinely beatable by a beginner.
- If the engine fails to load, the game falls back to a small built-in search (depth 2, material and piece positions), so Chess always works; the difficulty dropdown then changes that search's depth.
- Stockfish is GPL-3.0. Before building, the builder confirms the engine's real download size and licence terms and records them; the site's source stays public-ready (the repository's own licence and a note crediting Stockfish are added).
- Pawns auto-promote to a queen.
- The visitor is always white.
- Photos live in `src/data/photos.json` (`src`, `caption`) with images in `public/assets/photos/`; placeholders are simple generated SVGs.
- The desktop is HTML/CSS laid over the room, not drawn in 3D.
- The monitor's screen box in `room.json` gets a teal tint so it looks switched on.
- Opening the computer pauses the room exactly as the project card does; closing it shows "Click to resume".

## Left to the builder
File layout, pixel font and icon drawing, chess piece rendering (glyphs or drawn shapes, whichever looks right on all browsers), the exact skill and think-time numbers per level, the fallback search's evaluation numbers, and how the monitor is made pickable alongside the notes.
