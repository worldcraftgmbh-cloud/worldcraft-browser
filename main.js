'use strict';

const { app, BrowserWindow, WebContentsView, ipcMain, safeStorage, shell, nativeTheme, Menu, globalShortcut, screen, clipboard, components, session, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { StorageService } = require('./services/storage-service');
const { GeminiService } = require('./services/gemini-service');
const { AiService } = require('./services/ai-service');
const { normalizeUrl, extractTargetUrlFromArgs } = require('./services/url-helper');
const { DownloadService } = require('./services/download-service');
const { UpdateService } = require('./services/update-service');
const { buildTabGhostHtml } = require('./services/tab-ghost');

// Dynamischer Google Chrome User-Agent basierend auf der echten Chromium-Version (verhindert Versionsdiskrepanzen)
const realChromeVersion = (process.versions && process.versions.chrome) || '130.0.6723.137';
const realChromeMajor = realChromeVersion.split('.')[0] || '130';
const CHROME_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${realChromeVersion} Safari/537.36`;
app.userAgentFallback = CHROME_USER_AGENT;

// Configure Dark Mode & Force Dark Chromium Feature
nativeTheme.themeSource = 'dark';
try {
  app.commandLine.appendSwitch('enable-features', 'WebContentsForceDark');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
} catch (e) {
  // Ignore flag warning if already started
}

// Enforce single instance & deep-linking handling
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Fange den Link aus den Prozess-Argumenten ab, extrahiere die URL
    const url = extractTargetUrlFromArgs(commandLine);
    if (url) {
      // Wenn eine externe URL übergeben wurde, fokussiere das Fenster und öffne einen Tab
      const activeWin = BrowserWindow.getFocusedWindow() || mainWindow;
      if (activeWin && !activeWin.isDestroyed()) {
        if (activeWin.isMinimized()) activeWin.restore();
        activeWin.focus();
        createNewTab(url, true, activeWin);
      } else {
        createNewWindow(url);
      }
    } else {
      // Wenn 'second-instance' ausgelöst wird und KEINE URL übergeben wurde (Nutzer klickt einfach auf die App):
      // Rufe createNewWindow() auf, statt nur das bestehende Fenster zu fokussieren!
      createNewWindow();
    }
  });
}

let mainWindow = null;
let storageService = null;
let geminiService = null;
let aiService = null;
let downloadService = null;
let updateService = null;

// OBS Dev-Forge internal server on localhost:4884
const OBS_PORT = 4884;
let widgetsServer = null;

function startWidgetsServer() {
  const widgetsDir = path.join(app.getPath('userData'), 'widgets');
  if (!fs.existsSync(widgetsDir)) {
    fs.mkdirSync(widgetsDir, { recursive: true });
  }

  widgetsServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://localhost:${OBS_PORT}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);

      if (pathname.startsWith('/widgets/')) {
        const rawFileName = pathname.slice('/widgets/'.length);
        const safeName = path.basename(rawFileName);
        const filePath = path.join(widgetsDir, safeName);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
          };
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/html; charset=utf-8' });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      if (pathname === '/' || pathname === '/widgets') {
        const files = fs.readdirSync(widgetsDir).filter((f) => f.endsWith('.html'));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: 'online',
          port: OBS_PORT,
          directory: widgetsDir,
          widgets: files.map((f) => ({
            name: path.basename(f, '.html'),
            filename: f,
            url: `http://localhost:${OBS_PORT}/widgets/${f}`
          }))
        }, null, 2));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Widget not found on Worldcraft OBS Server (Port ${OBS_PORT}).`);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Server Error: ${err.message}`);
    }
  });

  widgetsServer.listen(OBS_PORT, '127.0.0.1', () => {
    console.log(`[OBS Forge] Internal widgets server running on http://localhost:${OBS_PORT}`);
  });

  widgetsServer.on('error', (err) => {
    console.warn(`[OBS Forge] Server error on port ${OBS_PORT}:`, err.message);
  });
}

// Tab State Store
// Tab object: { id, windowId, url, title, favicon, isLoading, canGoBack, canGoForward, isHome, isForge, error, view }
const tabs = new Map();
let activeTabId = null;

// Multi-Window State Store
const windows = new Set();
const activeTabByWindow = new Map();
const windowViewportBounds = new Map();

function getWindowForEvent(event) {
  if (event && event.sender) {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) return win;
  }
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return windows.values().next().value || null;
}

function getWindowForTab(tab) {
  if (!tab) return mainWindow;
  if (tab.windowId) {
    for (const win of windows) {
      if (!win.isDestroyed() && win.id === tab.windowId) return win;
    }
  }
  return BrowserWindow.getFocusedWindow() || mainWindow || windows.values().next().value || null;
}

// Viewport layout bounds for the active WebContentsView inside browser windows
let isTranslateBannerVisible = false;
let isViewTemporarilyHidden = false;
let isBrowserFullScreen = false;
let currentViewportBounds = {
  x: 56, // left sidebar width
  y: 84, // top tab bar (40px) + nav bar (44px)
  width: 1200,
  height: 700
};

function recalculateViewportBounds(targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win || win.isDestroyed()) return;
  const [winWidth, winHeight] = win.getContentSize();
  if (isBrowserFullScreen) {
    currentViewportBounds = {
      x: 0,
      y: 0,
      width: winWidth,
      height: winHeight
    };
    windowViewportBounds.set(win.id, currentViewportBounds);
    return;
  }
  const topOffset = isTranslateBannerVisible ? 122 : 84;
  currentViewportBounds = {
    x: 56,
    y: topOffset,
    width: Math.max(0, winWidth - 56),
    height: Math.max(0, winHeight - topOffset)
  };
  windowViewportBounds.set(win.id, currentViewportBounds);
}

function setBrowserFullScreen(full, targetWin = null) {
  isBrowserFullScreen = Boolean(full);
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  if (win && !win.isDestroyed()) {
    if (win.isFullScreen() !== isBrowserFullScreen) {
      win.setFullScreen(isBrowserFullScreen);
    }
    win.webContents.send('toggle-browser-ui', !isBrowserFullScreen);
    recalculateViewportBounds(win);
    updateActiveViewPlacement(win);
  }
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow !== win) {
    mainWindow.setFullScreen(isBrowserFullScreen);
    mainWindow.webContents.send('toggle-browser-ui', !isBrowserFullScreen);
  }
}

// Detached standalone app windows
const detachedWindows = new Set();

// Tab Drag Ghost / Floating Tab Preview Window
let dragGhostWindow = null;

function getOrCreateDragGhostWindow() {
  if (dragGhostWindow && !dragGhostWindow.isDestroyed()) {
    return dragGhostWindow;
  }

  dragGhostWindow = new BrowserWindow({
    width: 220,
    height: 36,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false
    }
  });

  if (typeof dragGhostWindow.setIgnoreMouseEvents === 'function') {
    dragGhostWindow.setIgnoreMouseEvents(true);
  }

  dragGhostWindow.on('closed', () => {
    dragGhostWindow = null;
  });

  return dragGhostWindow;
}

function isTrustedSender(sender) {
  if (!sender) return false;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents === sender) return true;
  for (const win of windows) {
    if (win && !win.isDestroyed() && win.webContents === sender) return true;
  }
  return false;
}

/**
 * Validates that an IPC call originates exclusively from the trusted main window renderer
 */
function assertTrustedSender(event) {
  if (!event || !isTrustedSender(event.sender)) {
    throw new Error('Untrusted sender');
  }
}

/**
 * Serializes tab state for the renderer process (stripping internal view references)
 */
function getSerializableTabState(win = null) {
  const targetWin = win || (mainWindow && !mainWindow.isDestroyed() ? mainWindow : (windows.values().next().value || null));
  const targetWinId = targetWin ? targetWin.id : null;

  const tabsList = [];
  for (const [id, tab] of tabs.entries()) {
    if (targetWinId && tab.windowId && tab.windowId !== targetWinId) {
      continue;
    }
    tabsList.push({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
      isHome: tab.isHome,
      isForge: Boolean(tab.isForge),
      isSettings: Boolean(tab.isSettings),
      isDownloads: Boolean(tab.isDownloads),
      isErrorPage: Boolean(tab.isErrorPage),
      error: tab.error
    });
  }

  const effectiveActiveTabId = targetWinId ? (activeTabByWindow.get(targetWinId) || activeTabId) : activeTabId;
  return {
    tabs: tabsList,
    activeTabId: effectiveActiveTabId
  };
}

/**
 * Broadcasts tab state updates to the main renderer
 */
function broadcastTabState(targetWin = null) {
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.webContents.send('tabs:updated', getSerializableTabState(targetWin));
    return;
  }
  for (const win of windows) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('tabs:updated', getSerializableTabState(win));
    }
  }
  if (mainWindow && !mainWindow.isDestroyed() && !windows.has(mainWindow)) {
    mainWindow.webContents.send('tabs:updated', getSerializableTabState(mainWindow));
  }
}

/**
 * Notifies all windows or target window about navigation capability change (canGoBack, canGoForward)
 */
function notifyNavState(tabId, wc, targetWin = null) {
  if (!wc || wc.isDestroyed()) return;
  const data = {
    tabId,
    canGoBack: wc.canGoBack(),
    canGoForward: wc.canGoForward()
  };
  if (targetWin && !targetWin.isDestroyed()) {
    targetWin.webContents.send('tabs:nav-state', data);
  } else {
    for (const w of windows) {
      if (w && !w.isDestroyed()) {
        w.webContents.send('tabs:nav-state', data);
      }
    }
  }
}

/**
 * Builds and pops up a native context menu based on right-click target
 */
