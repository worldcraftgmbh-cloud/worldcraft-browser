'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { extractTargetUrlFromArgs } = require('../services/url-helper');
const { DownloadService } = require('../services/download-service');
const { UpdateService } = require('../services/update-service');

const root = path.resolve(__dirname, '..');

test('Stability: extractTargetUrlFromArgs only allows http, https and file', () => {
  assert.equal(extractTargetUrlFromArgs(['app.exe', 'https://example.com/a']), 'https://example.com/a');
  assert.equal(extractTargetUrlFromArgs(['app.exe', 'http://example.com']), 'http://example.com');
  assert.equal(extractTargetUrlFromArgs(['app.exe', 'file:///C:/test.html']), 'file:///C:/test.html');

  for (const attack of ['javascript:alert(1)', 'javascript:alert(1).html', 'data:text/html,x.html', 'vbscript:x', 'custom://x']) {
    assert.equal(extractTargetUrlFromArgs(['app.exe', attack]), null, `${attack} must be rejected`);
  }

  // Windows-Laufwerkspfade bleiben als lokale HTML-Dateien erlaubt
  assert.equal(extractTargetUrlFromArgs(['C:\\docs\\a.html']).startsWith('file:///'), true);
});

test('Stability: DownloadService prunes finished downloads after 5 minutes', () => {
  const service = new DownloadService(root, { shell: {} });
  const now = Date.now();
  service.activeDownloads.set('old', { meta: { endTime: now - 6 * 60 * 1000 } });
  service.activeDownloads.set('recent', { meta: { endTime: now - 1000 } });
  service.activeDownloads.set('running', { meta: { endTime: null } });

  assert.equal(service.pruneFinishedDownloads(now), 1);
  assert.deepEqual([...service.activeDownloads.keys()].sort(), ['recent', 'running']);
  service.stopPruning();
});

test('Stability: UpdateService logs autoUpdater errors', () => {
  const handlers = {};
  const fakeUpdater = { on: (event, cb) => { handlers[event] = cb; } };
  const service = new UpdateService({ isPackaged: false, getVersion: () => '1.0.0' }, fakeUpdater);
  service.init();

  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    handlers.error(new Error('boom'));
  } finally {
    console.error = original;
  }

  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], 'AutoUpdater error:');
  assert.equal(service.getState().status, 'error');
});

test('Stability: Renderer keeps active tab drag on blur and closes the old tab only after detach succeeded', () => {
  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes("window.addEventListener('blur', cancelTabDragIfNotActive)"), true);
  assert.equal(rendererCode.includes("window.addEventListener('blur', cancelTabDrag)"), false, 'blur must not cancel an active drag');
  assert.equal(rendererCode.includes("document.addEventListener('visibilitychange'"), true);

  const detachIdx = rendererCode.indexOf('await tabsApi.detachToNewWindow(');
  const closeIdx = rendererCode.indexOf('await tabsApi.close(candidate.id)');
  assert.equal(detachIdx > -1 && closeIdx > detachIdx, true, 'old tab must be closed after detachToNewWindow resolved');
  assert.equal(rendererCode.includes('result.ok !== true'), true, 'detach result must be verified');
});

test('Stability: IPC window handlers are guarded and shortcut routing is robust', () => {
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(mainCode.includes("console.error('[detach-tab-to-new-window] Fehler:'"), true);
  assert.equal(mainCode.includes("console.error('[app:new-window] Fehler:'"), true);
  assert.equal(mainCode.includes('handleBrowserInputEvent(event, input, win, wc)'), true, 'views must pass their webContents');
  assert.equal(preloadCode.includes("console.error('[Worldcraft] detach-tab-to-new-window fehlgeschlagen:'"), true);
  assert.equal(preloadCode.includes("console.error('[Worldcraft] app:new-window fehlgeschlagen:'"), true);
});

