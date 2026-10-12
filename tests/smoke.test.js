'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { normalizeUrl, SEARCH_ENGINES, BLOCKED_SCHEMES } = require('../services/url-helper');
const { StorageService, DEFAULT_SETTINGS, DEFAULT_FAVORITES } = require('../services/storage-service');
const { UpdateService } = require('../services/update-service');

test('Smoke: Required Project Files Exist', () => {
  const root = path.resolve(__dirname, '..');
  const requiredFiles = [
    'package.json',
    'main.js',
    'preload.js',
    'src/index.html',
    'src/renderer.js',
    'src/styles.css',
    'src/assets/worldcraft-logo.svg',
    'src/assets/worldcraft-icon.svg',
    'services/gemini-service.js',
    'services/ai-service.js',
    'services/storage-service.js',
    'services/url-helper.js',
    'services/download-service.js',
    'services/update-service.js',
    'src/settings.html',
    'src/settings.js',
    'src/locales.js',
    'src/error.html',
    'src/assets/datastream-globe.jpg',
    'src/assets/flags/de.svg',
    'src/assets/flags/en.svg',
    'src/assets/flags/es.svg',
    'src/assets/flags/fr.svg',
    'src/assets/flags/it.svg',
    'src/assets/flags/pl.svg',
    'src/assets/flags/uk.svg',
    'scripts/verify-build.js',
    'tests/download.test.js',
    'tests/forge.test.js',
    'build/README.md',
    'build/icon.ico',
    'build/installerSidebar.bmp',
    'build/installerHeader.bmp'
  ];

  for (const rel of requiredFiles) {
    const fullPath = path.join(root, rel);
    assert.equal(fs.existsSync(fullPath), true, `File must exist: ${rel}`);
  }
});

test('Smoke: URL Normalization & Search Routing', () => {
  // Valid HTTPS URL
  const res1 = normalizeUrl('https://example.com/matrix');
  assert.equal(res1.ok, true);
  assert.equal(res1.url, 'https://example.com/matrix');
  assert.equal(res1.isSearch, false);

  // Valid HTTP URL
  const res2 = normalizeUrl('http://insecure.site');
  assert.equal(res2.ok, true);
  assert.equal(res2.url, 'http://insecure.site/');

  // Domain without protocol
  const res3 = normalizeUrl('github.com/google');
  assert.equal(res3.ok, true);
  assert.equal(res3.url, 'https://github.com/google');

  // Search Query
  const res4 = normalizeUrl('cyberpunk 2077 phantom liberty', 'google');
  assert.equal(res4.ok, true);
  assert.equal(res4.isSearch, true);
  assert.equal(res4.url.includes('google.com/search?q='), true);
  assert.equal(res4.url.includes('cyberpunk'), true);

  // Search Engine switch (DuckDuckGo)
  const res5 = normalizeUrl('deepmind ai', 'duckduckgo');
  assert.equal(res5.ok, true);
  assert.equal(res5.url.startsWith('https://duckduckgo.com/?q='), true);

  // Internal protocol
  const res6 = normalizeUrl('internal://home');
  assert.equal(res6.ok, true);
  assert.equal(res6.url, 'internal://home');

  // Auto-completion of www. and TLDs (.de, .com, .org)
  const resWww = normalizeUrl('www.spiegel.de');
  assert.equal(resWww.ok, true);
  assert.equal(resWww.url, 'https://www.spiegel.de/');
  assert.equal(resWww.isSearch, false);

  const resDe = normalizeUrl('heise.de');
  assert.equal(resDe.ok, true);
  assert.equal(resDe.url, 'https://heise.de/');
  assert.equal(resDe.isSearch, false);

  const resOrg = normalizeUrl('wikipedia.org');
  assert.equal(resOrg.ok, true);
  assert.equal(resOrg.url, 'https://wikipedia.org/');
  assert.equal(resOrg.isSearch, false);
});

test('Smoke: Rejection of Dangerous URL Schemes', () => {
  const dangerous = [
    'javascript:alert(1)',
    'javascript:document.cookie',
    'file:///C:/Windows/System32',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'blob:https://evil.com/1234'
  ];

  for (const input of dangerous) {
    const res = normalizeUrl(input);
    assert.equal(res.ok, false, `Dangerous scheme must be rejected: ${input}`);
    assert.equal(typeof res.error, 'string');
  }
});