function createNativeContextMenu(wc, params, win = null) {
  if (!wc || wc.isDestroyed()) return;
  const targetWin = win && !win.isDestroyed() ? win : (BrowserWindow.getFocusedWindow() || mainWindow);
  const menuTemplate = [];

  // 1. Link-Aktionen
  if (params.linkURL) {
    menuTemplate.push(
      {
        label: 'Link in neuem Tab öffnen',
        click: () => {
          createNewTab(params.linkURL, true, targetWin);
        }
      },
      {
        label: 'Link-Adresse kopieren',
        click: () => {
          clipboard.writeText(params.linkURL);
        }
      }
    );
  }

  // 2. Bild-Aktionen
  if (params.mediaType === 'image' || (params.srcURL && params.hasImageContents)) {
    if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
    menuTemplate.push(
      {
        label: 'Bild in neuem Tab öffnen',
        click: () => {
          createNewTab(params.srcURL, true, targetWin);
        }
      },
      {
        label: 'Bild speichern unter...',
        click: () => {
          try {
            wc.downloadURL(params.srcURL);
          } catch (dlErr) {
            console.error('Download image error:', dlErr);
          }
        }
      },
      {
        label: 'Bildadresse kopieren',
        click: () => {
          clipboard.writeText(params.srcURL);
        }
      }
    );
  }

  // 3. Textauswahl-Aktionen
  if (params.selectionText && params.selectionText.trim()) {
    if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
    const selected = params.selectionText.trim();
    const shortLabel = selected.length > 25 ? selected.slice(0, 22) + '...' : selected;
    menuTemplate.push(
      {
        label: 'Kopieren',
        role: 'copy'
      },
      {
        label: `In Google suchen nach "${shortLabel}"`,
        click: () => {
          createNewTab(`https://www.google.com/search?q=${encodeURIComponent(selected)}`, true, targetWin);
        }
      }
    );
  }

  // 4. Eingabefelder (Undo, Redo, Cut, Copy, Paste, Select All)
  if (params.isEditable) {
    if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
    menuTemplate.push(
      { label: 'Rückgängig', role: 'undo', enabled: Boolean(params.editFlags && params.editFlags.canUndo) },
      { label: 'Wiederholen', role: 'redo', enabled: Boolean(params.editFlags && params.editFlags.canRedo) },
      { type: 'separator' },
      { label: 'Ausschneiden', role: 'cut', enabled: Boolean(params.editFlags && params.editFlags.canCut) },
      { label: 'Kopieren', role: 'copy', enabled: Boolean(params.editFlags && params.editFlags.canCopy) },
      { label: 'Einfügen', role: 'paste', enabled: Boolean(params.editFlags && params.editFlags.canPaste) },
      { label: 'Alles auswählen', role: 'selectAll' }
    );
  }

  // 5. Standard-Aktionen im freien Raum (Zurück, Vorwärts, Neu laden)
  if (!params.linkURL && params.mediaType !== 'image') {
    if (menuTemplate.length > 0) menuTemplate.push({ type: 'separator' });
    menuTemplate.push(
      {
        label: 'Zurück',
        enabled: wc.canGoBack(),
        click: () => {
          if (wc.canGoBack()) wc.goBack();
        }
      },
      {
        label: 'Vorwärts',
        enabled: wc.canGoForward(),
        click: () => {
          if (wc.canGoForward()) wc.goForward();
        }
      },
      {
        label: 'Neu laden',
        click: () => {
          wc.reload();
        }
      }
    );

    if (!params.selectionText && !params.isEditable && params.editFlags) {
      if (params.editFlags.canCopy) {
        menuTemplate.push({ type: 'separator' });
        menuTemplate.push({ label: 'Kopieren', role: 'copy' });
      }
      if (params.editFlags.canPaste) {
        menuTemplate.push({ label: 'Einfügen', role: 'paste' });
      }
    }
  }

  // 6. Entwickler-Tools / Element untersuchen
  menuTemplate.push(
    { type: 'separator' },
    {
      label: 'Element untersuchen',
      click: () => {
        wc.inspectElement(params.x, params.y);
        if (wc.isDevToolsOpened()) {
          wc.devToolsWebContents.focus();
        }
      }
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  contextMenu.popup({ window: targetWin });
}

/**
 * Applies security policies to external web contents
 */
function configureExternalWebContents(view, tabId, win = null) {
  const wc = view.webContents;
  wc.setUserAgent(CHROME_USER_AGENT);

  if (downloadService) {
    downloadService.registerSession(wc.session);
  }

  // Globales Abfangen von window.open / target="_blank":
  // Verhindert separates OS/Electron-Fenster und leitet alle Links intern an createNewTab weiter.
  wc.setWindowOpenHandler(({ url }) => {
    createNewTab(url);
    return { action: 'deny' };
  });

  // Block dangerous schemes during navigation & intercept internal URLs
  wc.on('will-navigate', (event, navigationUrl) => {
    const lower = navigationUrl.toLowerCase();
    if (lower === 'internal://home' || lower === 'worldcraft://home') {
      event.preventDefault();
      navigateTab(tabId, 'internal://home');
      return;
    }
    if (lower === 'internal://settings' || lower === 'worldcraft://settings') {
      event.preventDefault();
      navigateTab(tabId, 'worldcraft://settings');
      return;
    }
    if (lower === 'internal://downloads' || lower === 'worldcraft://downloads') {
      event.preventDefault();
      navigateTab(tabId, 'internal://downloads');
      return;
    }
    if (lower === 'internal://dev-forge' || lower === 'worldcraft://dev-forge') {
      event.preventDefault();
      navigateTab(tabId, 'worldcraft://dev-forge');
      return;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://') || lower.startsWith('blob:') || lower.startsWith('data:')) {
      return; // Allowed
    }
    event.preventDefault();
  });

  wc.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('view:focused', { tabId });
    }
  });

  wc.on('will-redirect', (event, redirectUrl) => {
    const lower = redirectUrl.toLowerCase();
    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://') || lower.startsWith('blob:') || lower.startsWith('data:')) {
      return; // Allowed
    }
    event.preventDefault();
  });

  // Renderer-Absturz-Schutz fuer WebContents
  wc.on('render-process-gone', (event, details) => {
    console.error(`[Worldcraft Tab Crash] Tab ${tabId} render-process-gone: reason=${details.reason}, exitCode=${details.exitCode}`);
    const tab = tabs.get(tabId);
    if (tab) {
      tab.isLoading = false;
      tab.error = `Tab abgestürzt: ${details.reason} (Code ${details.exitCode})`;
      tab.isErrorPage = true;
      const tabWin = win || getWindowForTab(tab);
      broadcastTabState(tabWin);
      notifyNavState(tabId, wc, tabWin);

      if (!wc.isDestroyed()) {
        try {
          const errorPagePath = path.join(__dirname, 'src', 'error.html');
          wc.loadFile(errorPagePath, {
            query: {
              type: 'not_found',
              code: String(details.exitCode),
              desc: `Prozess-Absturz (${details.reason})`,
              url: tab.url || '',
              lang: 'de'
            }
          }).catch(() => {});
        } catch (e) {}
      }
    }
  });

  wc.on('unresponsive', () => {
    console.warn(`[Worldcraft Crash Guard] Tab ${tabId} webContents unresponsive.`);
  });

  wc.on('responsive', () => {
    console.info(`[Worldcraft Crash Guard] Tab ${tabId} webContents responsive again.`);
  });

  // WebContents event tracking
  wc.on('did-start-loading', () => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.isLoading = true;
      tab.error = null;
      broadcastTabState();
    }
  });

  wc.on('did-stop-loading', async () => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.isLoading = false;
      tab.canGoBack = wc.canGoBack();
      tab.canGoForward = wc.canGoForward();
      const tabWin = win || getWindowForTab(tab);
      broadcastTabState(tabWin);
      notifyNavState(tabId, wc, tabWin);

      // Automatic Language Detection for Page Translation Banner
      if (!tab.isHome && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try {
          const detected = await wc.executeJavaScript(`
            (() => {
              const htmlLang = document.documentElement.lang || document.querySelector('html')?.getAttribute('lang') || '';
              const metaLang = document.querySelector('meta[http-equiv="content-language"]')?.content || '';
              return (htmlLang || metaLang || navigator.language || '').toLowerCase().trim();
            })()
          `);
          if (detected) {
            const raw = detected.split('-')[0].split('_')[0].toLowerCase();
            tab.detectedLanguage = raw;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('page:language-detected', {
                tabId: tab.id,
                url: tab.url,
                lang: raw
              });
            }
          }
        } catch (err) {
          // Ignore evaluation errors
        }
      }
    }
  });

  wc.on('page-title-updated', (event, title) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.title = title || 'Untitled';
      broadcastTabState(win || getWindowForTab(tab));
    }
  });

  wc.on('page-favicon-updated', (event, favicons) => {
    const tab = tabs.get(tabId);
    if (tab) {
      tab.favicon = (favicons && favicons[0]) ? favicons[0] : null;
      broadcastTabState(win || getWindowForTab(tab));
    }
  });

  wc.on('did-fail-load', async (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (errorCode === -3) return; // Aborted by user
    if (isMainFrame === false) return; // Only trigger for main frame
    if (validatedURL && (validatedURL.includes('error.html') || validatedURL.startsWith('data:'))) return;

    const tab = tabs.get(tabId);
    if (!tab) return;

    tab.isLoading = false;
    tab.error = `${errorDescription} (${errorCode})`;
    const originalUrl = validatedURL || tab.url || '';
    tab.failedUrl = originalUrl;
    tab.isErrorPage = true;
    const tabWin = win || getWindowForTab(tab);
    broadcastTabState(tabWin);
    notifyNavState(tabId, wc, tabWin);

    // Determine error type: offline vs not found / unreachable
    const descUpper = String(errorDescription || '').toUpperCase();
    const isOffline = errorCode === -106 || // ERR_INTERNET_DISCONNECTED
                      errorCode === -21 ||  // ERR_NETWORK_CHANGED
                      errorCode === -109 || // ERR_ADDRESS_UNREACHABLE
                      descUpper.includes('INTERNET_DISCONNECTED') ||
                      descUpper.includes('NETWORK_CHANGED') ||
                      descUpper.includes('OFFLINE');

    const errorType = isOffline ? 'offline' : 'not_found';

    try {
      const settings = await storageService.getSettings();
      const lang = settings.language || 'de';
      const errorPagePath = path.join(__dirname, 'src', 'error.html');

      if (!wc.isDestroyed()) {
        await wc.loadFile(errorPagePath, {
          query: {
            type: errorType,
            code: String(errorCode),
            desc: errorDescription || '',
            url: originalUrl,
            lang: lang
          }
        });
      }
    } catch (loadErr) {
      // Fallback
    }
  });

  wc.on('did-navigate', (event, url) => {
    const tab = tabs.get(tabId);
    if (tab) {
      const tabWin = win || getWindowForTab(tab);
      if (url && (url.includes('error.html') || (url.startsWith('file:') && url.includes('error.html')))) {
        tab.isErrorPage = true;
        tab.title = `[!] ${tab.failedUrl || 'Fehler'}`;
        tab.canGoBack = wc.canGoBack();
        tab.canGoForward = wc.canGoForward();
        broadcastTabState(tabWin);
        notifyNavState(tabId, wc, tabWin);
        return;
      }
      tab.isErrorPage = false;
      tab.failedUrl = null;
      tab.url = url;
      tab.isHome = false;
      tab.canGoBack = wc.canGoBack();
      tab.canGoForward = wc.canGoForward();
      broadcastTabState(tabWin);
      notifyNavState(tabId, wc, tabWin);
      if (tabId === activeTabId && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('tabs:active-changed', { tabId, url, title: tab.title });
      }
    }
  });

  wc.on('did-navigate-in-page', (event, url) => {
    const tab = tabs.get(tabId);
    if (tab) {
      const tabWin = win || getWindowForTab(tab);
      tab.url = url;
      tab.canGoBack = wc.canGoBack();
      tab.canGoForward = wc.canGoForward();
      broadcastTabState(tabWin);
      notifyNavState(tabId, wc, tabWin);
    }
  });

  // Native Context-Menu for WebContentsView
  wc.on('context-menu', (event, params) => {
    event.preventDefault();
    createNativeContextMenu(wc, params, win || getWindowForTab(tabs.get(tabId)));
  });

  // HTML5 Fullscreen (YouTube, Vimeo, etc.)
  wc.on('enter-html-full-screen', () => {
    setBrowserFullScreen(true);
  });

  wc.on('leave-html-full-screen', () => {
    setBrowserFullScreen(false);
  });

  // Global Keyboard Shortcuts on WebContents (genau ein Listener pro View, mit zugehörigem Fenster)
  wc.on('before-input-event', (event, input) => {
    handleBrowserInputEvent(event, input, win, wc);
  });
}