test('Stability: Tab Drag Ghost helper and IPC contracts', () => {
  const { buildTabGhostHtml, sanitizeFavicon, sanitizeTitle } = require('../services/tab-ghost');
  assert.equal(typeof buildTabGhostHtml, 'function');
  const html = buildTabGhostHtml('<script>alert(1)</script>', 'https://example.com/fav.png');
  assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true, 'Title must be HTML-escaped');
  assert.equal(html.includes('https://example.com/fav.png'), true, 'Allowed favicon must be included');
  assert.equal(sanitizeFavicon('javascript:alert(1)'), null, 'Dangerous favicon scheme must be rejected');
  assert.equal(sanitizeFavicon('data:image/png;base64,abc'), 'data:image/png;base64,abc', 'Data image favicon must be allowed');

  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("ipcMain.handle('tab-drag:start'"), true, 'main.js must register tab-drag:start');
  assert.equal(mainCode.includes("ipcMain.handle('tab-drag:move'"), true, 'main.js must register tab-drag:move');
  assert.equal(mainCode.includes("ipcMain.handle('tab-drag:end'"), true, 'main.js must register tab-drag:end');
  assert.equal(mainCode.includes('getOrCreateDragGhostWindow'), true, 'main.js must manage ghost window');
  assert.equal(mainCode.includes('alwaysOnTop: true'), true, 'ghost window must be alwaysOnTop');
  assert.equal(mainCode.includes('focusable: false'), true, 'ghost window must be focusable: false');
  assert.equal(mainCode.includes('skipTaskbar: true'), true, 'ghost window must be skipTaskbar: true');

  const preloadCode = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  assert.equal(preloadCode.includes("ipcRenderer.invoke('tab-drag:start'"), true, 'preload.js must invoke tab-drag:start');
  assert.equal(preloadCode.includes("ipcRenderer.invoke('tab-drag:move'"), true, 'preload.js must invoke tab-drag:move');
  assert.equal(preloadCode.includes("ipcRenderer.invoke('tab-drag:end'"), true, 'preload.js must invoke tab-drag:end');
  assert.equal(preloadCode.includes('dragStart:'), true, 'preload.js must expose dragStart');
  assert.equal(preloadCode.includes('dragMove:'), true, 'preload.js must expose dragMove');
  assert.equal(preloadCode.includes('dragEnd:'), true, 'preload.js must expose dragEnd');

  const rendererCode = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
  assert.equal(rendererCode.includes('tabsApi.dragStart('), true, 'renderer.js must call dragStart on tear-off');
  assert.equal(rendererCode.includes('tabsApi.dragMove('), true, 'renderer.js must call dragMove while dragging');
  assert.equal(rendererCode.includes('.tabs.dragEnd()'), true, 'renderer.js must call dragEnd on drop/cancel');
});

test('Release: Default-Browser NSIS registration is wired into the installer', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.build.nsis.include, 'build/installer.nsh', 'package.json must include build/installer.nsh');

  const nsh = fs.readFileSync(path.join(root, 'build', 'installer.nsh'), 'utf8');
  for (const needle of [
    '!macro customInstall',
    '!macro customUnInstall',
    'Software\\Clients\\StartMenuInternet\\WorldcraftBrowser\\Capabilities\\URLAssociations',
    'Software\\Clients\\StartMenuInternet\\WorldcraftBrowser\\Capabilities\\FileAssociations',
    'Software\\RegisteredApplications',
    'WorldcraftBrowserURL',
    'WorldcraftBrowserHTML',
    'DeleteRegKey HKCU "Software\\Clients\\StartMenuInternet\\WorldcraftBrowser"'
  ]) {
    assert.equal(nsh.includes(needle), true, `installer.nsh must contain: ${needle}`);
  }
});

test('Release: Castlabs ECS (Widevine) build, components.whenReady and VMP hook', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(/castlabs\/electron-releases#v\d+\.\d+\.\d+\+wvcus$/.test(pkg.devDependencies.electron), true, 'electron must come from Castlabs ECS (+wvcus)');
  assert.equal(pkg.build.electronDist, 'node_modules/electron/dist', 'electron-builder must package the ECS binaries');
  assert.equal(pkg.build.afterSign, 'scripts/vmp-sign.js', 'afterSign must run the VMP signing hook');

  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes('components.whenReady()'), true, 'main.js must wait for components.whenReady()');
  assert.equal(mainCode.indexOf('await waitForWidevine()') < mainCode.indexOf('createMainWindow(startupUrl)'), true, 'Widevine must be awaited before the first window is created');

  const hook = fs.readFileSync(path.join(root, 'scripts', 'vmp-sign.js'), 'utf8');
  assert.equal(hook.includes('castlabs_evs.vmp'), true, 'hook must call castlabs_evs.vmp');
  assert.equal(hook.includes('sign-pkg'), true, 'hook must use sign-pkg');
  assert.equal(typeof require('../scripts/vmp-sign.js'), 'function', 'hook must export an async function');
});

