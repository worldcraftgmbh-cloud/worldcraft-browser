'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { StorageService } = require('../services/storage-service');
const { BLOCKED_SCHEMES, normalizeUrl } = require('../services/url-helper');

test('Security: Preload Exposes Only Whitelisted Safe APIs', () => {
  const preloadPath = path.resolve(__dirname, '..', 'preload.js');
  const code = fs.readFileSync(preloadPath, 'utf8');

  // Verify contextBridge is used
  assert.equal(code.includes("contextBridge.exposeInMainWorld('worldcraft'"), true);

  // Must NOT expose raw ipcRenderer
  assert.equal(code.includes('exposeInMainWorld(\'ipcRenderer\''), false);

  // Must NOT expose generic send method
  assert.equal(code.includes('send: (channel'), false);
  assert.equal(code.includes('ipcRenderer.send('), false);

  // Must NOT import dangerous node modules in preload
  assert.equal(code.includes("require('fs')"), false);
  assert.equal(code.includes("require('child_process')"), false);
  assert.equal(code.includes("require('net')"), false);

  // Authorized namespaces
  assert.equal(code.includes('downloads: {'), true);
  assert.equal(code.includes('updater: {'), true);
  assert.equal(code.includes('assertString('), true);
  assert.equal(code.includes('assertObject('), true);
});

test('Security: Main Process WebPreferences Security Hardening', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  // Main Window security
  assert.equal(code.includes('contextIsolation: true'), true);
  assert.equal(code.includes('nodeIntegration: false'), true);
  assert.equal(code.includes('sandbox: true'), true);
  assert.equal(code.includes('webviewTag: false'), true);

  // External view security configuration
  assert.equal(code.includes('setWindowOpenHandler'), true);
  assert.equal(code.includes("wc.on('will-navigate'"), true);
  assert.equal(code.includes("wc.on('will-redirect'"), true);
});

test('Security: Force Dark Mode and Chromatic Flags in main.js', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  assert.equal(code.includes("nativeTheme.themeSource = 'dark'"), true);
  assert.equal(code.includes("app.commandLine.appendSwitch('enable-features', 'WebContentsForceDark')"), true);
});

test('Security: Native Electron Menu Removed & Clean UI Enforcement', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  assert.equal(code.includes('Menu.setApplicationMenu(null)'), true, 'Application menu must be set to null');
  assert.equal(code.includes('mainWindow.setMenuBarVisibility(false)'), true, 'MenuBar visibility must be false');
  assert.equal(code.includes('mainWindow.setAutoHideMenuBar(true)'), true, 'AutoHideMenuBar must be true');
});

test('Security: Download & Updater IPC Endpoints Enforce Sender Authentication', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  const requiredProtectedChannels = [
    'downloads:list',
    'downloads:open',
    'downloads:show-in-folder',
    'downloads:cancel',
    'downloads:remove-history-entry',
    'downloads:clear-completed',
    'updater:check',
    'updater:download',
    'updater:install',
    'updater:get-state',
    'ai:chat',
    'ai:summarize-current-page',
    'ai:get-status',
    'ai:get-providers',
    'ai:set-provider-key',
    'ai:clear-provider-key',
    'forge:generate',
    'forge:list',
    'forge:delete',
    'forge:get',
    'app:get-version',
    'view:set-translate-banner',
    'tabs:translate',
    'tabs:restore-translation',
    'tabs:set-view-visible',
    'tabs:focus'
  ];

  for (const channel of requiredProtectedChannels) {
    const channelIdx = code.indexOf(`'${channel}'`);
    assert.notEqual(channelIdx, -1, `Channel ${channel} must be registered in main.js`);
    // Find the next 200 characters following the channel declaration to verify assertTrustedSender is called
    const slice = code.slice(channelIdx, channelIdx + 200);
    assert.equal(slice.includes('assertTrustedSender(event)'), true, `Channel ${channel} must enforce assertTrustedSender`);
  }
});

test('Security: API Key is Never Leaked into settings.json', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worldcraft-sec-test-'));
  try {
    const storage = new StorageService(tempDir);

    // Attempt to inject an API key through saveSettings
    await storage.saveSettings({
      searchEngine: 'duckduckgo',
      apiKey: 'SUPER_SECRET_LEAKED_KEY_12345',
      geminiApiKey: 'ANOTHER_KEY_67890',
      openaiApiKey: 'OPENAI_LEAK_SECRET_111',
      anthropicApiKey: 'CLAUDE_LEAK_SECRET_222',
      key: 'GENERIC_KEY_LEAK_333'
    });

    const settings = await storage.getSettings();
    assert.equal(settings.apiKey, undefined, 'apiKey must not be in returned settings');
    assert.equal(settings.geminiApiKey, undefined, 'geminiApiKey must not be in returned settings');
    assert.equal(settings.openaiApiKey, undefined);
    assert.equal(settings.anthropicApiKey, undefined);
    assert.equal(settings.key, undefined);

    // Inspect actual raw file on disk
    const rawFileContent = fs.readFileSync(path.join(tempDir, 'settings.json'), 'utf8');
    assert.equal(rawFileContent.includes('SUPER_SECRET_LEAKED_KEY'), false, 'Key must not exist on disk in settings.json');
    assert.equal(rawFileContent.includes('ANOTHER_KEY'), false);
    assert.equal(rawFileContent.includes('OPENAI_LEAK_SECRET'), false);
    assert.equal(rawFileContent.includes('CLAUDE_LEAK_SECRET'), false);
    assert.equal(rawFileContent.includes('GENERIC_KEY_LEAK'), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Security: Dangerous URI Schemes are Blocked', () => {
  assert.equal(BLOCKED_SCHEMES.includes('javascript:'), true);
  assert.equal(BLOCKED_SCHEMES.includes('file:'), true);
  assert.equal(BLOCKED_SCHEMES.includes('data:'), true);
  assert.equal(BLOCKED_SCHEMES.includes('vbscript:'), true);

  const attacks = [
    'javascript:alert(document.domain)',
    'file:///etc/shadow',
    'file:///c:/boot.ini',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='
  ];

  for (const attack of attacks) {
    const result = normalizeUrl(attack);
    assert.equal(result.ok, false);
    assert.equal(result.error.includes('blockiert'), true);
  }
});

test('Security: IPC Origin Authentication in main.js', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  assert.equal(code.includes('assertTrustedSender'), true);
  assert.equal(code.includes('if (!event || !isTrustedSender(event.sender))'), true);
  assert.equal(code.includes("throw new Error('Untrusted sender')"), true);
});

