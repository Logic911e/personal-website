// How hard the computer plays. skill is Stockfish's own 0 to 20 "Skill Level"; movetimeMs is how long it
// may think; fallbackDepth is how many moves ahead the built-in backup search looks.
const SETTINGS = {
  Easy: { skill: 0, movetimeMs: 100, fallbackDepth: 1 },
  Medium: { skill: 8, movetimeMs: 400, fallbackDepth: 2 },
  Hard: { skill: 16, movetimeMs: 900, fallbackDepth: 3 },
};

export const LEVELS = Object.keys(SETTINGS);

export function levelSettings(name) {
  const s = SETTINGS[name];
  if (!s) throw new Error(`unknown level "${name}"`);
  return { ...s };
}
