// Writes public/fallback.html from src/data/projects.json.
// Exits non-zero if the project data is invalid so a bad deploy fails loudly.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseProjects } from '../src/lib/projects.js';
import { renderFallbackPage } from '../src/lib/projectHtml.js';

const root = new URL('../', import.meta.url);

try {
  const raw = JSON.parse(readFileSync(new URL('src/data/projects.json', root), 'utf8'));
  const projects = parseProjects(raw);
  mkdirSync(new URL('public/', root), { recursive: true });
  writeFileSync(new URL('public/fallback.html', root), renderFallbackPage(projects));
  console.log(`fallback.html written with ${projects.length} project(s)`);
} catch (err) {
  console.error(`build-fallback failed: ${err.message}`);
  process.exit(1);
}