test('Smoke: StorageService Defaults and Atomic Operations', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-test-'));
  try {
    const storage = new StorageService(tempDir);

    // Default settings
    const settings = await storage.getSettings();
    assert.equal(settings.searchEngine, 'google');
    assert.equal(settings.geminiModel, 'gemini-3.8-flash');
    assert.equal(settings.audioVolume, 0.8);

    // Save partial settings
    const updated = await storage.saveSettings({ searchEngine: 'duckduckgo', audioVolume: 0.5 });
    assert.equal(updated.searchEngine, 'duckduckgo');
    assert.equal(updated.audioVolume, 0.5);

    // Re-read settings
    const reread = await storage.getSettings();
    assert.equal(reread.searchEngine, 'duckduckgo');
    assert.equal(reread.audioVolume, 0.5);

    // Default favorites
    const favs = await storage.getFavorites();
    assert.equal(Array.isArray(favs), true);
    assert.equal(favs.length >= 3, true);
    assert.equal(favs.some((f) => f.title.toLowerCase().includes('amazon')), false, 'Amazon must not be in default favorites');
    assert.equal(favs.some((f) => f.title === 'YouTube'), true, 'YouTube must be in default favorites');
    assert.equal(favs.some((f) => f.title === 'Twitch'), true, 'Twitch must be in default favorites');
    assert.equal(favs.some((f) => f.title === 'WorldCraft Radio'), true, 'WorldCraft Radio must be in default favorites');

    // Add and remove favorite
    const newFav = await storage.addFavorite({ title: 'Test Bookmark', url: 'https://test.io' });
    assert.equal(newFav.title, 'Test Bookmark');
    const withNew = await storage.getFavorites();
    assert.equal(withNew.some((f) => f.id === newFav.id), true);

    await storage.removeFavorite(newFav.id);
    const afterDelete = await storage.getFavorites();
    assert.equal(afterDelete.some((f) => f.id === newFav.id), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Smoke: StorageService Recovery from Corrupted Files', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-corrupt-test-'));
  try {
    const settingsPath = path.join(tempDir, 'settings.json');
    // Write invalid, corrupt JSON
    fs.writeFileSync(settingsPath, '{{{ INVALID JSON CORRUPTED DATA !!!');

    const storage = new StorageService(tempDir);
    const recovered = await storage.getSettings();

    // Must return valid defaults
    assert.equal(recovered.searchEngine, 'google');
    assert.equal(recovered.geminiModel, 'gemini-3.8-flash');

    // Warning must be registered
    assert.equal(storage.warnings.length > 0, true);

    // A backup file must have been generated
    const files = fs.readdirSync(tempDir);
    const hasBackup = files.some((f) => f.includes('.corrupt.'));
    assert.equal(hasBackup, true, 'Corrupt backup file must exist');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Smoke: package.json Configuration and Scripts', () => {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.name, 'worldcraft-browser');
  assert.equal(typeof pkg.scripts.start, 'string');
  assert.equal(typeof pkg.scripts.test, 'string');
  assert.equal(typeof pkg.scripts.verify, 'string');
  assert.equal(typeof pkg.scripts.build, 'string');

  assert.equal(pkg.build.appId, 'com.worldcraft.browser');
  assert.equal(pkg.build.productName, 'Worldcraft Browser');
  const winTarget = typeof pkg.build.win.target[0] === 'string'
    ? pkg.build.win.target[0]
    : pkg.build.win.target[0].target;
  assert.equal(winTarget, 'nsis');
});

test('Smoke: UpdateService and Cyberpunk Version Badge Contracts', async () => {
  const root = path.resolve(__dirname, '..');
  const mockApp = {
    isPackaged: false,
    getVersion: () => '1.0.0'
  };

  const updater = new UpdateService(mockApp);
  const state = updater.getState();
  assert.equal(state.status, 'idle');
  assert.equal(state.version, '1.0.0');
  assert.equal(state.currentVersion, '1.0.0');

  // Verify dev-mode update check triggers and transitions
  const statusEvents = [];
  updater.setListener((state) => {
    statusEvents.push(state.status);
  });

  const checkResult = await updater.checkForUpdates();
  assert.equal(checkResult.ok, true);
  assert.equal(checkResult.devMode, true);
  assert.equal(checkResult.message, 'SYSTEM UP TO DATE // KEINE UPDATES VORHANDEN');
  assert.equal(statusEvents.includes('checking'), true);
  assert.equal(statusEvents.includes('not-available'), true);

  // Verify settings.html contains cyberpunk version badge and terminal box
  const settingsHtml = fs.readFileSync(path.join(root, 'src', 'settings.html'), 'utf8');
  assert.equal(settingsHtml.includes('WORLDCRAFT CORE // V<span id="version-display-val">'), true);
  assert.equal(settingsHtml.includes('PROTOCOL STABLE'), true);
  assert.equal(settingsHtml.includes('CHECK FOR UPDATES'), true);
  assert.equal(settingsHtml.includes('id="updater-terminal-box"'), true);
  assert.equal(settingsHtml.includes('id="btn-restart-and-install"'), true);

  // Verify index.html contains cyberpunk version badge and terminal box
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('WORLDCRAFT CORE // V<span id="version-display-val">'), true);
  assert.equal(indexHtml.includes('CHECK FOR UPDATES'), true);
  assert.equal(indexHtml.includes('id="updater-terminal-box"'), true);
  assert.equal(indexHtml.includes('id="btn-restart-and-install"'), true);
});

test('Smoke: Localization (i18n) & Vector SVG Flags Integrity', () => {
  const root = path.resolve(__dirname, '..');
  const { LOCALES, LANGUAGE_NAMES } = require('../src/locales');

  const requiredLangs = ['de', 'en', 'es', 'fr', 'it', 'pl', 'uk'];
  const requiredKeys = [
    'lang_name', 'app_title', 'tab_new', 'tab_home', 'tab_close',
    'nav_back', 'nav_forward', 'nav_reload', 'url_placeholder',
    'sidebar_home', 'settings_title', 'settings_section_lang',
    'translate_banner_prefix', 'translate_banner_ask',
    'translate_btn_yes', 'translate_btn_no', 'translate_btn_original'
  ];

  for (const lang of requiredLangs) {
    assert.equal(Boolean(LOCALES[lang]), true, `Locale dictionary must exist: ${lang}`);
    assert.equal(Boolean(LANGUAGE_NAMES[lang]), true, `Language name meta must exist: ${lang}`);

    for (const key of requiredKeys) {
      assert.equal(typeof LOCALES[lang][key], 'string', `Locale ${lang} missing key: ${key}`);
      assert.equal(LOCALES[lang][key].length > 0, true, `Locale ${lang} key ${key} must not be empty`);
    }

    // Verify SVG flag exists and is valid vector SVG
    const flagPath = path.join(root, 'src', 'assets', 'flags', `${lang}.svg`);
    assert.equal(fs.existsSync(flagPath), true, `SVG flag must exist on disk: ${flagPath}`);
    const svgContent = fs.readFileSync(flagPath, 'utf8');
    assert.equal(svgContent.includes('<svg'), true, `File must be SVG: ${lang}.svg`);
    assert.equal(svgContent.includes('</svg>'), true, `File must be valid SVG: ${lang}.svg`);
  }

  // Verify English 50/50 split flag has clipPath
  const enSvg = fs.readFileSync(path.join(root, 'src', 'assets', 'flags', 'en.svg'), 'utf8');
  assert.equal(enSvg.includes('clipPath'), true, 'English flag must have clipPath 50/50 split');

  // Verify default storage setting has language
  assert.equal(DEFAULT_SETTINGS.language, 'de');
});

