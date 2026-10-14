'use strict';

class UpdateService {
  constructor(electronApp, updaterModule = null) {
    this.app = electronApp;
    this.autoUpdater = updaterModule;
    this.status = 'idle'; // idle | checking | available | not-available | downloading | downloaded | error
    this.updateInfo = null;
    this.progress = null;
    this.errorMessage = null;
    this.listener = null;
    this.isChecking = false;
    this.isDownloading = false;
  }

  init() {
    if (!this.autoUpdater) {
      try {
        const updaterPkg = require('electron-updater');
        this.autoUpdater = updaterPkg.autoUpdater;
      } catch (err) {
        console.log('[UpdateService] electron-updater module not loaded:', err.message);
        return;
      }
    }

    if (!this.autoUpdater) return;

    // Downloads standardmäßig erst nach ausdrücklicher Nutzeraktion starten
    this.autoUpdater.autoDownload = false;
    this.autoUpdater.autoInstallOnAppQuit = false;

    this.autoUpdater.on('checking-for-update', () => {
      this.status = 'checking';
      this.isChecking = true;
      this.errorMessage = null;
      this._notify();
    });

    this.autoUpdater.on('update-available', (info) => {
      this.status = 'available';
      this.isChecking = false;
      this.isDownloading = false;
      this.updateInfo = {
        version: (info && info.version) || 'unbekannt',
        releaseDate: (info && info.releaseDate) || null,
        releaseNotes: (info && info.releaseNotes) || null,
        files: (info && info.files) || []
      };
      this._notify();
    });

    this.autoUpdater.on('update-not-available', (info) => {
      this.status = 'not-available';
      this.isChecking = false;
      this.isDownloading = false;
      this.updateInfo = null;
      this._notify();
    });

    this.autoUpdater.on('download-progress', (progressObj) => {
      this.status = 'downloading';
      this.isDownloading = true;
      this.progress = {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: Math.round(progressObj.bytesPerSecond || 0),
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0
      };
      this._notify();
    });

    this.autoUpdater.on('update-downloaded', (info) => {
      this.status = 'downloaded';
      this.isDownloading = false;
      this.updateInfo = {
        version: (info && info.version) || (this.updateInfo && this.updateInfo.version) || 'neu',
        releaseDate: (info && info.releaseDate) || (this.updateInfo && this.updateInfo.releaseDate) || null
      };
      this._notify();
    });

    this.autoUpdater.on('error', (err) => {
      console.error('AutoUpdater error:', err && err.message ? err.message : err);
      this.status = 'error';
      this.isChecking = false;
      this.isDownloading = false;
      this.errorMessage = err && err.message ? err.message.slice(0, 300) : 'Fehler bei der Updateprüfung';
      this._notify();
    });
  }

  setListener(callback) {
    this.listener = callback;
  }

  _notify() {
    if (typeof this.listener === 'function') {
      try {
        this.listener(this.getState());
      } catch (err) {
        console.error('[UpdateService] Error notifying listener:', err.message);
      }
    }
  }

  getState() {
    let currentVersion = '1.2.0';
    try {
      if (this.app && typeof this.app.getVersion === 'function') {
        currentVersion = this.app.getVersion();
      } else {
        const pkg = require('../package.json');
        currentVersion = pkg.version;
      }
    } catch (e) {
      currentVersion = '1.2.0';
    }

    return {
      version: currentVersion,
      currentVersion: currentVersion,
      availableVersion: this.updateInfo ? this.updateInfo.version : null,
      status: this.status,
      updateInfo: this.updateInfo,
      progress: this.progress,
      error: this.errorMessage,
      isPackaged: Boolean(this.app && this.app.isPackaged)
    };
  }

  async checkForUpdates() {
    if (this.isChecking) {
      return { ok: false, error: 'Updateprüfung läuft bereits' };
    }

    this.isChecking = true;
    this.status = 'checking';
    this.errorMessage = null;
    this._notify();

    // Dev-Mode fallback ONLY when no injected/active autoUpdater is configured
    if (!this.autoUpdater && (!this.app || !this.app.isPackaged)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      this.isChecking = false;
      this.status = 'not-available';
      this._notify();
      return {
        ok: true,
        devMode: true,
        status: 'not-available',
        message: 'SYSTEM UP TO DATE // KEINE UPDATES VORHANDEN'
      };
    }

    if (!this.autoUpdater) {
      this.isChecking = false;
      this.status = 'error';
      this.errorMessage = 'AutoUpdater nicht initialisiert';
      this._notify();
      return { ok: false, error: 'AutoUpdater nicht initialisiert' };
    }

    try {
      const res = await this.autoUpdater.checkForUpdates();
      return { ok: true, data: res };
    } catch (err) {
      this.isChecking = false;
      this.status = 'error';
      this.errorMessage = err.message;
      this._notify();
      return { ok: false, error: err.message };
    }
  }

  async downloadUpdate() {
    if (this.status !== 'available' && this.status !== 'downloading') {
      return { ok: false, error: 'Kein Update zum Download verfügbar' };
    }

    if (this.isDownloading) {
      return { ok: false, error: 'Download läuft bereits' };
    }

    if (!this.autoUpdater) {
      return { ok: false, error: 'AutoUpdater nicht initialisiert' };
    }

    this.isDownloading = true;
    this.status = 'downloading';
    this.errorMessage = null;
    this._notify();

    try {
      if (typeof this.autoUpdater.downloadUpdate === 'function') {
        await this.autoUpdater.downloadUpdate();
      }
      return { ok: true };
    } catch (err) {
      this.isDownloading = false;
      this.status = 'error';
      this.errorMessage = err && err.message ? err.message : 'Fehler beim Herunterladen des Updates';
      this._notify();
      return { ok: false, error: this.errorMessage };
    }
  }

  installUpdate() {
    if (this.status !== 'downloaded') {
      return { ok: false, error: 'Kein heruntergeladenes Update verfügbar' };
    }

    if (!this.autoUpdater) {
      return { ok: false, error: 'AutoUpdater nicht verfügbar' };
    }

    try {
      // quitAndInstall(isSilent, isForceRunAfter)
      this.autoUpdater.quitAndInstall(false, true);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

module.exports = { UpdateService };
