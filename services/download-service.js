'use strict';

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

const MAX_HISTORY_ITEMS = 100;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const FINISHED_DOWNLOAD_TTL_MS = 5 * 60 * 1000; // beendete Downloads nach 5 Minuten aus der Map entfernen
const PRUNE_INTERVAL_MS = 60 * 1000;

class DownloadService {
  constructor(userDataDir, options = {}) {
    this.userDataDir = userDataDir;
    this.historyFile = path.join(userDataDir, 'downloads.json');
    this.activeDownloads = new Map(); // id -> { item, meta, lastTime, lastBytes }
    this.history = []; // array of serializable download metadata
    this.onUpdateCallback = null;
    this.shellModule = options.shell || shell;
    this.pruneTimer = null;
  }

  async init() {
    this.history = await this._readHistoryWithRecovery();
    this.startPruning();
  }

  /**
   * Startet das periodische Pruning beendeter/fehlgeschlagener Downloads.
   */
  startPruning() {
    if (this.pruneTimer) return;
    this.pruneTimer = setInterval(() => this.pruneFinishedDownloads(), PRUNE_INTERVAL_MS);
    if (this.pruneTimer && typeof this.pruneTimer.unref === 'function') {
      this.pruneTimer.unref();
    }
  }

  stopPruning() {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  /**
   * Entfernt beendete (completed/cancelled/interrupted) Tracker, die älter als
   * FINISHED_DOWNLOAD_TTL_MS sind, aus der activeDownloads-Map und gibt damit die
   * DownloadItem-Referenzen frei. Die persistente Download-Historie bleibt unberührt.
   * @returns {number} Anzahl entfernter Einträge
   */
  pruneFinishedDownloads(now = Date.now()) {
    let removed = 0;
    for (const [id, tracker] of this.activeDownloads.entries()) {
      const endTime = tracker && tracker.meta ? tracker.meta.endTime : null;
      if (typeof endTime === 'number' && now - endTime >= FINISHED_DOWNLOAD_TTL_MS) {
        this.activeDownloads.delete(id);
        removed++;
      }
    }
    return removed;
  }

  setUpdateListener(callback) {
    this.onUpdateCallback = callback;
  }

  _notify(event, data) {
    if (typeof this.onUpdateCallback === 'function') {
      try {
        this.onUpdateCallback(event, data);
      } catch (err) {
        console.error('[DownloadService] Error in update listener:', err.message);
      }
    }
  }

  async _atomicWriteHistory() {
    try {
      const dataStr = JSON.stringify(this.history.slice(0, MAX_HISTORY_ITEMS), null, 2);
      const tempPath = `${this.historyFile}.${Date.now()}.${Math.random().toString(36).substring(2, 6)}.tmp`;
      await fs.promises.writeFile(tempPath, dataStr, 'utf8');
      try {
        await fs.promises.rename(tempPath, this.historyFile);
      } catch (renameErr) {
        await fs.promises.copyFile(tempPath, this.historyFile);
        await fs.promises.unlink(tempPath).catch(() => {});
      }
    } catch (err) {
      console.error('[DownloadService] Failed to save downloads history:', err.message);
    }
  }

  async _readHistoryWithRecovery() {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }
    try {
      const stats = await fs.promises.stat(this.historyFile);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error('Downloads history exceeds maximum allowed size.');
      }
      const raw = await fs.promises.readFile(this.historyFile, 'utf8');
      if (!raw || raw.trim().length === 0) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          id: String(item.id || ''),
          fileName: String(item.fileName || 'unknown'),
          url: String(item.url || ''),
          savePath: String(item.savePath || ''),
          totalBytes: typeof item.totalBytes === 'number' ? item.totalBytes : 0,
          receivedBytes: typeof item.receivedBytes === 'number' ? item.receivedBytes : 0,
          percent: typeof item.percent === 'number' ? item.percent : null,
          speed: 0,
          state: String(item.state || 'completed'),
          startTime: typeof item.startTime === 'number' ? item.startTime : Date.now(),
          endTime: typeof item.endTime === 'number' ? item.endTime : Date.now(),
          error: item.error || null
        }));
      }
      return [];
    } catch (err) {
      // Backup corrupt file and return empty
      try {
        await fs.promises.copyFile(this.historyFile, `${this.historyFile}.corrupt.${Date.now()}`);
        await fs.promises.unlink(this.historyFile);
      } catch (backupErr) {}
      return [];
    }
  }

  /**
   * Sanitizes filenames to prevent path traversal or special characters
   */
  sanitizeFileName(rawName) {
    if (!rawName || typeof rawName !== 'string') return 'download';
    const base = path.basename(rawName).trim();
    const clean = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    return clean.length > 0 ? clean.slice(0, 255) : 'download';
  }

  /**
   * Computes human-readable metrics and progress safely
   */
  static calculateMetrics(receivedBytes, totalBytes, lastBytes = 0, timeDeltaMs = 1000) {
    const rec = Math.max(0, Number(receivedBytes) || 0);
    const tot = Number(totalBytes);
    const hasTotal = typeof tot === 'number' && tot > 0;

    let percent = null;
    if (hasTotal) {
      percent = Math.min(100, Math.max(0, Math.round((rec / tot) * 100)));
    }

    let speed = 0;
    if (timeDeltaMs > 0 && rec >= lastBytes) {
      const bytesDiff = rec - lastBytes;
      speed = Math.round((bytesDiff / timeDeltaMs) * 1000);
    }

    return { percent, speed, hasTotal };
  }

  /**
   * Attaches to a session's will-download event
   */
  registerSession(session) {
    if (!session || typeof session.on !== 'function') return;

    session.on('will-download', (event, item, webContents) => {
      this.handleWillDownload(item, webContents);
    });
  }

  handleWillDownload(item, webContents) {
    const id = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const originalName = item.getFilename();
    const sanitizedName = this.sanitizeFileName(originalName);

    const startTime = Date.now();
    const totalBytes = item.getTotalBytes() || 0;

    const meta = {
      id,
      fileName: sanitizedName,
      url: item.getURL() || '',
      savePath: item.getSavePath() || '',
      totalBytes: totalBytes > 0 ? totalBytes : -1,
      receivedBytes: 0,
      percent: totalBytes > 0 ? 0 : null,
      speed: 0,
      state: 'progressing',
      startTime,
      endTime: null,
      error: null
    };

    const tracker = {
      item,
      meta,
      lastTime: startTime,
      lastBytes: 0
    };

    this.activeDownloads.set(id, tracker);
    this._notify('created', meta);

    item.on('updated', (event, state) => {
      const now = Date.now();
      const timeDelta = Math.max(1, now - tracker.lastTime);
      const currentReceived = item.getReceivedBytes() || 0;
      const currentTotal = item.getTotalBytes();

      const { percent, speed } = DownloadService.calculateMetrics(
        currentReceived,
        currentTotal,
        tracker.lastBytes,
        timeDelta
      );

      tracker.meta.receivedBytes = currentReceived;
      tracker.meta.totalBytes = currentTotal > 0 ? currentTotal : -1;
      tracker.meta.percent = percent;
      tracker.meta.speed = speed;
      tracker.meta.savePath = item.getSavePath() || tracker.meta.savePath;

      if (state === 'interrupted') {
        tracker.meta.state = 'interrupted';
      } else {
        tracker.meta.state = 'progressing';
      }

      tracker.lastTime = now;
      tracker.lastBytes = currentReceived;

      this._notify('updated', tracker.meta);
    });

    item.once('done', async (event, state) => {
      tracker.meta.endTime = Date.now();
      tracker.meta.speed = 0;
      tracker.meta.savePath = item.getSavePath() || tracker.meta.savePath;

      if (state === 'completed') {
        tracker.meta.state = 'completed';
        tracker.meta.percent = 100;
        tracker.meta.receivedBytes = tracker.meta.totalBytes > 0 ? tracker.meta.totalBytes : tracker.meta.receivedBytes;
      } else if (state === 'cancelled') {
        tracker.meta.state = 'cancelled';
      } else {
        tracker.meta.state = 'interrupted';
        tracker.meta.error = 'Download unterbrochen oder Netzwerkfehler';
      }

      this.activeDownloads.delete(id);

      // Prepend to history
      this.history.unshift({ ...tracker.meta });
      if (this.history.length > MAX_HISTORY_ITEMS) {
        this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
      }

      await this._atomicWriteHistory();
      this._notify('done', tracker.meta);
    });
  }

  getDownloads() {
    const list = [];
    // Active downloads first
    for (const tracker of this.activeDownloads.values()) {
      list.push({ ...tracker.meta });
    }
    // Then history
    for (const hist of this.history) {
      if (!this.activeDownloads.has(hist.id)) {
        list.push({ ...hist });
      }
    }
    return list;
  }

  async cancelDownload(downloadId) {
    if (!downloadId || typeof downloadId !== 'string') {
      return { ok: false, error: 'Ungültige Download-ID' };
    }
    const tracker = this.activeDownloads.get(downloadId);
    if (!tracker || !tracker.item) {
      return { ok: false, error: 'Aktiver Download nicht gefunden' };
    }
    try {
      tracker.item.cancel();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async openDownload(downloadId) {
    if (!downloadId || typeof downloadId !== 'string') {
      return { ok: false, error: 'Ungültige Download-ID' };
    }
    const all = this.getDownloads();
    const entry = all.find((d) => d.id === downloadId);
    if (!entry) {
      return { ok: false, error: 'Download-Eintrag nicht gefunden' };
    }
    if (entry.state !== 'completed') {
      return { ok: false, error: 'Datei ist noch nicht fertig heruntergeladen' };
    }
    if (!entry.savePath || !fs.existsSync(entry.savePath)) {
      return { ok: false, error: 'Die Datei existiert nicht mehr am Zielort' };
    }

    try {
      const result = await this.shellModule.openPath(entry.savePath);
      if (result) {
        return { ok: false, error: result };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async showInFolder(downloadId) {
    if (!downloadId || typeof downloadId !== 'string') {
      return { ok: false, error: 'Ungültige Download-ID' };
    }
    const all = this.getDownloads();
    const entry = all.find((d) => d.id === downloadId);
    if (!entry) {
      return { ok: false, error: 'Download-Eintrag nicht gefunden' };
    }
    if (!entry.savePath || !fs.existsSync(entry.savePath)) {
      return { ok: false, error: 'Die Datei existiert nicht mehr am Zielort' };
    }

    try {
      this.shellModule.showItemInFolder(entry.savePath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async removeHistoryEntry(downloadId) {
    if (!downloadId || typeof downloadId !== 'string') {
      return { ok: false, error: 'Ungültige Download-ID' };
    }
    this.history = this.history.filter((d) => d.id !== downloadId);
    await this._atomicWriteHistory();
    this._notify('history-changed', { id: downloadId });
    return { ok: true };
  }

  async clearCompleted() {
    this.history = this.history.filter((d) => d.state === 'progressing');
    await this._atomicWriteHistory();
    this._notify('history-changed', {});
    return { ok: true };
  }
}

module.exports = {
  DownloadService,
  MAX_HISTORY_ITEMS
};
