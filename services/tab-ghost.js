'use strict';

/**
 * Hilfsfunktionen für das schwebende Tab-Vorschaufenster ("Drag Ghost") beim Tab-Tear-off.
 * Bewusst frei von Electron-Abhängigkeiten, damit sie isoliert testbar bleiben.
 */

const GHOST_WIDTH = 220;
const GHOST_HEIGHT = 36;
const MAX_TITLE_LENGTH = 80;
const MAX_FAVICON_LENGTH = 8192;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Erlaubt ausschließlich http(s)- und data:image-Favicons; alles andere wird verworfen.
 * @returns {string|null}
 */
function sanitizeFavicon(favicon) {
  if (typeof favicon !== 'string') return null;
  const trimmed = favicon.trim();
  if (!trimmed || trimmed.length > MAX_FAVICON_LENGTH) return null;
  if (/^https?:\/\//i.test(trimmed) || /^data:image\/(png|jpe?g|gif|webp|x-icon|vnd\.microsoft\.icon|svg\+xml);/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function sanitizeTitle(title) {
  const raw = typeof title === 'string' ? title.trim() : '';
  return (raw || 'Worldcraft').slice(0, MAX_TITLE_LENGTH);
}

/**
 * Erzeugt das statische HTML des Vorschaufensters (kein Script, restriktive CSP).
 */
function buildTabGhostHtml(title, favicon) {
  const safeTitle = escapeHtml(sanitizeTitle(title));
  const safeFavicon = sanitizeFavicon(favicon);

  const iconHtml = safeFavicon
    ? `<img class="fav" src="${escapeHtml(safeFavicon)}" alt="">`
    : '<span class="fav globe"></span>';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'">
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: ${GHOST_WIDTH}px; height: ${GHOST_HEIGHT}px; }
  .tab {
    box-sizing: border-box;
    width: ${GHOST_WIDTH}px;
    height: ${GHOST_HEIGHT}px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    background: #0b120d;
    border: 1px solid #00ff66;
    border-radius: 8px;
    box-shadow: 0 0 14px rgba(0, 255, 102, 0.45);
    color: #d6ffe6;
    font: 600 12px 'Segoe UI', system-ui, sans-serif;
    opacity: 0.95;
    user-select: none;
  }
  .fav { width: 14px; height: 14px; flex: 0 0 14px; }
  .globe { border: 2px solid #00ff66; border-radius: 50%; box-sizing: border-box; }
  .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
</head>
<body>
<div class="tab">${iconHtml}<span class="title">${safeTitle}</span></div>
</body>
</html>`;
}

module.exports = {
  GHOST_WIDTH,
  GHOST_HEIGHT,
  escapeHtml,
  sanitizeFavicon,
  sanitizeTitle,
  buildTabGhostHtml
};