test('Smoke: Cyberpunk Error & Offline Pages Integrity', () => {
  const root = path.resolve(__dirname, '..');
  const errorHtmlPath = path.join(root, 'src', 'error.html');
  assert.equal(fs.existsSync(errorHtmlPath), true, 'src/error.html must exist on disk');

  const content = fs.readFileSync(errorHtmlPath, 'utf8');

  // Verify Offline-capability: No external http/https resources
  assert.equal(content.includes('src="http'), false, 'Error page must not load external scripts or images');
  assert.equal(content.includes('href="http'), false, 'Error page must not link external styles or fonts');
  assert.equal(content.includes('url(http'), false, 'Error page must not use external url styles');

  // Verify Cyberpunk Vector SVGs
  assert.equal(content.includes('id="icon-offline"'), true, 'Must include offline vector SVG container');
  assert.equal(content.includes('id="icon-notfound"'), true, 'Must include not-found vector SVG container');
  assert.equal(content.includes('strikethrough-bar'), true, 'Offline SVG must include strike-through bar');
  assert.equal(content.includes('fracture-bolt'), true, 'Offline SVG must include lightning fracture bolt');
  assert.equal(content.includes('floating-shard'), true, '404 SVG must include floating glitch shards');

  // Verify Cyberpunk HUD styling elements
  assert.equal(content.includes('scanlines'), true, 'Must include CRT scanlines');
  assert.equal(content.includes('--neon-red'), true, 'Must use neon red cyberpunk accent');
  assert.equal(content.includes('--neon-orange'), true, 'Must use neon orange cyberpunk accent');
  assert.equal(content.includes('id="btn-retry"'), true, 'Must include retry button');
  assert.equal(content.includes('id="btn-dashboard"'), true, 'Must include dashboard button');

  // Verify i18n integration in error.html
  assert.equal(content.includes('src="locales.js"'), true, 'Must import locales.js');
  assert.equal(content.includes('window.WORLDCRAFT_LOCALES'), true, 'Must read from WORLDCRAFT_LOCALES');

  // Verify all 7 language dictionaries contain required error keys
  const { LOCALES } = require('../src/locales');
  const errorKeys = [
    'error_offline_headline',
    'error_offline_desc',
    'error_notfound_headline',
    'error_notfound_desc',
    'error_btn_retry',
    'error_btn_dashboard',
    'error_code_label',
    'error_target_label'
  ];

  const langs = ['de', 'en', 'es', 'fr', 'it', 'pl', 'uk'];
  for (const lang of langs) {
    for (const key of errorKeys) {
      assert.equal(typeof LOCALES[lang][key], 'string', `Locale ${lang} missing error key: ${key}`);
      assert.equal(LOCALES[lang][key].length > 0, true, `Locale ${lang} error key ${key} must not be empty`);
    }
  }
});

test('Smoke: Internal Settings Tab & Overlay Z-Index Handling', () => {
  const root = path.resolve(__dirname, '..');

  // 1. URL Helper allows internal settings routing
  const res1 = normalizeUrl('internal://settings');
  assert.equal(res1.ok, true);
  assert.equal(res1.url, 'internal://settings');
  assert.equal(res1.isSearch, false);

  const res2 = normalizeUrl('worldcraft://settings');
  assert.equal(res2.ok, true);
  assert.equal(res2.url, 'worldcraft://settings');
  assert.equal(res2.isSearch, false);

  // 2. Index.html contains #settings-hud inside #viewport-container
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('id="settings-hud"'), true, 'Must include #settings-hud in index.html');
  assert.equal(indexHtml.includes('INTERNAL TAB'), true, 'Must badge internal settings tab');

  // 3. Styles.css contains settings-hud and downloads dropdown margin handling
  const stylesCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.equal(stylesCss.includes('#settings-hud'), true, 'Must style #settings-hud');
  assert.equal(stylesCss.includes('body.downloads-dropdown-open #viewport-container'), true, 'Must adjust bounds when dropdown is open');
  assert.equal(stylesCss.includes('margin-right: 480px;'), true, 'Must clear 480px on the right for dropdowns');

  // 4. Preload.js exposes setViewVisible and focus
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(preloadCode.includes('setViewVisible:'), true, 'Preload must expose setViewVisible');
  assert.equal(preloadCode.includes('focus:'), true, 'Preload must expose focus');
  assert.equal(preloadCode.includes('onViewFocused:'), true, 'Preload must expose onViewFocused');

  // 5. Main.js handles tabs:set-view-visible and tabs:focus
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("'tabs:set-view-visible'"), true, 'Main process must handle tabs:set-view-visible');
  assert.equal(mainCode.includes("'tabs:focus'"), true, 'Main process must handle tabs:focus');
  assert.equal(mainCode.includes("url === 'worldcraft://settings' || url === 'internal://settings'"), true, 'Main process must handle internal settings routing');
});

