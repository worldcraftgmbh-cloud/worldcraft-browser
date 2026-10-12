'use strict';

const path = require('path');

const SEARCH_ENGINES = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  brave: 'https://search.brave.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  ecosia: 'https://www.ecosia.org/search?q='
};

const BLOCKED_SCHEMES = [
  'javascript:',
  'data:',
  'file:',
  'vbscript:',
  'blob:',
  'chrome:',
  'edge:',
  'about:blank'
];

// Einzig erlaubte Protokolle für extern übergebene Startargumente / Deep-Links
const ALLOWED_ARG_PROTOCOLS = ['http:', 'https:', 'file:'];

/**
 * Checks if a string looks like a standard web domain or host
 * (starts with www., has a valid domain ending like .de, .com, .org, or localhost / IP)
 */
function isDomainLike(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (/\s/.test(trimmed)) return false; // Any space indicates a search query

  const lower = trimmed.toLowerCase();

  // Starts with www.
  if (lower.startsWith('www.')) return true;

  // Localhost with optional port/path
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return true;

  // IPv4 address with optional port/path
  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed)) return true;

  // Domain with TLD extension (e.g. .de, .com, .org, .net, .io, .ai, etc.)
  if (/^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Normalizes user input from the Cyber URL Bar into an executable navigation URL
 * @param {string} input - Raw user input
 * @param {string} defaultEngine - 'google' | 'duckduckgo' | 'bing' | 'ecosia'
 * @returns {{ ok: boolean, url?: string, isSearch?: boolean, error?: string }}
 */
function normalizeUrl(input, defaultEngine = 'google') {
  if (!input || typeof input !== 'string') {
    return { ok: false, error: 'Ungültige oder leere Eingabe.' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Die Eingabe darf nicht leer sein.' };
  }

  const lower = trimmed.toLowerCase();

  // Block dangerous schemes
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return {
        ok: false,
        error: `Das Schema "${scheme}" ist aus Sicherheitsgründen blockiert.`
      };
    }
  }

  // Allow internal schemes
  if (lower.startsWith('internal://') || lower.startsWith('worldcraft://')) {
    return {
      ok: true,
      url: trimmed,
      isSearch: false
    };
  }

  // Already standard HTTP / HTTPS
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Nur HTTP und HTTPS werden unterstützt.' };
      }
      return { ok: true, url: parsed.href, isSearch: false };
    } catch (err) {
      return { ok: false, error: 'Ungültige Webadresse.' };
    }
  }

  // Domain-like input (e.g. starts with "www." or contains domain ending like ".de", ".com", ".org", "localhost")
  if (isDomainLike(trimmed)) {
    try {
      const candidate = trimmed.toLowerCase().startsWith('http://') || trimmed.toLowerCase().startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      const parsed = new URL(candidate);
      return { ok: true, url: parsed.href, isSearch: false };
    } catch (err) {
      // Fallback to search if parsing fails
    }
  }

  // Otherwise treat as search query
  const engineBase = SEARCH_ENGINES[defaultEngine] || SEARCH_ENGINES.google;
  const searchUrl = `${engineBase}${encodeURIComponent(trimmed)}`;
  return {
    ok: true,
    url: searchUrl,
    isSearch: true
  };
}

/**
 * Extracts a target URL or HTML file path from command-line arguments (process.argv or second-instance commandLine)
 * @param {string[]} args - Process or instance arguments array
 * @returns {string | null}
 */
function extractTargetUrlFromArgs(args) {
  if (!Array.isArray(args) || args.length === 0) return null;

  for (const arg of args) {
    if (!arg || typeof arg !== 'string') continue;
    const trimmed = arg.trim();
    if (!trimmed) continue;

    // Ignore flags (e.g., --enable-features, --inspect, -d, /prefetch:1)
    if (trimmed.startsWith('-') || trimmed.startsWith('/')) continue;

    const lower = trimmed.toLowerCase();

    // Ignore executable paths and node/electron launch arguments
    if (lower.endsWith('.exe') || lower.endsWith('.cmd') || lower.endsWith('.bat')) continue;
    if (trimmed === '.' || trimmed === '..' || lower.endsWith('main.js') || lower === 'electron' || lower === 'electron.exe') continue;

    // Protokoll-Absicherung: Alles mit URL-Schema muss http:, https: oder file: sein.
    // Windows-Laufwerkspfade (C:\ oder C:/) sind keine Schemata.
    const isWindowsDrivePath = /^[a-zA-Z]:[\\/]/.test(trimmed);
    if (!isWindowsDrivePath && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      let protocol = null;
      try {
        protocol = new URL(trimmed).protocol;
      } catch (e) {
        protocol = null;
      }
      if (!protocol || !ALLOWED_ARG_PROTOCOLS.includes(protocol)) continue;
      return trimmed;
    }

    // Local HTML / HTM files (e.g. C:\document.html, test.htm)
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      try {
        const resolved = path.resolve(trimmed);
        const normalized = resolved.replace(/\\/g, '/');
        const prefix = normalized.startsWith('/') ? 'file://' : 'file:///';
        return `${prefix}${normalized}`;
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

module.exports = {
  normalizeUrl,
  extractTargetUrlFromArgs,
  SEARCH_ENGINES,
  BLOCKED_SCHEMES
};

