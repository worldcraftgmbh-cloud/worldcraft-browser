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