test('Smoke: Internal Downloads Tab & Standalone Cyberpunk Page', () => {
  const root = path.resolve(__dirname, '..');

  // 1. URL Helper allows internal downloads routing
  const res1 = normalizeUrl('internal://downloads');
  assert.equal(res1.ok, true);
  assert.equal(res1.url, 'internal://downloads');
  assert.equal(res1.isSearch, false);

  const res2 = normalizeUrl('worldcraft://downloads');
  assert.equal(res2.ok, true);
  assert.equal(res2.url, 'worldcraft://downloads');
  assert.equal(res2.isSearch, false);

  // 2. Standalone Download Page (src/downloads.html) exists & has full Cyberpunk UI
  const dlPagePath = path.join(root, 'src', 'downloads.html');
  assert.equal(fs.existsSync(dlPagePath), true, 'src/downloads.html must exist');
  const dlHtml = fs.readFileSync(dlPagePath, 'utf8');
  assert.equal(dlHtml.includes('WORLDCRAFT BROWSER // DOWNLOAD MANAGER'), true, 'Must include downloads title');
  assert.equal(dlHtml.includes('downloads.showInFolder'), true, 'Must call shell.showItemInFolder / downloads.showInFolder');
  assert.equal(dlHtml.includes('matrix-materialize-container'), true, 'Must include matrix data stream progress');
  assert.equal(dlHtml.includes('[ IM ORDNER ANZEIGEN ]'), true, 'Must include show in folder button');

  // 3. Main UI (src/index.html) has #downloads-hud inside #viewport-container
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('id="downloads-hud"'), true, 'Must include #downloads-hud in index.html');
  assert.equal(indexHtml.includes('id="downloads-hud-items"'), true, 'Must include #downloads-hud-items in index.html');
  assert.equal(indexHtml.includes('id="btn-hud-clear-downloads"'), true, 'Must include clear button in downloads HUD');

  // 4. Renderer has openDownloadsTab with Singleton handling
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes('function openDownloadsTab()'), true, 'Must implement openDownloadsTab');
  assert.equal(rendererCode.includes('currentTabs.find((t) => t.isDownloads'), true, 'Must implement singleton check');
  assert.equal(rendererCode.includes('renderDownloadsHud()'), true, 'Must render downloads HUD');

  // 5. Main process recognizes internal downloads tab and detaches external view
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("url === 'worldcraft://downloads' || url === 'internal://downloads'"), true, 'Must route internal downloads');
  assert.equal(mainCode.includes('!currentTab.isDownloads'), true, 'Must not attach external WebContentsView over downloads');
});

test('Smoke: Feedback & Bug Report Integration', () => {
  const root = path.resolve(__dirname, '..');
  const FEEDBACK_URL = 'https://form.jotform.com/262835970270058';

  // 1. Navigation header & sidebar buttons in src/index.html
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('id="btn-nav-feedback"'), true, 'Must include #btn-nav-feedback in header');
  assert.equal(indexHtml.includes('id="side-btn-feedback"'), true, 'Must include #side-btn-feedback in sidebar');
  assert.equal(indexHtml.includes('id="btn-settings-hud-feedback"'), true, 'Must include #btn-settings-hud-feedback in settings HUD');
  assert.equal(indexHtml.includes('data-i18n="settings_section_feedback"'), true, 'Must include Section 5 in settings HUD');

  // 2. Settings page (src/settings.html) includes Section 5 Feedback & Support
  const settingsHtml = fs.readFileSync(path.join(root, 'src', 'settings.html'), 'utf8');
  assert.equal(settingsHtml.includes('data-i18n="settings_section_feedback"'), true, 'Must include Section 5 in settings.html');
  assert.equal(settingsHtml.includes('id="btn-settings-feedback"'), true, 'Must include #btn-settings-feedback');

  // 3. Renderer and Settings scripts contain target Jotform URL and tab creation logic
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes(FEEDBACK_URL), true, 'Must contain target Jotform URL in renderer');
  assert.equal(rendererCode.includes('btnNavFeedback'), true, 'Must bind btnNavFeedback in renderer');

  const settingsCode = fs.readFileSync(path.join(root, 'src', 'settings.js'), 'utf8');
  assert.equal(settingsCode.includes(FEEDBACK_URL), true, 'Must contain target Jotform URL in settings.js');
  assert.equal(settingsCode.includes('btnSettingsFeedback'), true, 'Must bind btnSettingsFeedback in settings.js');

  // 4. Locales dictionary contains feedback keys
  const localesCode = fs.readFileSync(path.join(root, 'src', 'locales.js'), 'utf8');
  assert.equal(localesCode.includes('"nav_feedback"'), true, 'Must contain nav_feedback localization');
  assert.equal(localesCode.includes('"settings_section_feedback"'), true, 'Must contain settings_section_feedback localization');
  assert.equal(localesCode.includes('"settings_btn_feedback"'), true, 'Must contain settings_btn_feedback localization');
});