/**
 * Mounts or unmounts the active tab's WebContentsView inside the main window
 */
/**
 * Mounts or unmounts the active tab's WebContentsView inside the target browser window
 */
function updateActiveViewPlacement(targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  if (!win || win.isDestroyed()) return;

  const currentActiveId = activeTabByWindow.get(win.id) || (win === mainWindow ? activeTabId : null);
  const currentTab = tabs.get(currentActiveId);

  // Remove any previously attached child views from contentView safely
  try {
    const children = Array.from(win.contentView.children || []);
    for (const child of children) {
      if (child) {
        try { win.contentView.removeChildView(child); } catch (e) {}
      }
    }
  } catch (e) {}

  // If the active tab has an external view and is not on home screen/internal views, attach it safely
  if (currentTab && !currentTab.isHome && !currentTab.isForge && !currentTab.isSettings && !currentTab.isDownloads && currentTab.view) {
    if (currentTab.view.webContents && currentTab.view.webContents.isDestroyed()) {
      return;
    }
    if (!isViewTemporarilyHidden) {
      try {
        recalculateViewportBounds(win);
        const bounds = windowViewportBounds.get(win.id) || currentViewportBounds;
        win.contentView.addChildView(currentTab.view);
        currentTab.view.setBounds(bounds);
      } catch (err) {
        console.error('[Worldcraft View] Failed to attach view to window:', err.message);
      }
    }
    if (typeof currentTab.view.setVisible === 'function') {
      try {
        currentTab.view.setVisible(!isViewTemporarilyHidden);
      } catch (e) {}
    }
  }
}

/**
 * Creates a new tab
 */
function createNewTab(url = '', activateImmediately = true, targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || (mainWindow && !mainWindow.isDestroyed() ? mainWindow : null) || windows.values().next().value || null;
  const id = `tab-${crypto.randomUUID()}`;
  let trimmed = url ? url.trim() : '';

  // Local HTML / HTM file path resolution (convert to file:/// URL if not already a protocol)
  if (trimmed && (trimmed.toLowerCase().endsWith('.html') || trimmed.toLowerCase().endsWith('.htm')) && !trimmed.includes('://')) {
    try {
      trimmed = pathToFileURL(path.resolve(trimmed)).href;
    } catch (e) {}
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const isForge = lowerTrimmed === 'worldcraft://dev-forge' || lowerTrimmed === 'internal://dev-forge';
  const isSettings = lowerTrimmed === 'worldcraft://settings' || lowerTrimmed === 'internal://settings';
  const isDownloads = lowerTrimmed === 'worldcraft://downloads' || lowerTrimmed === 'internal://downloads';
  const isInternalScheme = lowerTrimmed.startsWith('worldcraft://') || lowerTrimmed.startsWith('internal://');
  const isHome = !trimmed || isInternalScheme || isForge || isSettings || isDownloads;

  const tab = {
    id: id,
    windowId: win ? win.id : (mainWindow ? mainWindow.id : 1),
    url: isForge ? 'worldcraft://dev-forge' : (isSettings ? 'worldcraft://settings' : (isDownloads ? 'internal://downloads' : (isHome ? '' : trimmed))),
    title: isForge ? 'Worldcraft Forge // OBS Studio' : (isSettings ? 'Worldcraft // Settings' : (isDownloads ? 'Worldcraft // Downloads' : (isHome ? 'Worldcraft Home' : 'Loading...'))),
    favicon: null,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isHome: isHome,
    isForge: isForge,
    isSettings: isSettings,
    isDownloads: isDownloads,
    isErrorPage: false,
    failedUrl: null,
    error: null,
    view: null
  };

  if (!isHome) {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        plugins: true
      }
    });
    configureExternalWebContents(view, id, win);
    tab.view = view;
    view.webContents.loadURL(tab.url).catch(() => {});
  } else {
    // Interne Seiten (home/settings/downloads/forge/worldcraft://*) benötigen keine WebContentsView
    tab.view = null;
  }

  tabs.set(id, tab);

  const winActive = win ? activeTabByWindow.get(win.id) : activeTabId;
  if (activateImmediately || !winActive) {
    if (win) {
      activeTabByWindow.set(win.id, id);
    }
    activeTabId = id;
    updateActiveViewPlacement(win);
  }

  broadcastTabState(win);
  return tab;
}

/**
 * Activates an existing tab
 */
function activateTab(tabId, targetWin = null) {
  if (!tabs.has(tabId)) {
    return false;
  }
  const tab = tabs.get(tabId);
  const win = targetWin || getWindowForTab(tab);
  activeTabId = tabId;
  if (win) {
    activeTabByWindow.set(win.id, tabId);
  }
  updateActiveViewPlacement(win);
  broadcastTabState(win);
  const currentTab = tabs.get(tabId);
  if (win && !win.isDestroyed()) {
    win.webContents.send('tabs:active-changed', {
      tabId,
      url: currentTab.url,
      title: currentTab.title
    });
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tabs:active-changed', {
      tabId,
      url: currentTab.url,
      title: currentTab.title
    });
  }
  return true;
}

// Closed tabs history for Ctrl + Shift + T
const closedTabsHistory = [];
const MAX_CLOSED_TABS_HISTORY = 30;

function pushClosedTabHistory(tab) {
  if (!tab) return;
  closedTabsHistory.push({
    url: tab.url,
    title: tab.title,
    isHome: tab.isHome,
    isForge: tab.isForge,
    isSettings: tab.isSettings,
    isDownloads: tab.isDownloads
  });
  if (closedTabsHistory.length > MAX_CLOSED_TABS_HISTORY) {
    closedTabsHistory.shift();
  }
}

function restoreLastClosedTab(targetWin = null) {
  if (closedTabsHistory.length === 0) return null;
  const last = closedTabsHistory.pop();
  let targetUrl = last.url || '';
  if (last.isForge) targetUrl = 'worldcraft://dev-forge';
  else if (last.isSettings) targetUrl = 'worldcraft://settings';
  else if (last.isDownloads) targetUrl = 'internal://downloads';
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  return createNewTab(targetUrl, true, win);
}

function switchNextTab(targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  const winId = win ? win.id : null;
  const tabIds = Array.from(tabs.values())
    .filter(t => !winId || t.windowId === winId)
    .map(t => t.id);
  if (tabIds.length <= 1) return;
  const currentActive = (winId ? activeTabByWindow.get(winId) : null) || activeTabId;
  const currentIndex = tabIds.indexOf(currentActive);
  const nextIndex = (currentIndex + 1) % tabIds.length;
  activateTab(tabIds[nextIndex], win);
}

function switchPreviousTab(targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  const winId = win ? win.id : null;
  const tabIds = Array.from(tabs.values())
    .filter(t => !winId || t.windowId === winId)
    .map(t => t.id);
  if (tabIds.length <= 1) return;
  const currentActive = (winId ? activeTabByWindow.get(winId) : null) || activeTabId;
  const currentIndex = tabIds.indexOf(currentActive);
  const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
  activateTab(tabIds[prevIndex], win);
}

function reloadActiveTab(ignoreCache = false, targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  const currentActive = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
  const currentTab = tabs.get(currentActive);
  if (!currentTab) return;
  if (currentTab.view && !currentTab.view.webContents.isDestroyed()) {
    if (ignoreCache) {
      currentTab.view.webContents.reloadIgnoringCache();
    } else {
      currentTab.view.webContents.reload();
    }
  } else if (win && !win.isDestroyed()) {
    broadcastTabState(win);
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    broadcastTabState();
  }
}

function navigateActiveTabHistory(delta, targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  const currentActive = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
  const currentTab = tabs.get(currentActive);
  if (!currentTab || !currentTab.view || currentTab.view.webContents.isDestroyed()) return;
  if (delta === -1 && currentTab.view.webContents.canGoBack()) {
    currentTab.view.webContents.goBack();
  } else if (delta === 1 && currentTab.view.webContents.canGoForward()) {
    currentTab.view.webContents.goForward();
  }
}

function zoomActiveTab(action, targetWin = null) {
  const win = targetWin || BrowserWindow.getFocusedWindow() || mainWindow;
  const currentActive = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
  const currentTab = tabs.get(currentActive);
  if (!currentTab || !currentTab.view || currentTab.view.webContents.isDestroyed()) return;
  const wc = currentTab.view.webContents;
  try {
    if (action === 'reset') {
      wc.setZoomFactor(1.0);
      wc.setZoomLevel(0);
    } else if (action === 'in') {
      const cur = wc.getZoomFactor() || 1.0;
      wc.setZoomFactor(Math.min(3.0, Number((cur + 0.1).toFixed(1))));
    } else if (action === 'out') {
      const cur = wc.getZoomFactor() || 1.0;
      wc.setZoomFactor(Math.max(0.3, Number((cur - 0.1).toFixed(1))));
    }
  } catch (err) {}
}

/**
 * Ermittelt das Fenster, zu dem ein Input-Event gehört:
 * 1. explizit übergebenes Fenster, 2. BrowserWindow.fromWebContents(wc),
 * 3. Fenster, dem der Tab mit dieser WebContentsView gehört, 4. fokussiertes Fenster, 5. mainWindow.
 */
