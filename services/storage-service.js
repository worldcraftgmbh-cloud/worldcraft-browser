'use strict';

const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const DEFAULT_SETTINGS = {
  searchEngine: 'google',
  homepage: 'homescreen',
  geminiModel: 'gemini-3.8-flash',
  neuralCoreTier: 'fast',
  aiProvider: 'google',
  aiModel: 'gemini-3.8-flash',
  ollamaEndpoint: 'http://localhost:11434',
  audioVolume: 0.8,
  matrixRain: true,
  forceDark: true,
  backgroundRadio: true,
  aiOnStartup: false,
  notifyUpdates: true,
  animatedDownloads: true,
  cyberpunkGlow: true,
  language: 'de',
  customBackgroundMode: 'default',
  customBackgroundUrl: '',
  customBackgroundLocal: ''
};

const DEFAULT_FAVORITES = [
  {
    id: 'fav-youtube',
    title: 'YouTube',
    url: 'https://www.youtube.com/',
    icon: 'youtube',
    createdAt: Date.now()
  },
  {
    id: 'fav-twitch',
    title: 'Twitch',
    url: 'https://www.twitch.tv/',
    icon: 'twitch',
    createdAt: Date.now()
  },
  {
    id: 'fav-github',
    title: 'GitHub',
    url: 'https://github.com/',
    icon: 'github',
    createdAt: Date.now()
  },
  {
    id: 'fav-radio',
    title: 'WorldCraft Radio',
    url: 'internal://radio',
    icon: 'radio',
    createdAt: Date.now()
  }
];

const DEFAULT_RADIO = [
  {
    id: 'station-nightride',
    name: 'Nightride FM Synthwave',
    genre: 'Synthwave / Cyberpunk',
    url: 'https://stream.nightride.fm/nightride.mp3'
  },
  {
    id: 'station-chillsynth',
    name: 'Chillsynth Ambient',
    genre: 'Chillsynth / Downtempo',
    url: 'https://stream.nightride.fm/chillsynth.mp3'
  },
  {
    id: 'station-darksynth',
    name: 'Darksynth Cyber Beats',
    genre: 'Darksynth / Industrial',
    url: 'https://stream.nightride.fm/darksynth.mp3'
  },
  {
    id: 'station-spacestation',
    name: 'SomaFM Space Station',
    genre: 'Ambient / Space Electronics',
    url: 'https://ice2.somafm.com/spacestation-128-mp3'
  },
  {
    id: 'station-defcon',
    name: 'SomaFM DEF CON Radio',
    genre: 'Hacker / Cyber Beats',
    url: 'https://ice2.somafm.com/defcon-128-mp3'
  }
];

const DEFAULT_SESSION = {
  lastTabCount: 1,
  lastActiveIndex: 0,
  updatedAt: 0
};

class StorageService {
  constructor(baseDirectory, electronApp = null, safeStorage = null) {
    this.app = electronApp;
    this.safeStorage = safeStorage;
    this.baseDir = baseDirectory || this._resolveUserDataDir();
    this.warnings = [];
    this._ensureDirSync(this.baseDir);
  }

  _resolveUserDataDir() {
    if (this.app && typeof this.app.getPath === 'function') {
      try {
        return this.app.getPath('userData');
      } catch (err) {
        // Fallback if app not ready
      }
    }
    const home = process.env.APPDATA || process.env.HOME || process.cwd();
    return path.join(home, 'WorldcraftBrowserData');
  }

  _ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _getFilePath(fileName) {
    return path.join(this.baseDir, fileName);
  }

  async _atomicWriteJson(filePath, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    if (Buffer.byteLength(jsonStr, 'utf8') > MAX_FILE_SIZE) {
      throw new Error(`Data exceeds maximum storage limit of ${MAX_FILE_SIZE} bytes`);
    }

    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
    await fs.promises.writeFile(tempPath, jsonStr, 'utf8');

    try {
      await fs.promises.rename(tempPath, filePath);
    } catch (err) {
      // Fallback on Windows if target file is locked during atomic rename
      try {
        await fs.promises.copyFile(tempPath, filePath);
        await fs.promises.unlink(tempPath);
      } catch (copyErr) {
        // Cleanup temp file
        await fs.promises.unlink(tempPath).catch(() => {});
        throw copyErr;
      }
    }
  }