test('Smoke: Static Cyberpunk Background & New Tab Refactoring', () => {
  const root = path.resolve(__dirname, '..');

  // 1. Static Cyberpunk Background Image file exists and is high-quality
  const bgPath = path.join(root, 'src', 'assets', 'cyberpunk-bg.png');
  assert.equal(fs.existsSync(bgPath), true, 'src/assets/cyberpunk-bg.png must exist');
  const stat = fs.statSync(bgPath);
  assert.equal(stat.size > 50000, true, 'cyberpunk-bg.png must have substantial file size (>50KB)');

  // 2. CSS includes required background properties and dark gradient overlay
  const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.equal(css.includes("url('assets/cyberpunk-bg.png')"), true, 'Must reference assets/cyberpunk-bg.png');
  assert.equal(css.includes('background-size: cover'), true, 'Must use background-size: cover');
  assert.equal(css.includes('background-position: center'), true, 'Must use background-position: center');
  assert.equal(css.includes('background-repeat: no-repeat'), true, 'Must use background-repeat: no-repeat');
  assert.equal(css.includes('background-attachment: fixed'), true, 'Must use background-attachment: fixed');
  assert.equal(css.includes('linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7))'), true, 'Must include linear-gradient overlay');

  // 3. Canvas element for matrix rain is removed from index.html
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('id="matrix-canvas"'), false, 'matrix-canvas must be removed from index.html');

  // 4. Standalone src/newtab.html exists with static background and interactive search/speed dial
  const newtabPath = path.join(root, 'src', 'newtab.html');
  assert.equal(fs.existsSync(newtabPath), true, 'src/newtab.html must exist');
  const newtabHtml = fs.readFileSync(newtabPath, 'utf8');
  assert.equal(newtabHtml.includes("url('assets/cyberpunk-bg.png')"), true, 'newtab.html must reference cyberpunk-bg.png');
  assert.equal(newtabHtml.includes('id="home-search-form"'), true, 'newtab.html must include search form');
  assert.equal(newtabHtml.includes('speed-dial-grid'), true, 'newtab.html must include speed dial grid');
});

test('Smoke: Chrome-Style Settings Sidebar & Cyberpunk Background Customization', async () => {
  const root = path.resolve(__dirname, '..');

  // 1. StorageService has custom background defaults
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-bg-test-'));
  try {
    const storage = new StorageService(tempDir);
    const defaults = await storage.getSettings();
    assert.equal(defaults.customBackgroundMode, 'default');
    assert.equal(defaults.customBackgroundUrl, '');
    assert.equal(defaults.customBackgroundLocal, '');

    // Save and verify custom background settings
    const updated = await storage.saveSettings({
      customBackgroundMode: 'url',
      customBackgroundUrl: 'https://example.com/matrix.jpg'
    });
    assert.equal(updated.customBackgroundMode, 'url');
    assert.equal(updated.customBackgroundUrl, 'https://example.com/matrix.jpg');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // 2. Standalone settings page (src/settings.html) has 2-column Chrome sidebar layout
  const settingsHtml = fs.readFileSync(path.join(root, 'src', 'settings.html'), 'utf8');
  assert.equal(settingsHtml.includes('class="chrome-settings-layout"'), true, 'settings.html must have chrome-settings-layout');
  assert.equal(settingsHtml.includes('class="chrome-settings-sidebar"'), true, 'settings.html must have chrome-settings-sidebar');
  assert.equal(settingsHtml.includes('id="nav-item-appearance"'), true, 'settings.html must have appearance nav item');
  assert.equal(settingsHtml.includes('id="nav-item-search"'), true, 'settings.html must have search nav item');
  assert.equal(settingsHtml.includes('id="nav-item-ai"'), true, 'settings.html must have AI nav item');
  assert.equal(settingsHtml.includes('id="nav-item-languages"'), true, 'settings.html must have languages nav item');
  assert.equal(settingsHtml.includes('id="nav-item-tabs"'), true, 'settings.html must have tabs nav item');
  assert.equal(settingsHtml.includes('id="nav-item-about"'), true, 'settings.html must have about nav item');

  // Verify the 6 distinct content sections exist in settings.html
  assert.equal(settingsHtml.includes('id="section-appearance"'), true, 'settings.html must have section-appearance');
  assert.equal(settingsHtml.includes('id="section-search"'), true, 'settings.html must have section-search');
  assert.equal(settingsHtml.includes('id="section-ai"'), true, 'settings.html must have section-ai');
  assert.equal(settingsHtml.includes('id="section-languages"'), true, 'settings.html must have section-languages');
  assert.equal(settingsHtml.includes('id="section-tabs"'), true, 'settings.html must have section-tabs');
  assert.equal(settingsHtml.includes('id="section-about"'), true, 'settings.html must have section-about');

  // Verify Background Mode & Preview in settings.html
  assert.equal(settingsHtml.includes('name="customBgMode"'), true, 'settings.html must include customBgMode radio buttons');
  assert.equal(settingsHtml.includes('id="setting-bg-url"'), true, 'settings.html must include setting-bg-url');
  assert.equal(settingsHtml.includes('id="btn-apply-bg-url"'), true, 'settings.html must include btn-apply-bg-url');
  assert.equal(settingsHtml.includes('id="setting-bg-file"'), true, 'settings.html must include setting-bg-file');
  assert.equal(settingsHtml.includes('id="btn-choose-bg-file"'), true, 'settings.html must include btn-choose-bg-file');
  assert.equal(settingsHtml.includes('id="btn-reset-bg"'), true, 'settings.html must include btn-reset-bg');
  assert.equal(settingsHtml.includes('id="bg-preview-box"'), true, 'settings.html must include bg-preview-box');

  // Verify Search Engine dropdown in settings.html
  assert.equal(settingsHtml.includes('id="setting-search-select"'), true, 'settings.html must include search engine select dropdown');

  // Verify AI eye toggle, key test button, and live status indicator in settings.html
  assert.equal(settingsHtml.includes('id="btn-toggle-key-visibility"'), true, 'settings.html must include eye toggle button');
  assert.equal(settingsHtml.includes('id="btn-test-neural-key"'), true, 'settings.html must include test key button');
  assert.equal(settingsHtml.includes('id="ai-status-indicator"'), true, 'settings.html must include AI status indicator');

  // 3. Main Browser UI (src/index.html) #settings-hud has matching Chrome sidebar layout
  const indexHtml = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('class="chrome-settings-layout"'), true, 'index.html must have chrome-settings-layout');
  assert.equal(indexHtml.includes('id="hud-nav-item-appearance"'), true, 'index.html must have hud appearance nav item');
  assert.equal(indexHtml.includes('id="hud-section-appearance"'), true, 'index.html must have hud section appearance');
  assert.equal(indexHtml.includes('id="hud-setting-search-select"'), true, 'index.html must have search select dropdown');
  assert.equal(indexHtml.includes('id="hud-btn-toggle-key-visibility"'), true, 'index.html must have hud eye toggle button');
  assert.equal(indexHtml.includes('id="hud-btn-test-neural-key"'), true, 'index.html must have hud test key button');
  assert.equal(indexHtml.includes('id="hud-ai-status-indicator"'), true, 'index.html must have hud AI status indicator');

  // 4. Styles.css includes layout, preview, and indicator classes
  const stylesCss = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.equal(stylesCss.includes('.chrome-settings-layout'), true, 'styles.css must style .chrome-settings-layout');
  assert.equal(stylesCss.includes('.chrome-settings-sidebar'), true, 'styles.css must style .chrome-settings-sidebar');
  assert.equal(stylesCss.includes('.settings-nav-item.active'), true, 'styles.css must style active nav item');
  assert.equal(stylesCss.includes('.bg-preview-box'), true, 'styles.css must style background preview box');
  assert.equal(stylesCss.includes('.btn-eye-toggle'), true, 'styles.css must style eye toggle button');
  assert.equal(stylesCss.includes('.ai-status-indicator'), true, 'styles.css must style AI status indicator');

  // 5. Locales integrity across all 7 languages
  const { LOCALES } = require('../src/locales');
  const requiredKeys = [
    'settings_cat_appearance',
    'settings_cat_search',
    'settings_cat_ai',
    'settings_cat_languages',
    'settings_cat_tabs',
    'settings_cat_about',
    'settings_bg_title',
    'settings_bg_desc',
    'settings_bg_mode_default',
    'settings_bg_mode_url',
    'settings_bg_mode_local',
    'settings_bg_reset',
    'settings_bg_preview_title',
    'settings_search_select_label',
    'settings_ai_status_label',
    'settings_ai_status_active',
    'settings_ai_status_inactive',
    'settings_ai_btn_test'
  ];

  const langs = ['de', 'en', 'es', 'fr', 'it', 'pl', 'uk'];
  for (const lang of langs) {
    for (const key of requiredKeys) {
      assert.equal(typeof LOCALES[lang][key], 'string', `Locale ${lang} missing key: ${key}`);
      assert.equal(LOCALES[lang][key].length > 0, true, `Locale ${lang} key ${key} must not be empty`);
    }
  }

  // 6. Preload.js and main.js expose background and key test IPC channels
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(preloadCode.includes('testKey:'), true, 'Preload must expose testKey');
  assert.equal(preloadCode.includes('saveCustomBackground:'), true, 'Preload must expose saveCustomBackground');
  assert.equal(preloadCode.includes('onSettingsUpdated:'), true, 'Preload must expose onSettingsUpdated');

  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("'ai:test-key'"), true, 'Main process must handle ai:test-key');
  assert.equal(mainCode.includes("'settings:save-custom-background'"), true, 'Main process must handle settings:save-custom-background');
  assert.equal(mainCode.includes("'settings:updated'"), true, 'Main process must broadcast settings:updated');
});

