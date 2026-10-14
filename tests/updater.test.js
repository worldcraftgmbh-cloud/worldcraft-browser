'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const { UpdateService } = require('../services/update-service');

class MockAutoUpdater extends EventEmitter {
  constructor() {
    super();
    this.autoDownload = true;
    this.autoInstallOnAppQuit = false;
    this.checkForUpdatesCalled = false;
    this.downloadUpdateCalled = false;
    this.quitAndInstallCalled = false;
    this.shouldFailCheck = false;
    this.shouldFailDownload = false;
    this.simulatedUpdateInfo = null;
    this.quitArgs = null;
  }

  async checkForUpdates() {
    this.checkForUpdatesCalled = true;
    this.emit('checking-for-update');
    if (this.shouldFailCheck) {
      const err = new Error('HTTP 404: Cannot find latest.yml in the latest release artifacts');
      this.emit('error', err);
      throw err;
    }
    if (this.simulatedUpdateInfo) {
      this.emit('update-available', this.simulatedUpdateInfo);
      return { updateInfo: this.simulatedUpdateInfo };
    } else {
      this.emit('update-not-available', { version: '1.2.0' });
      return { updateInfo: { version: '1.2.0' } };
    }
  }

  async downloadUpdate() {
    this.downloadUpdateCalled = true;
    if (this.shouldFailDownload) {
      const err = new Error('Network timeout during patch download');
      this.emit('error', err);
      throw err;
    }
    this.emit('download-progress', { percent: 50, bytesPerSecond: 1048576, transferred: 52428800, total: 104857600 });
    this.emit('download-progress', { percent: 100, bytesPerSecond: 2097152, transferred: 104857600, total: 104857600 });
    this.emit('update-downloaded', this.simulatedUpdateInfo || { version: '1.3.0' });
    return ['Worldcraft-Browser-Setup.exe'];
  }

  quitAndInstall(isSilent, isForceRunAfter) {
    this.quitAndInstallCalled = true;
    this.quitArgs = { isSilent, isForceRunAfter };
  }
}

test('Updater: Keine neuere Version verfügbar (update-not-available)', async () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  const statuses = [];
  service.setListener((state) => statuses.push(state.status));

  const res = await service.checkForUpdates();
  assert.equal(res.ok, true);
  assert.equal(mockUpdater.checkForUpdatesCalled, true);
  assert.equal(statuses.includes('checking'), true);
  assert.equal(statuses.includes('not-available'), true);

  const state = service.getState();
  assert.equal(state.status, 'not-available');
  assert.equal(state.currentVersion, '1.2.0');
  assert.equal(state.availableVersion, null);
  assert.equal(state.error, null);
});

test('Updater: Eine neuere Version ist verfügbar (update-available ohne automatischen Download)', async () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  mockUpdater.simulatedUpdateInfo = { version: '1.3.0', releaseDate: '2026-10-15' };

  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  // Verifiziere, dass autoDownload zwingend auf false gesetzt ist
  assert.equal(mockUpdater.autoDownload, false, 'autoDownload must be false to require explicit user action');

  const res = await service.checkForUpdates();
  assert.equal(res.ok, true);
  assert.equal(mockUpdater.downloadUpdateCalled, false, 'Download must NOT start automatically');

  const state = service.getState();
  assert.equal(state.status, 'available');
  assert.equal(state.currentVersion, '1.2.0');
  assert.equal(state.availableVersion, '1.3.0');
});

test('Updater: Manueller Download-Trigger und Fortschrittsanzeige', async () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  mockUpdater.simulatedUpdateInfo = { version: '1.3.0', releaseDate: '2026-10-15' };

  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  await service.checkForUpdates();
  assert.equal(service.getState().status, 'available');

  const res = await service.downloadUpdate();
  assert.equal(res.ok, true);
  assert.equal(mockUpdater.downloadUpdateCalled, true);

  const finalState = service.getState();
  assert.equal(finalState.status, 'downloaded');
  assert.equal(finalState.progress.percent, 100);
  assert.equal(finalState.availableVersion, '1.3.0');
});

test('Updater: Download schlägt fehl (echte Fehlermeldung statt Up-To-Date)', async () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  mockUpdater.simulatedUpdateInfo = { version: '1.3.0' };
  mockUpdater.shouldFailDownload = true;

  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  await service.checkForUpdates();
  const dlRes = await service.downloadUpdate();

  assert.equal(dlRes.ok, false);
  assert.equal(dlRes.error.includes('Network timeout'), true);

  const state = service.getState();
  assert.equal(state.status, 'error');
  assert.equal(state.error.includes('Network timeout'), true);
  assert.notEqual(state.status, 'not-available', 'Error must NEVER be masked as not-available / up-to-date');
});

test('Updater: Update-Metadaten fehlen oder sind ungültig (404-Fehlerbehandlung)', async () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  mockUpdater.shouldFailCheck = true;

  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  const checkRes = await service.checkForUpdates();
  assert.equal(checkRes.ok, false);
  assert.equal(checkRes.error.includes('HTTP 404'), true);

  const state = service.getState();
  assert.equal(state.status, 'error');
  assert.equal(state.error.includes('latest.yml'), true);
  assert.notEqual(state.status, 'not-available');
});

test('Updater: Installation / Neustart wird abgewiesen, wenn nicht vorher heruntergeladen', () => {
  const mockApp = { isPackaged: true, getVersion: () => '1.2.0' };
  const mockUpdater = new MockAutoUpdater();
  const service = new UpdateService(mockApp, mockUpdater);
  service.init();

  // 1. Versuch im idle Status
  const resIdle = service.installUpdate();
  assert.equal(resIdle.ok, false);
  assert.equal(mockUpdater.quitAndInstallCalled, false);

  // 2. Versuch im downloaded Status
  service.status = 'downloaded';
  const resDownloaded = service.installUpdate();
  assert.equal(resDownloaded.ok, true);
  assert.equal(mockUpdater.quitAndInstallCalled, true);
  assert.deepEqual(mockUpdater.quitArgs, { isSilent: false, isForceRunAfter: true });
});

test('Updater: Version nach erfolgreichem Update korrekt anzeigen', () => {
  // Simuliere Zustand nach Neustart (App meldet nun neue Version 1.3.0)
  const updatedApp = { isPackaged: true, getVersion: () => '1.3.0' };
  const mockUpdater = new MockAutoUpdater();
  const service = new UpdateService(updatedApp, mockUpdater);
  service.init();

  const state = service.getState();
  assert.equal(state.version, '1.3.0');
  assert.equal(state.currentVersion, '1.3.0');
  assert.equal(state.status, 'idle');
});