  async _readJsonWithRecovery(fileName, defaultData) {
    const filePath = this._getFilePath(fileName);

    if (!fs.existsSync(filePath)) {
      try {
        await this._atomicWriteJson(filePath, defaultData);
      } catch (writeErr) {
        // Silently return default if first-write fails
      }
      return defaultData;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`File size ${stats.size} exceeds maximum limit of ${MAX_FILE_SIZE}`);
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      if (!content || content.trim().length === 0) {
        return defaultData;
      }
      return JSON.parse(content);
    } catch (err) {
      // Corrupt file recovery
      const backupPath = `${filePath}.corrupt.${Date.now()}`;
      try {
        await fs.promises.copyFile(filePath, backupPath);
      } catch (backupErr) {
        // Ignore backup failure
      }

      this.warnings.push({
        file: fileName,
        time: Date.now(),
        message: `Corrupted file ${fileName} was backed up to ${path.basename(backupPath)} and reset to defaults.`
      });

      // Write defaults back
      try {
        await this._atomicWriteJson(filePath, defaultData);
      } catch (writeErr) {
        // Ignore
      }

      return defaultData;
    }
  }

  // --- Settings ---

  async getSettings() {
    const raw = await this._readJsonWithRecovery('settings.json', DEFAULT_SETTINGS);
    const sanitized = { ...DEFAULT_SETTINGS, ...raw };
    // Explicitly guarantee API key is NEVER present in settings
    delete sanitized.apiKey;
    delete sanitized.geminiApiKey;
    return sanitized;
  }

  async saveSettings(partialSettings) {
    if (!partialSettings || typeof partialSettings !== 'object') {
      throw new Error('Invalid settings object');
    }

    const current = await this.getSettings();
    const updated = {
      ...current,
      ...partialSettings
    };

    // Strip any attempted API key leak
    delete updated.apiKey;
    delete updated.geminiApiKey;
    delete updated.openaiApiKey;
    delete updated.anthropicApiKey;
    delete updated.key;

    // Validate properties
    if (typeof updated.searchEngine !== 'string') updated.searchEngine = 'google';
    if (typeof updated.geminiModel !== 'string') updated.geminiModel = 'gemini-3.8-flash';
    if (typeof updated.neuralCoreTier !== 'string') updated.neuralCoreTier = 'fast';
    if (typeof updated.aiProvider !== 'string') updated.aiProvider = 'google';
    if (typeof updated.aiModel !== 'string') updated.aiModel = 'gemini-3.8-flash';
    if (typeof updated.ollamaEndpoint !== 'string') updated.ollamaEndpoint = 'http://localhost:11434';
    if (typeof updated.audioVolume !== 'number' || updated.audioVolume < 0 || updated.audioVolume > 1) {
      updated.audioVolume = 0.8;
    }
    updated.matrixRain = Boolean(updated.matrixRain);
    updated.forceDark = Boolean(updated.forceDark);
    updated.backgroundRadio = Boolean(updated.backgroundRadio);
    updated.aiOnStartup = Boolean(updated.aiOnStartup);
    updated.notifyUpdates = Boolean(updated.notifyUpdates);
    updated.animatedDownloads = Boolean(updated.animatedDownloads);
    if (typeof updated.customBackgroundMode !== 'string') updated.customBackgroundMode = 'default';
    if (typeof updated.customBackgroundUrl !== 'string') updated.customBackgroundUrl = '';
    if (typeof updated.customBackgroundLocal !== 'string') updated.customBackgroundLocal = '';

    await this._atomicWriteJson(this._getFilePath('settings.json'), updated);
    return updated;
  }

  // --- Favorites ---

  async getFavorites() {
    const favorites = await this._readJsonWithRecovery('favorites.json', DEFAULT_FAVORITES);
    if (!Array.isArray(favorites)) return DEFAULT_FAVORITES;
    return favorites;
  }

  async addFavorite(item) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid favorite item');
    }
    if (!item.title || typeof item.title !== 'string' || item.title.trim().length === 0) {
      throw new Error('Favorite title is required');
    }
    if (!item.url || typeof item.url !== 'string' || item.url.trim().length === 0) {
      throw new Error('Favorite URL is required');
    }

    const list = await this.getFavorites();
    const newFav = {
      id: item.id || `fav-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: item.title.trim().slice(0, 100),
      url: item.url.trim().slice(0, 2048),
      icon: item.icon ? String(item.icon).slice(0, 32) : 'globe',
      createdAt: Date.now()
    };

    list.push(newFav);
    await this._atomicWriteJson(this._getFilePath('favorites.json'), list);
    return newFav;
  }

  async removeFavorite(favoriteId) {
    if (!favoriteId || typeof favoriteId !== 'string') {
      throw new Error('Favorite ID is required');
    }

    const list = await this.getFavorites();
    const filtered = list.filter((f) => f.id !== favoriteId);
    await this._atomicWriteJson(this._getFilePath('favorites.json'), filtered);
    return true;
  }

  async updateFavorite(favoriteId, partial) {
    if (!favoriteId || typeof favoriteId !== 'string' || !partial || typeof partial !== 'object') {
      throw new Error('Invalid favorite update arguments');
    }

    const list = await this.getFavorites();
    const index = list.findIndex((f) => f.id === favoriteId);
    if (index === -1) {
      throw new Error('Favorite not found');
    }

    if (partial.title) list[index].title = String(partial.title).trim().slice(0, 100);
    if (partial.url) list[index].url = String(partial.url).trim().slice(0, 2048);
    if (partial.icon) list[index].icon = String(partial.icon).trim().slice(0, 32);

    await this._atomicWriteJson(this._getFilePath('favorites.json'), list);
    return list[index];
  }

  // --- Radio Stations ---

  async getRadioStations() {
    const stations = await this._readJsonWithRecovery('radio.json', DEFAULT_RADIO);
    if (!Array.isArray(stations) || stations.length === 0) return DEFAULT_RADIO;
    return stations;
  }

  // --- Session Data ---

  async getSession() {
    return this._readJsonWithRecovery('session.json', DEFAULT_SESSION);
  }

  async saveSession(sessionData) {
    const current = await this.getSession();
    const updated = {
      ...current,
      ...sessionData,
      updatedAt: Date.now()
    };
    await this._atomicWriteJson(this._getFilePath('session.json'), updated);
    return updated;
  }

  // --- Secure Credentials (Multi-Provider API Keys) ---

  async _readCredentialsDict() {
    const keyFile = this._getFilePath('secure-credentials.bin');
    if (!fs.existsSync(keyFile)) {
      return {};
    }
    try {
      const buffer = await fs.promises.readFile(keyFile);
      if (!buffer || buffer.length === 0) return {};

      let rawStr = null;
      if (this.safeStorage && typeof this.safeStorage.isEncryptionAvailable === 'function' && this.safeStorage.isEncryptionAvailable()) {
        try {
          rawStr = this.safeStorage.decryptString(buffer);
        } catch (decryptErr) {}
      }

      if (!rawStr) {
        const str = buffer.toString('utf8');
        if (str.startsWith('WC_ENC:')) {
          const b64 = str.slice(7);
          rawStr = Buffer.from(b64, 'base64').toString('utf8');
        } else {
          rawStr = str;
        }
      }

      if (rawStr && rawStr.trim().startsWith('{')) {
        return JSON.parse(rawStr);
      } else if (rawStr && rawStr.trim()) {
        // Backwards compatibility for single string key
        return { google: rawStr.trim() };
      }
      return {};
    } catch (err) {
      return {};
    }
  }

  async _writeCredentialsDict(dict) {
    const keyFile = this._getFilePath('secure-credentials.bin');
    const jsonStr = JSON.stringify(dict);

    if (this.safeStorage && typeof this.safeStorage.isEncryptionAvailable === 'function' && this.safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = this.safeStorage.encryptString(jsonStr);
      await fs.promises.writeFile(keyFile, encryptedBuffer);
      return { ok: true, secure: true };
    }

    const warningMsg = 'SafeStorage DPAPI not available in current environment. Using restricted local fallback storage.';
    this.warnings.push({ time: Date.now(), message: warningMsg });
    const fallbackBuffer = Buffer.from(`WC_ENC:${Buffer.from(jsonStr, 'utf8').toString('base64')}`, 'utf8');
    await fs.promises.writeFile(keyFile, fallbackBuffer, { mode: 0o600 });
    return { ok: true, secure: false, warning: warningMsg };
  }

  async setApiKey(key, provider = 'google') {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('API key must be a non-empty string');
    }
    const prov = String(provider || 'google').toLowerCase();
    const dict = await this._readCredentialsDict();
    dict[prov] = key.trim();
    return await this._writeCredentialsDict(dict);
  }

  async getApiKey(provider = 'google') {
    const prov = String(provider || 'google').toLowerCase();
    const dict = await this._readCredentialsDict();
    if (dict[prov] && dict[prov].trim()) {
      return dict[prov].trim();
    }

    // Environment variable fallbacks for development
    if (prov === 'google') {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) return process.env.GEMINI_API_KEY.trim();
      if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.trim()) return process.env.GOOGLE_API_KEY.trim();
    } else if (prov === 'openai') {
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) return process.env.OPENAI_API_KEY.trim();
    } else if (prov === 'anthropic') {
      if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) return process.env.ANTHROPIC_API_KEY.trim();
    }
    return null;
  }

  async deleteApiKey(provider = 'google') {
    const prov = String(provider || 'google').toLowerCase();
    const dict = await this._readCredentialsDict();
    delete dict[prov];
    if (Object.keys(dict).length === 0) {
      const keyFile = this._getFilePath('secure-credentials.bin');
      if (fs.existsSync(keyFile)) {
        try { await fs.promises.unlink(keyFile); } catch (e) {}
      }
      return true;
    }
    await this._writeCredentialsDict(dict);
    return true;
  }

  async hasApiKey(provider = 'google') {
    const key = await this.getApiKey(provider);
    return Boolean(key && key.trim().length > 0);
  }

  async getConfiguredProviders() {
    const dict = await this._readCredentialsDict();
    const settings = await this.getSettings();
    return {
      google: Boolean(dict.google || process.env.GEMINI_API_KEY),
      openai: Boolean(dict.openai || process.env.OPENAI_API_KEY),
      anthropic: Boolean(dict.anthropic || process.env.ANTHROPIC_API_KEY),
      ollama: Boolean(dict.ollama || settings.ollamaEndpoint)
    };
  }
}

module.exports = {
  StorageService,
  DEFAULT_SETTINGS,
  DEFAULT_FAVORITES,
  DEFAULT_RADIO
};