test('Smoke: Default Browser Protocol Registration & File Associations', () => {
  const root = path.resolve(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  // 1. Verify electron-builder build.protocols
  assert.equal(Array.isArray(pkg.build?.protocols), true, 'package.json build must include protocols array');
  const httpProtocol = pkg.build.protocols.find((p) => p.schemes && p.schemes.includes('http') && p.schemes.includes('https'));
  assert.notEqual(httpProtocol, undefined, 'protocols must register http and https schemes');
  assert.equal(httpProtocol.name, 'HTTP-Verbindungen');

  // 2. Verify electron-builder build.fileAssociations
  assert.equal(Array.isArray(pkg.build?.fileAssociations), true, 'package.json build must include fileAssociations array');
  const htmlAssoc = pkg.build.fileAssociations.find((f) => f.ext === 'html');
  const htmAssoc = pkg.build.fileAssociations.find((f) => f.ext === 'htm');
  assert.notEqual(htmlAssoc, undefined, 'fileAssociations must register .html');
  assert.equal(htmlAssoc.role, 'Viewer');
  assert.notEqual(htmAssoc, undefined, 'fileAssociations must register .htm');
  assert.equal(htmAssoc.role, 'Viewer');

  // 3. Verify main.js protocol registration & deep linking logic
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("app.setAsDefaultProtocolClient('http')"), true, 'main.js must register http default protocol client');
  assert.equal(mainCode.includes("app.setAsDefaultProtocolClient('https')"), true, 'main.js must register https default protocol client');
  assert.equal(mainCode.includes('process.defaultApp'), true, 'main.js must check process.defaultApp for local dev registration');
  assert.equal(mainCode.includes("app.on('second-instance'"), true, 'main.js must register second-instance event handler');
  assert.equal(mainCode.includes('extractTargetUrlFromArgs'), true, 'main.js must use extractTargetUrlFromArgs');

  // 4. Unit test extractTargetUrlFromArgs helper
  const { extractTargetUrlFromArgs } = require('../services/url-helper');
  assert.equal(extractTargetUrlFromArgs(['worldcraft.exe', 'https://worldcraft.io/hub']), 'https://worldcraft.io/hub');
  assert.equal(extractTargetUrlFromArgs(['worldcraft.exe', 'http://example.com/test']), 'http://example.com/test');
  assert.equal(extractTargetUrlFromArgs(['electron.exe', '.', 'https://google.com']), 'https://google.com');
  assert.equal(extractTargetUrlFromArgs(['electron.exe', 'main.js', 'https://duckduckgo.com']), 'https://duckduckgo.com');
  assert.equal(extractTargetUrlFromArgs(['worldcraft.exe', '--some-flag', 'https://matrix.stream']), 'https://matrix.stream');

  const htmlResult = extractTargetUrlFromArgs(['worldcraft.exe', 'C:\\docs\\page.html']);
  assert.equal(htmlResult.includes('page.html'), true);
  assert.equal(htmlResult.startsWith('file:///'), true);

  const htmResult = extractTargetUrlFromArgs(['worldcraft.exe', 'C:\\docs\\index.htm']);
  assert.equal(htmResult.includes('index.htm'), true);
  assert.equal(htmResult.startsWith('file:///'), true);

  assert.equal(extractTargetUrlFromArgs(['worldcraft.exe', '--inspect', '--enable-features']), null);
  assert.equal(extractTargetUrlFromArgs([]), null);
  assert.equal(extractTargetUrlFromArgs(null), null);
});