test('Netflix / DRM: Global Google Chrome User-Agent prevents E100 error', () => {
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes('CHROME_USER_AGENT ='), true, 'main.js must define CHROME_USER_AGENT');
  assert.equal(mainCode.includes('app.userAgentFallback = CHROME_USER_AGENT'), true, 'main.js must set app.userAgentFallback');
  assert.equal(mainCode.includes('session.defaultSession.setUserAgent(CHROME_USER_AGENT)'), true, 'main.js must configure defaultSession UA');
  assert.equal(mainCode.includes('wc.setUserAgent(CHROME_USER_AGENT)'), true, 'main.js must enforce UA on external WebContentsView');

  // Verify dynamic UA definition matching real Chromium version
  assert.equal(mainCode.includes('realChromeVersion'), true, 'main.js must read realChromeVersion');
  assert.equal(mainCode.includes('realChromeMajor'), true, 'main.js must read realChromeMajor');
  assert.equal(mainCode.includes('Chrome/${realChromeVersion}'), true, 'UA must dynamically interpolate realChromeVersion');
  assert.equal(mainCode.includes('Windows NT 10.0'), true, 'UA must target Windows NT 10.0');

  // Verify DRM switches, permissions, plugins and diagnostics
  assert.equal(mainCode.includes("app.commandLine.appendSwitch('no-verify-widevine-cdm')"), false, 'main.js must not include blind flag no-verify-widevine-cdm');
  assert.equal(mainCode.includes("plugins: true"), true);
  assert.equal(mainCode.includes("protected-media-identifier"), true);
  assert.equal(mainCode.includes("mediaKeySystem"), true);
  assert.equal(mainCode.includes("sec-ch-ua"), true);
  assert.equal(mainCode.includes("components.status"), true, 'main.js must inspect components.status');
  assert.equal(mainCode.includes("process.versions"), true, 'main.js must log process.versions');
  assert.equal(mainCode.includes("ignore-gpu-blocklist"), false, 'main.js must not include unstable flag ignore-gpu-blocklist');
});

test('Stability: DownloadService deduplicates session registration', () => {
  const service = new DownloadService(root, { shell: {} });
  let listeners = 0;
  const mockSession = {
    on(event, handler) {
      if (event === 'will-download') listeners++;
    }
  };

  service.registerSession(mockSession);
  service.registerSession(mockSession);
  service.registerSession(mockSession);

  assert.equal(listeners, 1, 'registerSession must attach will-download exactly once per session');
  service.stopPruning();
});

test('Stability: Crash Guards and Scoped Permissions in main.js', () => {
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("wc.on('render-process-gone'"), true, 'must handle tab render-process-gone');
  assert.equal(mainCode.includes("app.on('render-process-gone'"), true, 'must handle global render-process-gone');
  assert.equal(mainCode.includes("app.on('child-process-gone'"), true, 'must handle child-process-gone');
  assert.equal(mainCode.includes("reqUrl.startsWith('https://')"), true, 'protected-media-identifier must be scoped to secure origins');
});

test('Shortcuts: F12 toggles DevTools docked at bottom (mode: bottom) on active WebContentsView or start screen', () => {
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes("input.key === 'F12' || code === 'F12'"), true, 'main.js must handle F12 in before-input-event routing');
  assert.equal(mainCode.includes('targetWc.isDevToolsOpened()'), true, 'main.js must check isDevToolsOpened for F12 toggle');
  assert.equal(mainCode.includes('targetWc.closeDevTools()'), true, 'main.js must close DevTools if already opened');
  assert.equal(mainCode.includes("targetWc.openDevTools({ mode: 'bottom' })"), true, 'main.js must open DevTools docked at bottom');
  assert.equal(mainCode.includes('!currentTab.isHome'), true, 'main.js must check if current tab is home');
  assert.equal(mainCode.includes('targetWc = (win && !win.isDestroyed() ? win.webContents'), true, 'main.js must fallback to win.webContents on start screen');
  assert.equal(mainCode.includes("input.key === 'F11' && !input.control && !input.alt && !input.meta"), true, 'F11 fullscreen shortcut must remain untouched');
});

test('Stability: Google Sign-in rejection handler informs user and preserves back navigation', () => {
  const mainCode = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.equal(mainCode.includes('function handleGoogleRejectedNotice(webContents)'), true, 'main.js must define handleGoogleRejectedNotice');
  assert.equal(mainCode.includes("currentUrl.includes('accounts.google.com') && currentUrl.includes('rejected')"), true, 'must target Google accounts rejected URLs');
  assert.equal(mainCode.includes('worldcraft-google-notice'), true, 'must inject user-friendly explanation notice');
  assert.equal(mainCode.includes('window.history.back()'), true, 'must provide back button to return to previous website');
});




