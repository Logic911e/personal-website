const COLOR = /^#[0-9a-fA-F]{6}$/;
const round = (n) => Number(n.toFixed(6)); // keeps 0.1 + 0.2 style noise out of the numbers

function fail(name, why) {
  throw new Error(`sprite "${name}": ${why}`);
}

const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Turn a small pixel drawing into thin blocks (the same shape as room.json boxes), so an object like a guitar can
 * be drawn as text. Each row is a string; "." is empty and any other character is looked up in the palette.
 * Row 0 is the top. facing is the direction the picture faces: "-x" shows it to someone looking along +x
 * (columns then run toward +z from origin.z), "+x" shows it to someone looking along -x (columns run toward -z).
 * origin is where the picture's bottom, viewer's-left corner sits; depth is how thick it is (along x).
 */
export function spriteToBoxes({ name, facing, voxel, depth, origin, palette, rows }) {
  if (facing !== '+x' && facing !== '-x') fail(name, '"facing" must be "+x" or "-x"');
  if (!isNumber(voxel) || voxel <= 0) fail(name, '"voxel" must be a number above 0');
  if (!isNumber(depth) || depth <= 0) fail(name, '"depth" must be a number above 0');
  if (!origin || !isNumber(origin.x) || !isNumber(origin.y) || !isNumber(origin.z)) {
    fail(name, '"origin" must have numbers x, y and z');
  }
  if (!palette || typeof palette !== 'object') fail(name, '"palette" must map characters to colours');
  for (const [ch, color] of Object.entries(palette)) {
    if (ch === '.') fail(name, 'palette entry "." is not allowed: "." means empty');
    if (ch.length !== 1) fail(name, `palette key "${ch}" must be a single character`);
    if (typeof color !== 'string' || !COLOR.test(color)) fail(name, `palette colour for "${ch}" must look like #rrggbb`);
  }
  if (!Array.isArray(rows) || rows.length === 0) fail(name, '"rows" must be a non-empty list of strings');
  const width = typeof rows[0] === 'string' ? rows[0].length : -1;
  rows.forEach((row, r) => {
    if (typeof row !== 'string' || row.length !== width) fail(name, `row ${r} must be text as long as row 0 (${width})`);
    for (const ch of row) if (ch !== '.' && !(ch in palette)) fail(name, `row ${r} uses "${ch}", which is not in the palette`);
  });

  // Merge runs of one colour along a row, then merge identical runs on neighbouring rows, to keep the block count low.
  const found = [];
  let open = new Map();
  rows.forEach((row, r) => {
    const next = new Map();
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      let end = c;
      while (end + 1 < row.length && row[end + 1] === ch) end++;
      if (ch !== '.') {
        const key = `${c}-${end}-${ch}`;
        const above = open.get(key);
        if (above) {
          above.r1 = r;
          next.set(key, above);
        } else {
          const entry = { c0: c, c1: end, ch, r0: r, r1: r };
          found.push(entry);
          next.set(key, entry);
        }
      }
      c = end + 1;
    }
    open = next;
  });

  return found.map((e, i) => ({
    name: `${name}-${i}`,
    x: round(origin.x),
    y: round(origin.y + (rows.length - 1 - e.r1) * voxel),
    z: round(facing === '-x' ? origin.z + e.c0 * voxel : origin.z - (e.c1 + 1) * voxel),
    w: round(depth),
    h: round((e.r1 - e.r0 + 1) * voxel),
    d: round((e.c1 - e.c0 + 1) * voxel),
    color: palette[e.ch],
    solid: false,
  }));
}
