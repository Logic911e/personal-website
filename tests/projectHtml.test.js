import { describe, it, expect } from 'vitest';
import { escapeHtml, renderProjectListHtml, renderFallbackPage } from '../src/lib/projectHtml.js';

const project = (over = {}) => ({
  title: 'Chess',
  description: 'Detects pieces',
  link: 'https://example.com/chess',
  tags: ['ml'],
  ...over,
});

describe('escapeHtml', () => {
  it('escapes angle brackets, ampersands and quotes', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

describe('renderProjectListHtml', () => {
  it('renders each project as a link that opens in a new tab safely', () => {
    const html = renderProjectListHtml([project()]);
    expect(html).toContain('href="https://example.com/chess"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Chess');
    expect(html).toContain('Detects pieces');
    expect(html).toContain('ml');
  });

  it('shows markup in a title as plain text, never as a tag', () => {
    const html = renderProjectListHtml([project({ title: '<img src=x onerror=1>' })]);
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
    expect(html).not.toContain('<img');
  });

  it('cannot be broken out of the href attribute with a quote', () => {
    const html = renderProjectListHtml([project({ link: 'https://example.com/?a="onmouseover="x' })]);
    expect(html).not.toContain('"onmouseover="');
  });

  it('shows a friendly message for an empty list', () => {
    expect(renderProjectListHtml([])).toBe('<p class="empty">No projects yet.</p>');
  });
});

describe('renderFallbackPage', () => {
  it('is a full HTML document that lists every project title', () => {
    const page = renderFallbackPage([project({ title: 'One' }), project({ title: 'Two' })]);
    expect(page.toLowerCase()).toMatch(/^<!doctype html>/);
    expect(page).toContain('One');
    expect(page).toContain('Two');
  });

  it('links back to the room with the override that stops the small-screen redirect', () => {
    expect(renderFallbackPage([])).toContain('href="./?game=1"');
  });
});