test('Security: Global Window Open Handler & Internal Tab Navigation Enforcement', () => {
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  // Verify wc.setWindowOpenHandler redirects to createNewTab
  assert.equal(code.includes('wc.setWindowOpenHandler(({ url }) => {'), true, 'wc.setWindowOpenHandler must be configured');
  assert.equal(code.includes('createNewTab(url)'), true, 'Must call createNewTab(url)');
  assert.equal(code.includes("return { action: 'deny' }"), true, 'Must return deny action');

  // Verify app.on("web-contents-created") enforces setWindowOpenHandler globally
  assert.equal(code.includes("app.on('web-contents-created'"), true, 'app.on web-contents-created must enforce window open handling');

  // Verify mainWindow also enforces setWindowOpenHandler
  assert.equal(code.includes('mainWindow.webContents.setWindowOpenHandler'), true, 'mainWindow must enforce setWindowOpenHandler');

  // Verify NO shell.openExternal is used for general web navigation
  assert.equal(code.includes('shell.openExternal'), false, 'Must not call shell.openExternal for links');
});

test('Security: Verified Auth Popup Whitelist for OAuth/SSO Flows', () => {
  const { isVerifiedAuthPopup } = require('../services/url-helper');
  const mainPath = path.resolve(__dirname, '..', 'main.js');
  const code = fs.readFileSync(mainPath, 'utf8');

  // Verify main.js uses isVerifiedAuthPopup
  assert.equal(code.includes('isVerifiedAuthPopup(url)'), true, 'main.js must evaluate isVerifiedAuthPopup');

  // 1. Google OAuth & Account endpoints
  assert.equal(isVerifiedAuthPopup('https://accounts.google.com/o/oauth2/v2/auth?client_id=123'), true);
  assert.equal(isVerifiedAuthPopup('https://accounts.google.com/signin/v2/identifier'), true);
  assert.equal(isVerifiedAuthPopup('https://accounts.google.com/ServiceLogin'), true);
  // Non-auth Google URLs
  assert.equal(isVerifiedAuthPopup('https://www.google.com/search?q=test'), false);
  assert.equal(isVerifiedAuthPopup('https://google.com/maps'), false);

  // 2. Twitch Identity, Passport & OAuth
  assert.equal(isVerifiedAuthPopup('https://id.twitch.tv/oauth2/authorize?client_id=xyz'), true);
  assert.equal(isVerifiedAuthPopup('https://passport.twitch.tv/authentications/new'), true);
  assert.equal(isVerifiedAuthPopup('https://www.twitch.tv/login'), true);
  assert.equal(isVerifiedAuthPopup('https://twitch.tv/signup'), true);
  // Non-auth Twitch URLs
  assert.equal(isVerifiedAuthPopup('https://www.twitch.tv/directory'), false);
  assert.equal(isVerifiedAuthPopup('https://twitch.tv/videos/12345'), false);

  // 3. Discord Identity & OAuth
  assert.equal(isVerifiedAuthPopup('https://discord.com/login'), true);
  assert.equal(isVerifiedAuthPopup('https://discord.com/oauth2/authorize?client_id=abc'), true);
  assert.equal(isVerifiedAuthPopup('https://discordapp.com/oauth2/authorize?client_id=abc'), true);
  // Non-auth Discord URLs
  assert.equal(isVerifiedAuthPopup('https://discord.com/channels/@me'), false);
  assert.equal(isVerifiedAuthPopup('https://discord.com/nitro'), false);

  // 4. Other verified providers
  assert.equal(isVerifiedAuthPopup('https://github.com/login/oauth/authorize?client_id=1'), true);
  assert.equal(isVerifiedAuthPopup('https://login.microsoftonline.com/common/oauth2/v2.0/authorize'), true);
  assert.equal(isVerifiedAuthPopup('https://login.live.com/oauth20_authorize.srf'), true);
  assert.equal(isVerifiedAuthPopup('https://appleid.apple.com/auth/authorize'), true);
  assert.equal(isVerifiedAuthPopup('https://steamcommunity.com/openid/login'), true);

  // 5. Insecure / arbitrary URLs must be blocked
  assert.equal(isVerifiedAuthPopup('http://accounts.google.com/oauth'), false, 'Insecure HTTP must be rejected');
  assert.equal(isVerifiedAuthPopup('https://evil-accounts.google.com/oauth'), false, 'Spoofed domains must be rejected');
  assert.equal(isVerifiedAuthPopup('https://example.com/login'), false, 'Arbitrary domains must be rejected');
  assert.equal(isVerifiedAuthPopup('javascript:alert(1)'), false, 'Dangerous schemes must be rejected');
  assert.equal(isVerifiedAuthPopup(''), false);
  assert.equal(isVerifiedAuthPopup(null), false);
  assert.equal(isVerifiedAuthPopup(undefined), false);
});