function resolveWindowForInput(sourceWc, targetWin = null) {
  if (targetWin && !targetWin.isDestroyed()) return targetWin;

  if (sourceWc && !sourceWc.isDestroyed()) {
    try {
      const owner = BrowserWindow.fromWebContents(sourceWc);
      if (owner && !owner.isDestroyed()) return owner;
    } catch (e) {}

    for (const tab of tabs.values()) {
      if (tab.view && tab.view.webContents === sourceWc) {
        const tabWin = getWindowForTab(tab);
        if (tabWin && !tabWin.isDestroyed()) return tabWin;
      }
    }
  }

  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return windows.values().next().value || null;
}

/**
 * Zentrale, einzige Quelle für browserweite Shortcuts (F11, Strg+T/W/N, ...).
 * Wird von before-input-event jeder BrowserWindow- UND jeder WebContentsView-Instanz aufgerufen.
 */
function handleBrowserInputEvent(event, input, targetWin = null, sourceWc = null) {
  if (input.type !== 'keyDown') return;

  const win = resolveWindowForInput(sourceWc, targetWin);

  // Nur tatsächlich ausgelöste Shortcuts loggen (nicht jeden Tastendruck – sonst würden Eingaben
  // in Webseiten, z. B. Passwörter, im Terminal landen).
  let handled = false;
  const trackedEvent = {
    preventDefault: () => {
      handled = true;
      event.preventDefault();
    }
  };

  routeBrowserShortcut(trackedEvent, input, win, sourceWc);

  if (handled) {
    console.log('[SHORTCUT TRIGGERED]', input.key);
  }
}

function routeBrowserShortcut(event, input, win, sourceWc = null) {
  const keyLower = (input.key || '').toLowerCase();
  const code = input.code || '';
  const ctrlOrMeta = Boolean(input.control || input.meta);

  // Strg + N: Neues leeres Browserfenster öffnen
  if (ctrlOrMeta && !input.alt && !input.shift && (keyLower === 'n' || code === 'KeyN')) {
    event.preventDefault();
    createNewWindow();
    return;
  }

  // 1. F11: Vollbildmodus umschalten
  if (input.key === 'F11' && !input.control && !input.alt && !input.meta) {
    event.preventDefault();
    setBrowserFullScreen(!isBrowserFullScreen, win);
    return;
  }

  // F12: Developer Tools umschalten (standardmäßig unten im Browserfenster angedockt, wie in Chrome)
  if ((input.key === 'F12' || code === 'F12') && !ctrlOrMeta && !input.alt && !input.shift) {
    event.preventDefault();
    const currentActive = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const currentTab = currentActive ? tabs.get(currentActive) : null;

    let targetWc = null;
    if (currentTab && currentTab.view && !currentTab.isHome && currentTab.view.webContents && !currentTab.view.webContents.isDestroyed()) {
      targetWc = currentTab.view.webContents;
    } else if (sourceWc && !sourceWc.isDestroyed() && (!win || sourceWc !== win.webContents)) {
      // Absicherung: sourceWc verwenden, wenn es zu einer WebContentsView eines Web-Tabs gehört
      for (const tab of tabs.values()) {
        if (!tab.isHome && tab.view && tab.view.webContents === sourceWc) {
          targetWc = sourceWc;
          break;
        }
      }
    }

    // Wenn auf der Startseite / New Tab: DevTools des Hauptfensters (Startbildschirm) verwenden
    if (!targetWc) {
      targetWc = (win && !win.isDestroyed() ? win.webContents : (mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents : null));
    }

    if (targetWc) {
      // Falls zuvor das andere WebContents (z. B. Startfenster vs. Web-Tab) offen war, aufräumen
      if (win && !win.isDestroyed() && win.webContents !== targetWc && win.webContents.isDevToolsOpened()) {
        try { win.webContents.closeDevTools(); } catch (e) {}
      }

      if (targetWc.isDevToolsOpened()) {
        targetWc.closeDevTools();
      } else {
        targetWc.openDevTools({ mode: 'bottom' });
      }
    }
    return;
  }

  // 2. Strg + T: Neuen Tab öffnen
  if (ctrlOrMeta && !input.alt && !input.shift && (keyLower === 't' || code === 'KeyT')) {
    event.preventDefault();
    createNewTab('', true, win);
    return;
  }

  // 4. Strg + Shift + T: Zuletzt geschlossenen Tab wiederherstellen
  if (ctrlOrMeta && !input.alt && input.shift && (keyLower === 't' || code === 'KeyT')) {
    event.preventDefault();
    restoreLastClosedTab(win);
    return;
  }

  // 3. Strg + W: Aktuellen Tab schließen
  if (ctrlOrMeta && !input.alt && !input.shift && (keyLower === 'w' || code === 'KeyW')) {
    event.preventDefault();
    const currentActive = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    if (currentActive) {
      closeTab(currentActive);
    }
    return;
  }

  // 5. Strg + Tab / Strg + Shift + Tab: Zum nächsten / vorherigen Tab wechseln
  if (ctrlOrMeta && !input.alt && (input.key === 'Tab' || code === 'Tab')) {
    event.preventDefault();
    if (input.shift) {
      switchPreviousTab(win);
    } else {
      switchNextTab(win);
    }
    return;
  }

  // 6. Strg + 1 bis 8 & Strg + 9
  if (ctrlOrMeta && !input.alt && !input.shift) {
    const digitMatch = input.key.match(/^[1-9]$/) || (code.startsWith('Digit') && code.slice(5).match(/^[1-9]$/));
    if (digitMatch) {
      const num = parseInt(digitMatch[0] || code.slice(5), 10);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        event.preventDefault();
        const winId = win ? win.id : null;
        const tabIds = Array.from(tabs.values())
          .filter(t => !winId || t.windowId === winId)
          .map(t => t.id);
        if (tabIds.length > 0) {
          if (num === 9) {
            activateTab(tabIds[tabIds.length - 1], win);
          } else {
            const targetIdx = num - 1;
            if (targetIdx < tabIds.length) {
              activateTab(tabIds[targetIdx], win);
            }
          }
        }
        return;
      }
    }
  }

  // 7. Strg + L oder Alt + D: Adressleiste fokussieren und markieren
  const isCtrlL = ctrlOrMeta && !input.alt && !input.shift && (keyLower === 'l' || code === 'KeyL');
  const isAltD = !ctrlOrMeta && input.alt && !input.shift && (keyLower === 'd' || code === 'KeyD');
  if (isCtrlL || isAltD) {
    event.preventDefault();
    if (isBrowserFullScreen) {
      setBrowserFullScreen(false, win);
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send('focus-url-input');
      win.focus();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('focus-url-input');
      mainWindow.focus();
    }
    return;
  }

  // 10. Strg + F5 oder Strg + Shift + R: Cache umgehen und neu laden
  const isCtrlF5 = input.key === 'F5' && ctrlOrMeta;
  const isCtrlShiftR = ctrlOrMeta && input.shift && !input.alt && (keyLower === 'r' || code === 'KeyR');
  if (isCtrlF5 || isCtrlShiftR) {
    event.preventDefault();
    reloadActiveTab(true, win);
    return;
  }

  // 9. F5 oder Strg + R: Aktiven Tab normal neu laden
  const isF5 = input.key === 'F5' && !ctrlOrMeta && !input.alt && !input.shift;
  const isCtrlR = ctrlOrMeta && !input.shift && !input.alt && (keyLower === 'r' || code === 'KeyR');
  if (isF5 || isCtrlR) {
    event.preventDefault();
    reloadActiveTab(false, win);
    return;
  }

  // 11. Alt + Pfeil links: Zurück im Verlauf
  if (input.alt && !ctrlOrMeta && !input.shift && (input.key === 'ArrowLeft' || code === 'ArrowLeft')) {
    event.preventDefault();
    navigateActiveTabHistory(-1, win);
    return;
  }

  // 12. Alt + Pfeil rechts: Vorwärts im Verlauf
  if (input.alt && !ctrlOrMeta && !input.shift && (input.key === 'ArrowRight' || code === 'ArrowRight')) {
    event.preventDefault();
    navigateActiveTabHistory(1, win);
    return;
  }

  // 13 & 14. Zoom: Strg + 0 (Reset), Strg + + (Zoom in), Strg + - (Zoom out)
  if (ctrlOrMeta && !input.alt) {
    if (input.key === '0' || code === 'Digit0' || code === 'Numpad0') {
      event.preventDefault();
      zoomActiveTab('reset', win);
      return;
    }
    if (input.key === '+' || input.key === '=' || code === 'Equal' || code === 'NumpadAdd') {
      event.preventDefault();
      zoomActiveTab('in', win);
      return;
    }
    if (input.key === '-' || input.key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
      event.preventDefault();
      zoomActiveTab('out', win);
      return;
    }
  }
}

/**
 * Closes a tab and cleans up associated view resources
 */
function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return false;

  pushClosedTabHistory(tab);
  const win = getWindowForTab(tab);

  // Cleanup view
  if (tab.view) {
    try {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(tab.view);
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
      }
    } catch (err) {
      // Ignore cleanup error
    }
    tab.view = null;
  }

  tabs.delete(tabId);

  // If the active tab was closed, pick another tab
  if (win) {
    const activeForWin = activeTabByWindow.get(win.id);
    if (activeForWin === tabId) {
      const winTabs = Array.from(tabs.values()).filter(t => t.windowId === win.id);
      if (winTabs.length > 0) {
        const nextActive = winTabs[winTabs.length - 1].id;
        activeTabByWindow.set(win.id, nextActive);
        if (win === mainWindow) activeTabId = nextActive;
      } else {
        if (windows.size > 1 && !win.isDestroyed()) {
          win.close();
          return true;
        }
        createNewTab('', true, win);
        return true;
      }
    }
  } else {
    if (activeTabId === tabId) {
      const remainingKeys = Array.from(tabs.keys());
      if (remainingKeys.length > 0) {
        activeTabId = remainingKeys[remainingKeys.length - 1];
      } else {
        // If no tabs remain, automatically create a new home tab
        createNewTab('', true);
        return true;
      }
    }
  }

  updateActiveViewPlacement(win);
  broadcastTabState(win);
  return true;
}

/**
 * Navigates a tab to a target URL
 */
