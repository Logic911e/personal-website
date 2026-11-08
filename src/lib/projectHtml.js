const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Make text safe to place inside HTML content or a quoted attribute. */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function renderProject(p) {
  const tags = p.tags.length
    ? `<p class="tags">${p.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join(' ')}</p>`
    : '';
  return (
    `<li class="project">` +
    `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a>` +
    `<p>${escapeHtml(p.description)}</p>` +
    tags +
    `</li>`
  );
}

/** The project list as HTML. Shared by the in-game board and the fallback page. */
export function renderProjectListHtml(projects) {
  if (projects.length === 0) return '<p class="empty">No projects yet.</p>';
  return `<ul class="projects">${projects.map(renderProject).join('')}</ul>`;
}

/** A complete standalone page, built at deploy time, for visitors who skip the game. */
export function renderFallbackPage(projects) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Projects</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  .projects { list-style: none; padding: 0; }
  .project { margin: 1.25rem 0; }
  .project a { font-weight: 600; }
  .project p { margin: 0.25rem 0; }
  .tags span { font-size: 0.8rem; background: #eee; border-radius: 4px; padding: 0.1rem 0.4rem; }
</style>
</head>
<body>
<h1>Projects</h1>
<p><a href="./?game=1">Enter the room</a></p>
${renderProjectListHtml(projects)}
</body>
</html>
`;
}