test('Smoke: Fullscreen Optimization & Essential Browser Keyboard Shortcuts', () => {
  const root = path.resolve(__dirname, '..');

  // 1. Verify main.js Fullscreen implementation
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("wc.on('enter-html-full-screen'"), true, 'main.js must listen for enter-html-full-screen');
  assert.equal(mainCode.includes("wc.on('leave-html-full-screen'"), true, 'main.js must listen for leave-html-full-screen');
  assert.equal(mainCode.includes("mainWindow.setFullScreen("), true, 'main.js must control mainWindow.setFullScreen');
  assert.equal(mainCode.includes("'toggle-browser-ui'"), true, 'main.js must send toggle-browser-ui IPC signal');
  assert.equal(mainCode.includes("isBrowserFullScreen"), true, 'main.js must track isBrowserFullScreen state');

  // 2. Verify main.js Keyboard Shortcuts via before-input-event
  assert.equal(mainCode.includes("before-input-event"), true, 'main.js must register before-input-event handler');
  assert.equal(mainCode.includes("handleBrowserInputEvent"), true, 'main.js must define handleBrowserInputEvent');
  assert.equal(mainCode.includes("restoreLastClosedTab"), true, 'main.js must support restoring last closed tab (Ctrl+Shift+T)');
  assert.equal(mainCode.includes("switchNextTab"), true, 'main.js must support switching to next tab (Ctrl+Tab)');
  assert.equal(mainCode.includes("switchPreviousTab"), true, 'main.js must support switching to previous tab (Ctrl+Shift+Tab)');
  assert.equal(mainCode.includes("reloadActiveTab"), true, 'main.js must support reloadActiveTab');
  assert.equal(mainCode.includes("reloadIgnoringCache"), true, 'main.js must support reloadIgnoringCache (Ctrl+F5)');
  assert.equal(mainCode.includes("navigateActiveTabHistory"), true, 'main.js must support history navigation (Alt+Left/Right)');
  assert.equal(mainCode.includes("zoomActiveTab"), true, 'main.js must support zoom in/out/reset');
  assert.equal(mainCode.includes("'focus-url-input'"), true, 'main.js must send focus-url-input on Ctrl+L / Alt+D');

  // 3. Verify preload.js exposes onToggleBrowserUi and onFocusUrlInput
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(preloadCode.includes('onToggleBrowserUi:'), true, 'preload.js must expose onToggleBrowserUi');
  assert.equal(preloadCode.includes('onFocusUrlInput:'), true, 'preload.js must expose onFocusUrlInput');

  // 4. Verify renderer.js hooks into onToggleBrowserUi and onFocusUrlInput
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes('onToggleBrowserUi'), true, 'renderer.js must listen to onToggleBrowserUi');
  assert.equal(rendererCode.includes('fullscreen-mode'), true, 'renderer.js must toggle fullscreen-mode class');
  assert.equal(rendererCode.includes('onFocusUrlInput'), true, 'renderer.js must listen to onFocusUrlInput');

  // 5. Verify styles.css fullscreen rules for 100vw and 100vh without borders
  const stylesCode = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.equal(stylesCode.includes('body.fullscreen-mode #tab-bar'), true, 'styles.css must hide #tab-bar in fullscreen');
  assert.equal(stylesCode.includes('body.fullscreen-mode #nav-bar'), true, 'styles.css must hide #nav-bar in fullscreen');
  assert.equal(stylesCode.includes('body.fullscreen-mode #sidebar'), true, 'styles.css must hide #sidebar in fullscreen');
  assert.equal(stylesCode.includes('display: none !important'), true, 'styles.css must enforce display: none !important for chrome elements');
});

