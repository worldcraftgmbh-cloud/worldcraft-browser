'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function assertString(val, name, maxLength = 2048) {
  if (typeof val !== 'string' || val.length > maxLength) {
    throw new TypeError(`Ungültiger Parameter "${name}": Erwartet String mit maximal ${maxLength} Zeichen.`);
  }
}

function assertBoolean(val, name) {
  if (typeof val !== 'boolean') {
    throw new TypeError(`Ungültiger Parameter "${name}": Erwartet Boolean.`);
  }
}

function assertObject(val, name) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    throw new TypeError(`Ungültiger Parameter "${name}": Erwartet Objekt.`);
  }
}

const worldcraftBridge = {
  tabs: {
    create: async (url = '') => {
      if (url) assertString(url, 'url', 8192);
      return await ipcRenderer.invoke('tabs:create', { url });
    },
    close: async (tabId) => {
      assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:close', { tabId });
    },
    activate: async (tabId) => {
      assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:activate', { tabId });
    },
    navigate: async (tabId, url) => {
      assertString(tabId, 'tabId', 128);
      assertString(url, 'url', 8192);
      return await ipcRenderer.invoke('tabs:navigate', { tabId, url });
    },
    back: async (tabId) => {
      if (tabId) assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:back', { tabId: tabId || undefined });
    },
    forward: async (tabId) => {
      if (tabId) assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:forward', { tabId: tabId || undefined });
    },
    reload: async (tabId) => {
      if (tabId) assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:reload', { tabId: tabId || undefined });
    },
    stop: async (tabId) => {
      assertString(tabId, 'tabId', 128);
      return await ipcRenderer.invoke('tabs:stop', { tabId });
    },
    getState: async () => {
      return await ipcRenderer.invoke('tabs:get-state');
    },
    setBounds: async (bounds) => {
      assertObject(bounds, 'bounds');
      return await ipcRenderer.invoke('tabs:set-bounds', bounds);
    },
    setViewVisible: async (visible) => {
      assertBoolean(visible, 'visible');
      return await ipcRenderer.invoke('tabs:set-view-visible', { visible });
    },
    focus: async (tabId) => {
      if (tabId !== undefined && tabId !== null) {
        assertString(tabId, 'tabId', 128);
      }
      return await ipcRenderer.invoke('tabs:focus', { tabId: tabId || undefined });
    },
    translate: async (tabId, targetLang) => {
      assertString(tabId, 'tabId', 64);
      assertString(targetLang, 'targetLang', 16);
      return await ipcRenderer.invoke('tabs:translate', { tabId, targetLang });
    },
    restoreTranslation: async (tabId) => {
      assertString(tabId, 'tabId', 64);
      return await ipcRenderer.invoke('tabs:restore-translation', { tabId });
    },
    detachToNewWindow: async (data) => {
      try {
        assertObject(data, 'data');
        return await ipcRenderer.invoke('detach-tab-to-new-window', data);
      } catch (err) {
        console.error('[Worldcraft] detach-tab-to-new-window fehlgeschlagen:', err);
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    dragStart: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:start', data || {});
      } catch (err) {
        console.error('[Worldcraft] tab-drag:start fehlgeschlagen:', err);
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    dragMove: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:move', data || {});
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    dragEnd: async () => {
      try {
        return await ipcRenderer.invoke('tab-drag:end');
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    tabDragStart: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:start', data || {});
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    tabDragMove: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:move', data || {});
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    tabDragEnd: async () => {
      try {
        return await ipcRenderer.invoke('tab-drag:end');
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    }
  },
  tabDrag: {
    start: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:start', data || {});
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    move: async (data) => {
      try {
        if (data) assertObject(data, 'data');
        return await ipcRenderer.invoke('tab-drag:move', data || {});
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    },
    end: async () => {
      try {
        return await ipcRenderer.invoke('tab-drag:end');
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    }
  },

  view: {
    setTranslateBanner: async (visible) => {
      return await ipcRenderer.invoke('view:set-translate-banner', { visible: Boolean(visible) });
    }
  },

  apps: {
    detach: async (url) => {
      assertString(url, 'url', 8192);
      return await ipcRenderer.invoke('apps:detach', { url });
    },
    newWindow: async (url = '') => {
      try {
        if (url) assertString(url, 'url', 8192);
        return await ipcRenderer.invoke('app:new-window', { url });
      } catch (err) {
        console.error('[Worldcraft] app:new-window fehlgeschlagen:', err);
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    }
  },

  ai: {
    chat: async (message, context = null) => {
      assertString(message, 'message', 32768);
      if (context) assertObject(context, 'context');
      return await ipcRenderer.invoke('ai:chat', { message, context });
    },
    summarizeCurrentPage: async () => {
      return await ipcRenderer.invoke('ai:summarize-current-page');
    },
    getStatus: async () => {
      return await ipcRenderer.invoke('ai:get-status');
    },
    setApiKey: async (key, provider = 'google') => {
      assertString(key, 'key', 2048);
      assertString(provider, 'provider', 64);
      return await ipcRenderer.invoke('ai:set-provider-key', { provider, key });
    },
    clearApiKey: async (provider = 'google') => {
      assertString(provider, 'provider', 64);
      return await ipcRenderer.invoke('ai:clear-provider-key', { provider });
    },
    setProviderKey: async (provider, key) => {
      assertString(provider, 'provider', 64);
      assertString(key, 'key', 2048);
      return await ipcRenderer.invoke('ai:set-provider-key', { provider, key });
    },
    clearProviderKey: async (provider) => {
      assertString(provider, 'provider', 64);
      return await ipcRenderer.invoke('ai:clear-provider-key', { provider });
    },
    getProviders: async () => {
      return await ipcRenderer.invoke('ai:get-providers');
    },
    testKey: async (options = {}) => {
      assertObject(options, 'options');
      return await ipcRenderer.invoke('ai:test-key', options);
    }
  },

  forge: {
    generate: async (options) => {
      assertObject(options, 'options');
      assertString(options.prompt, 'prompt', 32768);
      if (options.name) assertString(options.name, 'name', 128);
      return await ipcRenderer.invoke('forge:generate', options);
    },
    list: async () => {
      return await ipcRenderer.invoke('forge:list');
    },
    delete: async (name) => {
      assertString(name, 'name', 128);
      return await ipcRenderer.invoke('forge:delete', { name });
    },
    get: async (name) => {
      assertString(name, 'name', 128);
      return await ipcRenderer.invoke('forge:get', { name });
    }
  },

  settings: {
    get: async () => {
      return await ipcRenderer.invoke('settings:get');
    },
    save: async (settings) => {
      assertObject(settings, 'settings');
      return await ipcRenderer.invoke('settings:save', settings);
    },
    saveCustomBackground: async (options) => {
      assertObject(options, 'options');
      assertString(options.dataUrl, 'dataUrl', 25000000);
      return await ipcRenderer.invoke('settings:save-custom-background', options);
    }
  },

  favorites: {
    list: async () => {
      return await ipcRenderer.invoke('favorites:list');
    },
    add: async (favorite) => {
      assertObject(favorite, 'favorite');
      return await ipcRenderer.invoke('favorites:add', favorite);
    },
    remove: async (favoriteId) => {
      assertString(favoriteId, 'favoriteId', 128);
      return await ipcRenderer.invoke('favorites:remove', { favoriteId });
    },
    update: async (favoriteId, partial) => {
      assertString(favoriteId, 'favoriteId', 128);
      assertObject(partial, 'partial');
      return await ipcRenderer.invoke('favorites:update', { favoriteId, partial });
    }
  },

  radio: {
    getStations: async () => {
      return await ipcRenderer.invoke('radio:get-stations');
    }
  },

  downloads: {
    list: async () => {
      return await ipcRenderer.invoke('downloads:list');
    },
    open: async (downloadId) => {
      assertString(downloadId, 'downloadId', 128);
      return await ipcRenderer.invoke('downloads:open', { downloadId });
    },
    showInFolder: async (downloadId) => {
      assertString(downloadId, 'downloadId', 128);
      return await ipcRenderer.invoke('downloads:show-in-folder', { downloadId });
    },
    cancel: async (downloadId) => {
      assertString(downloadId, 'downloadId', 128);
      return await ipcRenderer.invoke('downloads:cancel', { downloadId });
    },
    removeHistoryEntry: async (downloadId) => {
      assertString(downloadId, 'downloadId', 128);
      return await ipcRenderer.invoke('downloads:remove-history-entry', { downloadId });
    },
    clearCompleted: async () => {
      return await ipcRenderer.invoke('downloads:clear-completed');
    }
  },

  updater: {
    check: async () => {
      return await ipcRenderer.invoke('updater:check');
    },
    download: async () => {
      return await ipcRenderer.invoke('updater:download');
    },
    install: async () => {
      return await ipcRenderer.invoke('updater:install');
    },
    getState: async () => {
      return await ipcRenderer.invoke('updater:get-state');
    },
    getVersion: async () => {
      return await ipcRenderer.invoke('app:get-version');
    }
  },

  events: {
    onTabsUpdated: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tabs:updated', listener);
      return () => {
        ipcRenderer.removeListener('tabs:updated', listener);
      };
    },
    onNavigationStateChanged: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tabs:nav-state', listener);
      return () => {
        ipcRenderer.removeListener('tabs:nav-state', listener);
      };
    },
    onActivePageChanged: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('tabs:active-changed', listener);
      return () => {
        ipcRenderer.removeListener('tabs:active-changed', listener);
      };
    },
    onAiStatus: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('ai:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('ai:status-changed', listener);
      };
    },
    onSettingsUpdated: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('settings:updated', listener);
      return () => {
        ipcRenderer.removeListener('settings:updated', listener);
      };
    },
    onDownloadsUpdated: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('downloads:updated', listener);
      return () => {
        ipcRenderer.removeListener('downloads:updated', listener);
      };
    },
    onDownloadDone: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('downloads:done', listener);
      return () => {
        ipcRenderer.removeListener('downloads:done', listener);
      };
    },
    onUpdateStatus: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('updater:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('updater:status-changed', listener);
      };
    },
    onRadioOpenModal: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = () => callback();
      ipcRenderer.on('radio:open-modal', listener);
      return () => {
        ipcRenderer.removeListener('radio:open-modal', listener);
      };
    },
    onPageLanguageDetected: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('page:language-detected', listener);
      return () => {
        ipcRenderer.removeListener('page:language-detected', listener);
      };
    },
    onViewFocused: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, data) => callback(data);
      ipcRenderer.on('view:focused', listener);
      return () => {
        ipcRenderer.removeListener('view:focused', listener);
      };
    },
    onToggleBrowserUi: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = (event, visible) => callback(visible);
      ipcRenderer.on('toggle-browser-ui', listener);
      return () => {
        ipcRenderer.removeListener('toggle-browser-ui', listener);
      };
    },
    onFocusUrlInput: (callback) => {
      if (typeof callback !== 'function') throw new TypeError('Callback must be a function');
      const listener = () => callback();
      ipcRenderer.on('focus-url-input', listener);
      return () => {
        ipcRenderer.removeListener('focus-url-input', listener);
      };
    }
  }
};

contextBridge.exposeInMainWorld('worldcraft', worldcraftBridge);