async function navigateTab(tabId, targetUrl) {
  const tab = tabs.get(tabId);
  if (!tab) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Tab nicht gefunden.' } };
  }
  const win = getWindowForTab(tab);

  const settings = await storageService.getSettings();
  const norm = normalizeUrl(targetUrl, settings.searchEngine || 'google');

  if (!norm.ok) {
    return { ok: false, error: { code: 'INVALID_URL', message: norm.error } };
  }

  const url = norm.url;

  // Internal Navigation
  if (url === 'internal://home') {
    tab.isHome = true;
    tab.isForge = false;
    tab.isSettings = false;
    tab.isDownloads = false;
    tab.isErrorPage = false;
    tab.failedUrl = null;
    tab.url = '';
    tab.title = 'Worldcraft Home';
    tab.error = null;
    if (tab.view) {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(tab.view);
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
    }
    broadcastTabState(win);
    return { ok: true, data: { url: '', isHome: true } };
  }

  if (url === 'worldcraft://dev-forge' || url === 'internal://dev-forge') {
    tab.isHome = true;
    tab.isForge = true;
    tab.isSettings = false;
    tab.isDownloads = false;
    tab.isErrorPage = false;
    tab.failedUrl = null;
    tab.url = 'worldcraft://dev-forge';
    tab.title = 'Worldcraft Forge // OBS Studio';
    tab.error = null;
    if (tab.view) {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(tab.view);
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
    }
    broadcastTabState(win);
    if (win && !win.isDestroyed()) {
      win.webContents.send('tabs:active-changed', {
        tabId,
        url: 'worldcraft://dev-forge',
        title: tab.title
      });
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tabs:active-changed', {
        tabId,
        url: 'worldcraft://dev-forge',
        title: tab.title
      });
    }
    return { ok: true, data: { url: 'worldcraft://dev-forge', isForge: true } };
  }

  if (url === 'worldcraft://settings' || url === 'internal://settings') {
    tab.isHome = true;
    tab.isForge = false;
    tab.isSettings = true;
    tab.isDownloads = false;
    tab.isErrorPage = false;
    tab.failedUrl = null;
    tab.url = 'worldcraft://settings';
    tab.title = 'Worldcraft // Settings';
    tab.error = null;
    if (tab.view) {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(tab.view);
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
    }
    broadcastTabState(win);
    if (win && !win.isDestroyed()) {
      win.webContents.send('tabs:active-changed', {
        tabId,
        url: 'worldcraft://settings',
        title: tab.title
      });
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tabs:active-changed', {
        tabId,
        url: 'worldcraft://settings',
        title: tab.title
      });
    }
    return { ok: true, data: { url: 'worldcraft://settings', isSettings: true } };
  }

  if (url === 'worldcraft://downloads' || url === 'internal://downloads') {
    tab.isHome = true;
    tab.isForge = false;
    tab.isSettings = false;
    tab.isDownloads = true;
    tab.isErrorPage = false;
    tab.failedUrl = null;
    tab.url = 'internal://downloads';
    tab.title = 'Worldcraft // Downloads';
    tab.error = null;
    if (tab.view) {
      if (win && !win.isDestroyed()) {
        win.contentView.removeChildView(tab.view);
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
    }
    broadcastTabState(win);
    if (win && !win.isDestroyed()) {
      win.webContents.send('tabs:active-changed', {
        tabId,
        url: 'internal://downloads',
        title: tab.title
      });
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('tabs:active-changed', {
        tabId,
        url: 'internal://downloads',
        title: tab.title
      });
    }
    return { ok: true, data: { url: 'internal://downloads', isDownloads: true } };
  }

  if (url === 'internal://radio' || url === 'worldcraft://radio') {
    if (win && !win.isDestroyed()) {
      win.webContents.send('radio:open-modal');
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('radio:open-modal');
    }
    return { ok: true, data: { url: 'internal://radio', isRadio: true } };
  }

  tab.isHome = false;
  tab.isForge = false;
  tab.isSettings = false;
  tab.isDownloads = false;
  tab.isErrorPage = false;
  tab.failedUrl = null;
  tab.url = url;
  tab.error = null;

  if (!tab.view) {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        plugins: true
      }
    });
    configureExternalWebContents(view, tabId, win);
    tab.view = view;
  }

  const winActive = win ? activeTabByWindow.get(win.id) : activeTabId;
  if (winActive === tabId || activeTabId === tabId) {
    updateActiveViewPlacement(win);
  }

  try {
    await tab.view.webContents.loadURL(url);
    return { ok: true, data: { url } };
  } catch (loadErr) {
    tab.error = loadErr.message;
    broadcastTabState(win);
    return { ok: false, error: { code: 'LOAD_ERROR', message: loadErr.message } };
  }
}

/**
 * Creates a browser window dynamically
 * @param {string|null} url
 * @param {{x: number, y: number, width?: number, height?: number}|null} bounds
 * @returns {BrowserWindow}
 */
function createBrowserWindow(url = null, bounds = null) {
  Menu.setApplicationMenu(null);

  const winOptions = {
    width: bounds && typeof bounds.width === 'number' && bounds.width > 100 ? Math.round(bounds.width) : 1366,
    height: bounds && typeof bounds.height === 'number' && bounds.height > 100 ? Math.round(bounds.height) : 868,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#050805',
    title: 'Worldcraft Browser',
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false
    }
  };

  if (bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number') {
    winOptions.x = Math.round(bounds.x);
    winOptions.y = Math.round(bounds.y);
  }

  const win = new BrowserWindow(winOptions);

  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);
  win.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    createNewTab(openUrl, true, win);
    return { action: 'deny' };
  });

  windows.add(win);
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = win;
  }

  // Security test requirements
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    createNewTab(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number') {
      win.setPosition(Math.round(bounds.x), Math.round(bounds.y));
    }
    const targetUrl = url !== null && url !== undefined ? url : '';
    createNewTab(targetUrl, true, win);
    win.focus();
  });

  win.on('resize', () => {
    updateActiveViewPlacement(win);
  });

  win.on('enter-full-screen', () => {
    setBrowserFullScreen(true, win);
  });

  win.on('leave-full-screen', () => {
    setBrowserFullScreen(false, win);
  });

  win.webContents.on('before-input-event', (event, input) => {
    handleBrowserInputEvent(event, input, win, win.webContents);
  });

  win.webContents.on('context-menu', (event, params) => {
    event.preventDefault();
    createNativeContextMenu(win.webContents, params, win);
  });

  win.on('closed', () => {
    windows.delete(win);
    activeTabByWindow.delete(win.id);
    windowViewportBounds.delete(win.id);
    for (const [id, tab] of tabs.entries()) {
      if (tab.windowId === win.id) {
        if (tab.view && !tab.view.webContents.isDestroyed()) {
          try { tab.view.webContents.close(); } catch (e) {}
        }
        tabs.delete(id);
      }
    }
    if (mainWindow === win) {
      mainWindow = windows.values().next().value || null;
    }
  });

  return win;
}

const createNewWindow = createBrowserWindow;

/**
 * Creates the primary application window
 */
function createMainWindow(startupUrl = null) {
  const initialUrl = startupUrl || extractTargetUrlFromArgs(process.argv) || '';
  return createNewWindow(initialUrl);
}

/**
 * Initializes IPC listeners
 */