test('Smoke: Multi-Window Support & Tab Tear-off (Drag-out)', () => {
  const root = path.resolve(__dirname, '..');

  // 1. Multi-Window Management in main.js
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes('const windows = new Set()'), true, 'main.js must track windows dynamically in a Set');
  assert.equal(mainCode.includes('const activeTabByWindow = new Map()'), true, 'main.js must track active tab per window');
  assert.equal(mainCode.includes('createNewWindow') && mainCode.includes('createBrowserWindow'), true, 'main.js must provide createNewWindow / createBrowserWindow');
  assert.equal(mainCode.includes('windows.delete(win)'), true, 'main.js must remove closed windows from the Set');
  assert.equal(mainCode.includes('createNewWindow()') || mainCode.includes('createBrowserWindow()'), true, 'second-instance and Ctrl+N must call createNewWindow / createBrowserWindow');

  // 2. Ctrl + N Shortcut & globalShortcut for new browser window
  assert.equal(mainCode.includes("keyLower === 'n' || code === 'KeyN'"), true, 'main.js must handle Ctrl+N shortcut in before-input-event');
  assert.equal(mainCode.includes("globalShortcut.register('CommandOrControl+N'"), false, 'main.js must not register an OS-wide globalShortcut for Ctrl+N');
  assert.equal(mainCode.includes('[SHORTCUT TRIGGERED]'), true, 'main.js must log triggered shortcuts');
  assert.equal(mainCode.includes('resolveWindowForInput'), true, 'main.js must resolve the owning window for input events');

  // 3. Tab Drag-out Logik in src/renderer.js (Pointer & Mouse Events)
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes('tabDragCandidate'), true, 'Renderer must track tab drag candidate');
  assert.equal(rendererCode.includes("window.addEventListener('pointermove'"), true, 'Renderer must register pointermove handler');
  assert.equal(rendererCode.includes("window.addEventListener('pointerup'"), true, 'Renderer must register pointerup handler for tab tear-off');
  assert.equal(rendererCode.includes("window.addEventListener('mouseup'"), false, 'Renderer must not register redundant mouseup fallback');
  assert.equal(rendererCode.includes("window.addEventListener('mousemove'"), false, 'Renderer must not register redundant mousemove fallback');
  assert.equal(rendererCode.includes('detachToNewWindow'), true, 'Renderer must invoke detachToNewWindow on tab tear-off');
  assert.equal(rendererCode.includes('detachTab'), false, 'Renderer must not use legacy detachTab');
  assert.equal(rendererCode.includes('isOutside'), true, 'Renderer must detect dragging outside the tab bar or window');

  // 4. Preload.js API contract
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(preloadCode.includes('detachToNewWindow:'), true, 'preload.js must expose detachToNewWindow in tabs namespace');
  assert.equal(preloadCode.includes('detachTab'), false, 'preload.js must not expose legacy detachTab');
  assert.equal(preloadCode.includes("ipcRenderer.invoke('detach-tab-to-new-window'"), true, 'preload.js must invoke detach-tab-to-new-window channel');
  assert.equal(preloadCode.includes('newWindow:'), true, 'preload.js must expose newWindow in apps namespace');
  assert.equal(preloadCode.includes("assertBoolean(visible, 'visible')"), true, 'preload.js must validate setViewVisible argument');

  // 5. Main Process IPC Registration & Coordinates handling
  assert.equal(mainCode.includes("ipcMain.handle('detach-tab-to-new-window'"), true, 'main.js must register detach IPC handler');
  assert.equal(mainCode.includes("ipcMain.on('detach-tab-to-new-window'"), false, 'main.js must not register ipcMain.on for detach channel');
  assert.equal(mainCode.includes("'detach-tab'"), false, 'main.js must not keep legacy detach-tab channel');
  assert.equal(mainCode.includes('screen.getCursorScreenPoint()'), true, 'main.js must use screen cursor fallback');
  assert.equal(mainCode.includes('cursor.x - 120'), true, 'main.js must position new window near cursor');

  // 6. Cyberpunk CSS Styling for Drag and Tear-off
  const stylesCode = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.equal(stylesCode.includes('.tab-item.tab-dragging'), true, 'styles.css must style tabs during drag');
});

test('Smoke: Intelligent Omnibox, Navigation IPC, Native Context Menu, and Speed Dial Favicons', () => {
  const root = path.resolve(__dirname, '..');
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  const stylesCode = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

  // 1. Intelligent Omnibox (renderer.js)
  assert.equal(rendererCode.includes('resolveOmniboxTarget'), true, 'Renderer must have resolveOmniboxTarget');
  assert.equal(rendererCode.includes('google.com/search?q='), true, 'Renderer must route non-URLs to Google search');
  assert.equal(rendererCode.includes('https://${trimmed}'), true, 'Renderer must prefix https:// for domain inputs');

  // 2. Navigation IPC & State (main.js & preload.js & renderer.js)
  assert.equal(mainCode.includes("ipcMain.handle('tabs:back'"), true, 'main.js must handle tabs:back');
  assert.equal(mainCode.includes("ipcMain.handle('tabs:forward'"), true, 'main.js must handle tabs:forward');
  assert.equal(mainCode.includes("ipcMain.handle('tabs:reload'"), true, 'main.js must handle tabs:reload');
  assert.equal(mainCode.includes('notifyNavState'), true, 'main.js must implement notifyNavState');
  assert.equal(mainCode.includes("'tabs:nav-state'"), true, 'main.js must emit tabs:nav-state');
  assert.equal(preloadCode.includes('onNavigationStateChanged:'), true, 'preload.js must expose onNavigationStateChanged');
  assert.equal(rendererCode.includes('onNavigationStateChanged'), true, 'renderer.js must subscribe to onNavigationStateChanged');

  // 3. Native Context Menu (main.js)
  assert.equal(mainCode.includes('createNativeContextMenu'), true, 'main.js must implement createNativeContextMenu');
  assert.equal(mainCode.includes("wc.on('context-menu'"), true, 'main.js must register context-menu on wc');
  assert.equal(mainCode.includes('Bild speichern unter...'), true, 'main.js context menu must provide Save Image As');
  assert.equal(mainCode.includes('Link-Adresse kopieren'), true, 'main.js context menu must provide Copy Link Address');
  assert.equal(mainCode.includes('Element untersuchen'), true, 'main.js context menu must provide Inspect Element');

  // 4. Speed Dial Favicon & Fallback (renderer.js & styles.css)
  assert.equal(rendererCode.includes('google.com/s2/favicons?domain='), true, 'renderer.js must fetch favicons via public Favicon API');
  assert.equal(rendererCode.includes('fallbackChar'), true, 'renderer.js must have fallback letter for icons');
  assert.equal(stylesCode.includes('.speed-tile-icon img'), true, 'styles.css must style speed dial favicon images');
});