function registerIpcHandlers() {
  // Tabs
  ipcMain.handle('tabs:create', (event, { url }) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const tab = createNewTab(url || '', true, win);
    return { ok: true, data: { id: tab.id } };
  });

  ipcMain.handle('tabs:close', (event, { tabId }) => {
    assertTrustedSender(event);
    const success = closeTab(tabId);
    return { ok: success };
  });

  ipcMain.handle('tabs:activate', (event, { tabId }) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const success = activateTab(tabId, win);
    return { ok: success };
  });

  ipcMain.handle('tabs:navigate', async (event, { tabId, url }) => {
    assertTrustedSender(event);
    return await navigateTab(tabId, url);
  });

  ipcMain.handle('tabs:back', (event, payload = {}) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const tabId = (payload && payload.tabId) || (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const tab = tabs.get(tabId);
    if (tab && tab.view && !tab.view.webContents.isDestroyed() && tab.view.webContents.canGoBack()) {
      tab.view.webContents.goBack();
      setTimeout(() => {
        if (tab && tab.view && !tab.view.webContents.isDestroyed()) {
          tab.canGoBack = tab.view.webContents.canGoBack();
          tab.canGoForward = tab.view.webContents.canGoForward();
          notifyNavState(tabId, tab.view.webContents, win);
          broadcastTabState(win);
        }
      }, 80);
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle('tabs:forward', (event, payload = {}) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const tabId = (payload && payload.tabId) || (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const tab = tabs.get(tabId);
    if (tab && tab.view && !tab.view.webContents.isDestroyed() && tab.view.webContents.canGoForward()) {
      tab.view.webContents.goForward();
      setTimeout(() => {
        if (tab && tab.view && !tab.view.webContents.isDestroyed()) {
          tab.canGoBack = tab.view.webContents.canGoBack();
          tab.canGoForward = tab.view.webContents.canGoForward();
          notifyNavState(tabId, tab.view.webContents, win);
          broadcastTabState(win);
        }
      }, 80);
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle('tabs:reload', async (event, payload = {}) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const tabId = (payload && payload.tabId) || (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const tab = tabs.get(tabId);
    if (tab) {
      if (tab.isErrorPage && tab.failedUrl) {
        await navigateTab(tabId, tab.failedUrl);
        return { ok: true };
      }
      if (tab.view && !tab.view.webContents.isDestroyed()) {
        tab.view.webContents.reload();
        return { ok: true };
      }
    }
    return { ok: false };
  });

  ipcMain.handle('tabs:stop', (event, { tabId }) => {
    assertTrustedSender(event);
    const tab = tabs.get(tabId);
    if (tab && tab.view) {
      tab.view.webContents.stop();
      return { ok: true };
    }
    return { ok: false };
  });

  ipcMain.handle('tabs:get-state', (event) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    return { ok: true, data: getSerializableTabState(win) };
  });

  ipcMain.handle('tabs:set-bounds', (event, bounds) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    if (isBrowserFullScreen && win && !win.isDestroyed()) {
      const [winWidth, winHeight] = win.getContentSize();
      currentViewportBounds = {
        x: 0,
        y: 0,
        width: winWidth,
        height: winHeight
      };
    } else if (bounds && typeof bounds === 'object') {
      currentViewportBounds = {
        x: Math.max(0, Math.round(bounds.x || 0)),
        y: Math.max(0, Math.round(bounds.y || 0)),
        width: Math.max(100, Math.round(bounds.width || 800)),
        height: Math.max(100, Math.round(bounds.height || 600))
      };
    }
    if (win) {
      windowViewportBounds.set(win.id, currentViewportBounds);
    }
    const winActiveId = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const activeTab = tabs.get(winActiveId);
    if (activeTab && activeTab.view && !activeTab.isHome && !activeTab.isForge && !activeTab.isSettings && !isViewTemporarilyHidden) {
      activeTab.view.setBounds(currentViewportBounds);
    }
    return { ok: true };
  });

  ipcMain.handle('tabs:set-view-visible', (event, { visible }) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    isViewTemporarilyHidden = !visible;
    const winActiveId = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const activeTab = tabs.get(winActiveId);
    if (activeTab && activeTab.view && !activeTab.isHome && !activeTab.isForge && !activeTab.isSettings) {
      if (typeof activeTab.view.setVisible === 'function') {
        activeTab.view.setVisible(Boolean(visible));
      }
      if (!visible) {
        if (win && !win.isDestroyed()) {
          win.contentView.removeChildView(activeTab.view);
        } else if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.contentView.removeChildView(activeTab.view);
        }
      } else {
        const targetWin = (win && !win.isDestroyed()) ? win : mainWindow;
        if (targetWin && !targetWin.isDestroyed()) {
          const children = targetWin.contentView.children;
          if (!children.includes(activeTab.view)) {
            targetWin.contentView.addChildView(activeTab.view);
          }
          const b = (win ? windowViewportBounds.get(win.id) : null) || currentViewportBounds;
          activeTab.view.setBounds(b);
        }
      }
    }
    return { ok: true };
  });

  ipcMain.handle('tabs:focus', (event, { tabId } = {}) => {
    assertTrustedSender(event);
    const win = getWindowForEvent(event);
    const winActiveId = (win ? activeTabByWindow.get(win.id) : null) || activeTabId;
    const targetId = tabId || winActiveId;
    const tab = tabs.get(targetId);
    if (tab && tab.view && !tab.isHome && !tab.isForge && !tab.isSettings && !isViewTemporarilyHidden && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.focus();
      return { ok: true };
    }
    if (win && !win.isDestroyed()) {
      win.focus();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
    return { ok: true };
  });

  // Tab Drag-out Logik (Tab abreißen / Tear-off) – ausschließlich ipcMain.handle
  ipcMain.handle('tab-drag:start', async (event, data = {}) => {
    assertTrustedSender(event);
    try {
      const title = data.title;
      const favicon = data.favicon;
      const screenX = typeof data.screenX === 'number' ? data.screenX : data.x;
      const screenY = typeof data.screenY === 'number' ? data.screenY : data.y;
      const offsetX = typeof data.offsetX === 'number' ? data.offsetX : 20;
      const offsetY = typeof data.offsetY === 'number' ? data.offsetY : 18;

      const ghostWin = getOrCreateDragGhostWindow();
      if (typeof screenX === 'number' && typeof screenY === 'number') {
        ghostWin.setPosition(Math.round(screenX - offsetX), Math.round(screenY - offsetY));
      }
      const html = buildTabGhostHtml(title, favicon);
      await ghostWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      if (!ghostWin.isDestroyed()) {
        ghostWin.showInactive();
      }
      return { ok: true };
    } catch (err) {
      console.error('[tab-drag:start] Fehler:', err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('tab-drag:move', (event, data = {}) => {
    assertTrustedSender(event);
    try {
      if (!dragGhostWindow || dragGhostWindow.isDestroyed()) return { ok: false };
      const screenX = typeof data.screenX === 'number' ? data.screenX : data.x;
      const screenY = typeof data.screenY === 'number' ? data.screenY : data.y;
      const offsetX = typeof data.offsetX === 'number' ? data.offsetX : 20;
      const offsetY = typeof data.offsetY === 'number' ? data.offsetY : 18;

      if (typeof screenX === 'number' && typeof screenY === 'number') {
        dragGhostWindow.setPosition(Math.round(screenX - offsetX), Math.round(screenY - offsetY));
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('tab-drag:end', (event) => {
    assertTrustedSender(event);
    try {
      if (dragGhostWindow && !dragGhostWindow.isDestroyed()) {
        dragGhostWindow.hide();
      }
      return { ok: true };
    } catch (err) {
      console.error('[tab-drag:end] Fehler:', err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('detach-tab-to-new-window', (event, data) => {
    assertTrustedSender(event);
    try {
      if (dragGhostWindow && !dragGhostWindow.isDestroyed()) {
        dragGhostWindow.hide();
      }
      const targetUrl = (data && typeof data.url === 'string') ? data.url : '';
      const bounds = (data && data.bounds && typeof data.bounds === 'object') ? data.bounds : null;
      const x = bounds && typeof bounds.x === 'number' ? bounds.x : (data && typeof data.x === 'number' ? data.x : null);
      const y = bounds && typeof bounds.y === 'number' ? bounds.y : (data && typeof data.y === 'number' ? data.y : null);
      const cursor = (x && y && x > 0 && y > 0) ? { x, y } : screen.getCursorScreenPoint();
      const newWin = createNewWindow(targetUrl);
      if (!newWin || newWin.isDestroyed()) {
        throw new Error('Neues Fenster konnte nicht erzeugt werden');
      }
      newWin.setPosition(Math.round(cursor.x - 120), Math.round(cursor.y - 30));
      newWin.focus();
      return { ok: true };
    } catch (err) {
      console.error('[detach-tab-to-new-window] Fehler:', err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('tabs:detach-to-new-window', (event, data) => {
    assertTrustedSender(event);
    const targetUrl = (data && typeof data.url === 'string') ? data.url : '';
    const bounds = (data && data.bounds && typeof data.bounds === 'object') ? data.bounds : null;
    const newWin = createNewWindow(targetUrl, bounds);
    if (newWin && !newWin.isDestroyed()) {
      newWin.focus();
    }
    return { ok: true };
  });

  ipcMain.handle('app:new-window', (event, { url } = {}) => {
    assertTrustedSender(event);
    try {
      const win = createNewWindow(url || null);
      if (!win || win.isDestroyed()) {
        throw new Error('Neues Fenster konnte nicht erzeugt werden');
      }
      win.focus();
      return { ok: true };
    } catch (err) {
      console.error('[app:new-window] Fehler:', err);
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  });

  ipcMain.handle('view:set-translate-banner', (event, { visible }) => {
    assertTrustedSender(event);
    isTranslateBannerVisible = Boolean(visible);
    recalculateViewportBounds();
    updateActiveViewPlacement();
    return { ok: true, isVisible: isTranslateBannerVisible };
  });

  ipcMain.handle('tabs:translate', async (event, { tabId, targetLang }) => {
    assertTrustedSender(event);
    const tab = tabs.get(tabId);
    if (!tab || !tab.view) return { ok: false, error: 'Tab nicht aktiv oder nicht gefunden' };

    const safeTarget = (targetLang || 'de').replace(/[^a-zA-Z]/g, '').toLowerCase();

    try {
      await tab.view.webContents.executeJavaScript(`
        (() => {
          if (window.__wc_google_translate_active) {
            const select = document.querySelector('.goog-te-combo');
            if (select) {
              select.value = '${safeTarget}';
              select.dispatchEvent(new Event('change'));
            }
            return { ok: true };
          }
          window.__wc_google_translate_active = true;

          const div = document.createElement('div');
          div.id = 'google_translate_element';
          div.style.display = 'none';
          document.body.appendChild(div);

          window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
              pageLanguage: 'auto',
              includedLanguages: '${safeTarget}',
              layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            }, 'google_translate_element');

            setTimeout(() => {
              const select = document.querySelector('.goog-te-combo');
              if (select) {
                select.value = '${safeTarget}';
                select.dispatchEvent(new Event('change'));
              }
            }, 600);
          };

          const script = document.createElement('script');
          script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
          document.body.appendChild(script);
          return { ok: true };
        })()
      `);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('tabs:restore-translation', async (event, { tabId }) => {
    assertTrustedSender(event);
    const tab = tabs.get(tabId);
    if (!tab || !tab.view) return { ok: false, error: 'Tab nicht aktiv' };

    try {
      await tab.view.webContents.executeJavaScript(`
        (() => {
          const iframe = document.querySelector('iframe.goog-te-banner-frame');
          if (iframe) {
            try {
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              const btn = doc.querySelector('.goog-close-link') || doc.querySelector('#\\\\:1\\\\.restore');
              if (btn) btn.click();
            } catch(e) {}
          }
          const select = document.querySelector('.goog-te-combo');
          if (select) {
            select.value = '';
            select.dispatchEvent(new Event('change'));
          }
          return { ok: true };
        })()
      `);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // App Detach (Standalone Web Apps)
  ipcMain.handle('apps:detach', async (event, { url }) => {
    assertTrustedSender(event);
    if (!url || typeof url !== 'string') {
      return { ok: false, error: { code: 'INVALID_URL', message: 'Ungültige URL.' } };
    }

    const norm = normalizeUrl(url);
    if (!norm.ok || (!norm.url.startsWith('http://') && !norm.url.startsWith('https://'))) {
      return { ok: false, error: { code: 'UNSUPPORTED_SCHEME', message: 'Nur HTTP- und HTTPS-Webseiten können ausgekoppelt werden.' } };
    }

    const appWin = new BrowserWindow({
      width: 1080,
      height: 760,
      minWidth: 640,
      minHeight: 480,
      title: 'Worldcraft App',
      backgroundColor: '#050805',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        plugins: true
      }
    });

    appWin.setMenuBarVisibility(false);
    appWin.setAutoHideMenuBar(true);
    appWin.webContents.setUserAgent(CHROME_USER_AGENT);

    if (downloadService) {
      downloadService.registerSession(appWin.webContents.session);
    }

    appWin.on('closed', () => {
      detachedWindows.delete(appWin);
    });

    appWin.webContents.setWindowOpenHandler(({ url }) => {
      createNewTab(url);
      return { action: 'deny' };
    });
    appWin.webContents.on('before-input-event', (event, input) => {
      handleBrowserInputEvent(event, input, appWin, appWin.webContents);
    });
    appWin.webContents.on('page-title-updated', (e, title) => {
      appWin.setTitle(`${title} — Worldcraft App`);
    });

    try {
      await appWin.loadURL(norm.url);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: { code: 'LOAD_ERROR', message: err.message } };
    }
  });

  // AI Assistant (Worldcraft AI)
  // AI Assistant (Multi-Provider: Google, OpenAI, Anthropic, Ollama)
  ipcMain.handle('ai:chat', async (event, { message, context }) => {
    assertTrustedSender(event);
    const settings = await storageService.getSettings();
    const provider = settings.aiProvider || 'google';
    const apiKey = await storageService.getApiKey(provider);
    const model = settings.aiModel || settings.geminiModel || 'gemini-3.8-flash';

    return await aiService.chat({
      provider,
      apiKey,
      modelName: model,
      message,
      chatHistory: context ? context.chatHistory : [],
      pageContext: context ? context.pageContext : null,
      endpoint: settings.ollamaEndpoint
    });
  });

  ipcMain.handle('ai:summarize-current-page', async (event) => {
    assertTrustedSender(event);
    const activeTab = tabs.get(activeTabId);
    if (!activeTab || activeTab.isHome || !activeTab.view) {
      return {
        ok: false,
        error: {
          code: 'HOME_PAGE',
          message: 'Die Startseite kann nicht zusammengefasst werden. Bitte navigiere zu einer externen Webseite.'
        }
      };
    }

    const settings = await storageService.getSettings();
    const provider = settings.aiProvider || 'google';
    const apiKey = await storageService.getApiKey(provider);

    if (provider !== 'ollama' && !apiKey) {
      return {
        ok: false,
        error: {
          code: 'NO_API_KEY',
          message: '[ NEURAL-LINK OFFLINE // KEY IN SETTINGS HINTERLEGEN ]'
        }
      };
    }

    let pageContext = null;
    try {
      pageContext = await activeTab.view.webContents.executeJavaScript(`
        (() => {
          try {
            const title = document.title || '';
            const url = window.location.href || '';
            const text = document.body ? document.body.innerText : '';
            return { title, url, text: text.slice(0, 20000) };
          } catch(e) {
            return { title: '', url: '', text: '' };
          }
        })()
      `);
    } catch (extractErr) {
      return {
        ok: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Konnte Textinhalte der Seite nicht auslesen.'
        }
      };
    }

    return await aiService.summarizePage({
      provider,
      apiKey,
      modelName: settings.aiModel || settings.geminiModel || 'gemini-3.8-flash',
      endpoint: settings.ollamaEndpoint,
      title: pageContext ? pageContext.title : '',
      url: pageContext ? pageContext.url : '',
      content: pageContext ? pageContext.text : ''
    });
  });

  ipcMain.handle('ai:get-status', async (event) => {
    assertTrustedSender(event);
    const settings = await storageService.getSettings();
    const provider = settings.aiProvider || 'google';
    const hasKey = provider === 'ollama' ? true : await storageService.hasApiKey(provider);
    return {
      ok: true,
      data: {
        isConfigured: hasKey,
        provider,
        model: settings.aiModel || settings.geminiModel || 'gemini-3.8-flash'
      }
    };
  });

  ipcMain.handle('ai:get-providers', async (event) => {
    assertTrustedSender(event);
    const configured = await storageService.getConfiguredProviders();
    const settings = await storageService.getSettings();
    return {
      ok: true,
      data: {
        activeProvider: settings.aiProvider || 'google',
        activeModel: settings.aiModel || settings.geminiModel || 'gemini-3.8-flash',
        configured,
        ollamaEndpoint: settings.ollamaEndpoint || 'http://localhost:11434'
      }
    };
  });

  ipcMain.handle('ai:set-provider-key', async (event, { provider, key }) => {
    assertTrustedSender(event);
    try {
      const prov = provider || 'google';
      const res = await storageService.setApiKey(key, prov);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai:status-changed', { provider: prov, isConfigured: true });
      }
      return { ok: true, secure: res.secure, warning: res.warning };
    } catch (err) {
      return { ok: false, error: { code: 'SAVE_FAILED', message: err.message } };
    }
  });

  ipcMain.handle('ai:clear-provider-key', async (event, { provider }) => {
    assertTrustedSender(event);
    const prov = provider || 'google';
    await storageService.deleteApiKey(prov);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:status-changed', { provider: prov, isConfigured: false });
    }
    return { ok: true };
  });

  ipcMain.handle('ai:set-api-key', async (event, { key }) => {
    assertTrustedSender(event);
    try {
      const res = await storageService.setApiKey(key, 'google');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('ai:status-changed', { isConfigured: true });
      }
      return { ok: true, secure: res.secure, warning: res.warning };
    } catch (err) {
      return { ok: false, error: { code: 'SAVE_FAILED', message: err.message } };
    }
  });

  ipcMain.handle('ai:clear-api-key', async (event) => {
    assertTrustedSender(event);
    await storageService.deleteApiKey('google');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ai:status-changed', { isConfigured: false });
    }
    return { ok: true };
  });

  ipcMain.handle('ai:test-key', async (event, { provider, key } = {}) => {
    assertTrustedSender(event);
    const prov = provider || 'google';
    const testKey = key || await storageService.getApiKey(prov);
    if (!testKey || !testKey.trim()) {
      return { ok: false, error: { code: 'NO_KEY', message: 'Kein API-Key angegeben.' } };
    }
    try {
      const res = await aiService.chat({
        provider: prov,
        apiKey: testKey.trim(),
        modelName: prov === 'google' ? 'gemini-3.8-flash' : (prov === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-haiku-20241022'),
        message: 'Ping. Antworte mit: PONG',
        chatHistory: []
      });
      if (res && res.ok) {
        return { ok: true, message: 'Verbindung erfolgreich // Neural-Link Online!' };
      }
      return { ok: false, error: res && res.error ? res.error : { message: 'Verbindungstest fehlgeschlagen.' } };
    } catch (err) {
      return { ok: false, error: { message: err.message } };
    }
  });

  // Secret Feature: Worldcraft Builder AI (OBS Overlays Forge)
  ipcMain.handle('forge:generate', async (event, { prompt, name, type }) => {
    assertTrustedSender(event);
    const safeName = (name && typeof name === 'string' ? name : 'widget')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 64) || 'widget';

    const settings = await storageService.getSettings();
    const provider = settings.aiProvider || 'google';
    const apiKey = await storageService.getApiKey(provider);
    const model = settings.aiModel || settings.geminiModel || 'gemini-3.8-flash';

    const forgeRes = await aiService.forgeWidget({
      provider,
      apiKey,
      modelName: model,
      endpoint: settings.ollamaEndpoint,
      prompt,
      name: safeName,
      type: type || 'alert'
    });

    if (!forgeRes.ok) {
      return forgeRes;
    }

    const widgetsDir = path.join(app.getPath('userData'), 'widgets');
    if (!fs.existsSync(widgetsDir)) {
      fs.mkdirSync(widgetsDir, { recursive: true });
    }

    const targetFile = path.join(widgetsDir, `${safeName}.html`);
    await fs.promises.writeFile(targetFile, forgeRes.data.code, 'utf8');

    const widgetUrl = `http://localhost:${OBS_PORT}/widgets/${safeName}.html`;
    return {
      ok: true,
      data: {
        name: safeName,
        url: widgetUrl,
        code: forgeRes.data.code
      }
    };
  });

  ipcMain.handle('forge:list', async (event) => {
    assertTrustedSender(event);
    const widgetsDir = path.join(app.getPath('userData'), 'widgets');
    if (!fs.existsSync(widgetsDir)) {
      return { ok: true, data: [] };
    }
    try {
      const files = await fs.promises.readdir(widgetsDir);
      const list = [];
      for (const file of files) {
        if (file.endsWith('.html')) {
          const filePath = path.join(widgetsDir, file);
          const stat = await fs.promises.stat(filePath);
          const name = path.basename(file, '.html');
          list.push({
            name,
            filename: file,
            url: `http://localhost:${OBS_PORT}/widgets/${file}`,
            mtime: stat.mtimeMs,
            size: stat.size
          });
        }
      }
      list.sort((a, b) => b.mtime - a.mtime);
      return { ok: true, data: list };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('forge:delete', async (event, { name }) => {
    assertTrustedSender(event);
    if (!name || typeof name !== 'string') return { ok: false, error: 'Ungültiger Name' };
    const safeName = path.basename(name);
    const target = path.join(app.getPath('userData'), 'widgets', `${safeName}.html`);
    if (fs.existsSync(target)) {
      await fs.promises.unlink(target);
    }
    return { ok: true };
  });

  ipcMain.handle('forge:get', async (event, { name }) => {
    assertTrustedSender(event);
    if (!name || typeof name !== 'string') return { ok: false, error: 'Ungültiger Name' };
    const safeName = path.basename(name);
    const target = path.join(app.getPath('userData'), 'widgets', `${safeName}.html`);
    if (!fs.existsSync(target)) return { ok: false, error: 'Widget nicht gefunden' };
    const code = await fs.promises.readFile(target, 'utf8');
    return { ok: true, data: { name: safeName, code, url: `http://localhost:${OBS_PORT}/widgets/${safeName}.html` } };
  });

  // Settings
  ipcMain.handle('settings:get', async (event) => {
    assertTrustedSender(event);
    const settings = await storageService.getSettings();
    return { ok: true, data: settings };
  });

  ipcMain.handle('settings:save', async (event, newSettings) => {
    assertTrustedSender(event);
    try {
      const saved = await storageService.saveSettings(newSettings);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings:updated', saved);
      }
      return { ok: true, data: saved };
    } catch (err) {
      return { ok: false, error: { code: 'SETTINGS_SAVE_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('settings:save-custom-background', async (event, { dataUrl, filename }) => {
    assertTrustedSender(event);
    if (!dataUrl || typeof dataUrl !== 'string') {
      return { ok: false, error: 'Ungültige Bilddaten.' };
    }
    try {
      const bgDir = path.join(app.getPath('userData'), 'backgrounds');
      if (!fs.existsSync(bgDir)) {
        await fs.promises.mkdir(bgDir, { recursive: true });
      }
      const ext = (filename && path.extname(filename)) ? path.extname(filename) : '.png';
      const targetPath = path.join(bgDir, `custom-bg${ext}`);

      const matches = dataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        await fs.promises.writeFile(targetPath, buffer);
      } else {
        await fs.promises.writeFile(targetPath, Buffer.from(dataUrl, 'utf8'));
      }

      const fileUrl = `file:///${targetPath.replace(/\\/g, '/')}`;
      const saved = await storageService.saveSettings({
        customBackgroundMode: 'local',
        customBackgroundLocal: fileUrl
      });

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('settings:updated', saved);
      }
      return { ok: true, fileUrl, settings: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Favorites
  ipcMain.handle('favorites:list', async (event) => {
    assertTrustedSender(event);
    const favs = await storageService.getFavorites();
    return { ok: true, data: favs };
  });

  ipcMain.handle('favorites:add', async (event, favItem) => {
    assertTrustedSender(event);
    try {
      const added = await storageService.addFavorite(favItem);
      return { ok: true, data: added };
    } catch (err) {
      return { ok: false, error: { code: 'FAVORITE_ADD_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('favorites:remove', async (event, { favoriteId }) => {
    assertTrustedSender(event);
    try {
      await storageService.removeFavorite(favoriteId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: { code: 'FAVORITE_REMOVE_ERROR', message: err.message } };
    }
  });

  ipcMain.handle('favorites:update', async (event, { favoriteId, partial }) => {
    assertTrustedSender(event);
    try {
      const updated = await storageService.updateFavorite(favoriteId, partial);
      return { ok: true, data: updated };
    } catch (err) {
      return { ok: false, error: { code: 'FAVORITE_UPDATE_ERROR', message: err.message } };
    }
  });

  // Radio
  ipcMain.handle('radio:get-stations', async (event) => {
    assertTrustedSender(event);
    const stations = await storageService.getRadioStations();
    return { ok: true, data: stations };
  });

  // Downloads
  ipcMain.handle('downloads:list', (event) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: true, data: [] };
    return { ok: true, data: downloadService.getDownloads() };
  });

  ipcMain.handle('downloads:open', async (event, { downloadId }) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: false, error: 'Download-Dienst nicht aktiv' };
    return await downloadService.openDownload(downloadId);
  });

  ipcMain.handle('downloads:show-in-folder', async (event, { downloadId }) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: false, error: 'Download-Dienst nicht aktiv' };
    return await downloadService.showInFolder(downloadId);
  });

  ipcMain.handle('downloads:cancel', async (event, { downloadId }) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: false, error: 'Download-Dienst nicht aktiv' };
    return await downloadService.cancelDownload(downloadId);
  });

  ipcMain.handle('downloads:remove-history-entry', async (event, { downloadId }) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: false, error: 'Download-Dienst nicht aktiv' };
    return await downloadService.removeHistoryEntry(downloadId);
  });

  ipcMain.handle('downloads:clear-completed', async (event) => {
    assertTrustedSender(event);
    if (!downloadService) return { ok: true };
    return await downloadService.clearCompleted();
  });

  // Auto-Updater
  ipcMain.handle('updater:check', async (event) => {
    assertTrustedSender(event);
    if (!updateService) return { ok: false, error: 'Update-Dienst nicht aktiv' };
    return await updateService.checkForUpdates();
  });

  ipcMain.handle('updater:download', async (event) => {
    assertTrustedSender(event);
    if (!updateService) return { ok: false, error: 'Update-Dienst nicht aktiv' };
    return await updateService.downloadUpdate();
  });

  ipcMain.handle('updater:install', (event) => {
    assertTrustedSender(event);
    if (!updateService) return { ok: false, error: 'Update-Dienst nicht aktiv' };
    return updateService.installUpdate();
  });

  ipcMain.handle('updater:get-state', (event) => {
    assertTrustedSender(event);
    if (!updateService) {
      return { ok: true, data: { status: 'idle', version: app.getVersion(), currentVersion: app.getVersion() } };
    }
    return { ok: true, data: updateService.getState() };
  });

  ipcMain.handle('app:get-version', (event) => {
    assertTrustedSender(event);
    return { ok: true, version: app.getVersion() };
  });
}

/**
 * Wartet (im Castlabs ECS-Build) auf die Installation/Aktivierung des Widevine-CDM.
 * Gibt Laufzeitversionen und den genauen CDM-Status detailliert im Terminal aus.
 * Schlägt fehl, falls Widevine nicht bereitgestellt werden kann.
 */
async function waitForWidevine(timeoutMs = 30000) {
  if (typeof process !== 'undefined' && process.versions) {
    console.info('[Worldcraft DRM] Laufzeitversionen (process.versions):', JSON.stringify(process.versions, null, 2));
  }

  if (!components || typeof components.whenReady !== 'function') {
    const errorMsg = '[Widevine] Kein Castlabs-ECS-Build erkannt - components.whenReady ist nicht verfügbar.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`[Widevine] CDM nach ${timeoutMs} ms nicht bereit (Timeout).`)), timeoutMs);
    });
    await Promise.race([components.whenReady(), timeout]);

    if (components && typeof components.status === 'function') {
      console.info('[Widevine] Status:', JSON.stringify(components.status(), null, 2));
    } else {
      console.info('[Widevine] Bereit (components.whenReady aufgelöst).');
    }
    return true;
  } catch (err) {
    const errMsg = `[Widevine] Initialisierung fehlgeschlagen: ${err && err.message ? err.message : err}`;
    console.error(errMsg);
    if (components && typeof components.status === 'function') {
      console.info('[Widevine] Status:', JSON.stringify(components.status(), null, 2));
    }
    throw new Error(errMsg);
  } finally {
    clearTimeout(timer);
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Globalen Google Chrome User-Agent auf der Standard-Session erzwingen
  if (session && session.defaultSession) {
    session.defaultSession.setUserAgent(CHROME_USER_AGENT);

    // Netflix / Widevine CDM DRM-Permissions sicher gewähren (nur fuer sichere HTTPS / localhost Kontexte)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const reqUrl = (details && details.requestingUrl) || (webContents ? webContents.getURL() : '');
      const isSecure = reqUrl.startsWith('https://') || reqUrl.startsWith('http://localhost') || reqUrl.startsWith('http://127.0.0.1');

      if ((permission === 'protected-media-identifier' || permission === 'mediaKeySystem') && isSecure) {
        return callback(true);
      }
      if (permission === 'fullscreen') {
        return callback(true);
      }
      return callback(false);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      const isSecure = requestingOrigin && (requestingOrigin.startsWith('https://') || requestingOrigin.startsWith('http://localhost') || requestingOrigin.startsWith('http://127.0.0.1'));
      if ((permission === 'protected-media-identifier' || permission === 'mediaKeySystem') && isSecure) {
        return true;
      }
      if (permission === 'fullscreen') {
        return true;
      }
      return false;
    });

    // Client-Hints (sec-ch-ua) säubern, passend zur tatsächlichen Chromium-Version
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      requestHeaders['User-Agent'] = CHROME_USER_AGENT;
      if (requestHeaders['sec-ch-ua']) {
        requestHeaders['sec-ch-ua'] = `"Google Chrome";v="${realChromeMajor}", "Chromium";v="${realChromeMajor}", "Not_A Brand";v="24"`;
      }
      if (requestHeaders['sec-ch-ua-mobile']) {
        requestHeaders['sec-ch-ua-mobile'] = '?0';
      }
      if (requestHeaders['sec-ch-ua-platform']) {
        requestHeaders['sec-ch-ua-platform'] = '"Windows"';
      }
      callback({ cancel: false, requestHeaders });
    });
  }

  // Widevine-CDM bereitstellen, bevor irgendein Fenster geöffnet wird (Castlabs ECS)
  try {
    await waitForWidevine();
  } catch (widevineErr) {
    console.error('[Widevine] Kritischer CDM-Fehler beim App-Start:', widevineErr.message);
  }

  // Protokoll-Registrierung für http, https & worldcraft (Windows Standardbrowser)
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('http', process.execPath, [path.resolve(process.argv[1])]);
        app.setAsDefaultProtocolClient('https', process.execPath, [path.resolve(process.argv[1])]);
        app.setAsDefaultProtocolClient('worldcraft', process.execPath, [path.resolve(process.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient('http');
      app.setAsDefaultProtocolClient('https');
      app.setAsDefaultProtocolClient('worldcraft');
    }
  } catch (err) {
    console.warn('[Worldcraft Protocol Registration Error]:', err.message);
  }

  // URL aus process.argv im ready-Event auslesen
  const startupUrl = extractTargetUrlFromArgs(process.argv);

  storageService = new StorageService(null, app, safeStorage);
  geminiService = new GeminiService();
  aiService = new AiService();
  startWidgetsServer();
  downloadService = new DownloadService(app.getPath('userData'));
  await downloadService.init();

  downloadService.setUpdateListener((event, data) => {
    for (const win of windows) {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          if (event === 'done') {
            win.webContents.send('downloads:done', data);
          } else {
            win.webContents.send('downloads:updated', data);
          }
        } catch (e) {
          console.error('[Downloads IPC Error]:', e.message);
        }
      }
    }
    if (mainWindow && !mainWindow.isDestroyed() && !windows.has(mainWindow) && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      try {
        if (event === 'done') {
          mainWindow.webContents.send('downloads:done', data);
        } else {
          mainWindow.webContents.send('downloads:updated', data);
        }
      } catch (e) {
        console.error('[Downloads IPC Error]:', e.message);
      }
    }
  });

  updateService = new UpdateService(app);
  updateService.init();
  updateService.setListener((state) => {
    for (const win of windows) {
      if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        try {
          win.webContents.send('updater:status-changed', state);
        } catch (e) {}
      }
    }
    if (mainWindow && !mainWindow.isDestroyed() && !windows.has(mainWindow) && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      try {
        mainWindow.webContents.send('updater:status-changed', state);
      } catch (e) {}
    }
  });

  // Globaler WebContents-Sicherheits-Handler & Crash-Listener:
  app.on('render-process-gone', (event, webContents, details) => {
    console.error(`[Worldcraft App Crash] render-process-gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  app.on('child-process-gone', (event, details) => {
    console.error(`[Worldcraft App Crash] child-process-gone: type=${details.type}, reason=${details.reason}, exitCode=${details.exitCode}, name=${details.name || 'unnamed'}`);
  });

  // Globaler WebContents-Sicherheits-Handler:
  // Fängt ausnahmslos jedes window.open und jeden target="_blank"-Klick app-weit ab.
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      createNewTab(url);
      return { action: 'deny' };
    });
  });

  registerIpcHandlers();
  createMainWindow(startupUrl);

  // Hinweis: Browserweite Shortcuts (Strg+N, Strg+T, Strg+W, F11, ...) laufen ausschließlich über
  // handleBrowserInputEvent (before-input-event). Es wird bewusst KEIN globalShortcut registriert,
  // da dieser systemweit (auch in fremden Anwendungen) greifen würde.

  if (app.isPackaged) {
    const autoCheck = storageService ? storageService.get('autoCheckUpdates', true) : true;
    if (autoCheck) {
      setTimeout(() => {
        updateService.checkForUpdates().catch((err) => {
          console.log('[UpdateService] Startup check skipped or failed:', err && err.message ? err.message : err);
        });
      }, 4500);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 || windows.size === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (e) {}

  if (dragGhostWindow && !dragGhostWindow.isDestroyed()) {
    try {
      dragGhostWindow.destroy();
    } catch (e) {}
    dragGhostWindow = null;
  }

  if (widgetsServer) {
    try {
      widgetsServer.close();
    } catch (e) {}
  }
});

process.on('uncaughtException', (err) => {
  // Safe logging without credentials
  console.error('[Worldcraft Main Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worldcraft Unhandled Rejection]:', reason);
});

module.exports = {
  createNewWindow,
  createBrowserWindow,
  windows
};
