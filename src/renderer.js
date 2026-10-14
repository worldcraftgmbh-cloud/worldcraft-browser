'use strict';

const FEEDBACK_URL = 'https://form.jotform.com/262835970270058';

// --- DOM ELEMENTS ---
const tabsList = document.getElementById('tabs-list');
const btnNewTab = document.getElementById('btn-new-tab');
const btnNavBack = document.getElementById('btn-nav-back');
const btnNavForward = document.getElementById('btn-nav-forward');
const btnNavReload = document.getElementById('btn-nav-reload');
const urlInput = document.getElementById('url-input');
const btnUrlGo = document.getElementById('btn-url-go');
const btnNavDetach = document.getElementById('btn-nav-detach');
const btnNavAi = document.getElementById('btn-nav-ai');
const btnNavSettings = document.getElementById('btn-nav-settings');
const btnNavDownloads = document.getElementById('btn-nav-downloads');
const btnNavFeedback = document.getElementById('btn-nav-feedback');
const downloadBadge = document.getElementById('download-badge');
const downloadRingProgress = document.getElementById('download-ring-progress');
const downloadsDropdown = document.getElementById('downloads-dropdown');
const downloadsListItems = document.getElementById('downloads-list-items');
const btnClearDownloads = document.getElementById('btn-clear-downloads');

const viewportContainer = document.getElementById('viewport-container');
const homescreen = document.getElementById('homescreen');
const homeSearchForm = document.getElementById('home-search-form');
const homeSearchInput = document.getElementById('home-search-input');
const homeClock = document.getElementById('home-clock');
const homeDate = document.getElementById('home-date');
const speedDialGrid = document.getElementById('speed-dial-grid');
const btnAddSpeedDial = document.getElementById('btn-add-speed-dial');

// OBS Forge HUD Elements
const forgeHud = document.getElementById('forge-hud');
const forgeWidgetName = document.getElementById('forge-widget-name');
const forgePromptInput = document.getElementById('forge-prompt-input');
const btnForgeSynthesize = document.getElementById('btn-forge-synthesize');
const forgeTerminalLog = document.getElementById('forge-terminal-log');
const forgeWidgetsList = document.getElementById('forge-widgets-list');
const btnRefreshWidgets = document.getElementById('btn-refresh-widgets');
const forgeOutputUrl = document.getElementById('forge-output-url');
const btnCopyObsUrl = document.getElementById('btn-copy-obs-url');
const forgePreviewFrame = document.getElementById('forge-preview-frame');
const btnReloadPreview = document.getElementById('btn-reload-preview');
const btnOpenPreviewTab = document.getElementById('btn-open-preview-tab');
const forgeWidgetStatusBadge = document.getElementById('forge-widget-status-badge');

const fabAiToggle = document.getElementById('fab-ai-toggle');
const aiPanel = document.getElementById('ai-panel');
const btnAiClose = document.getElementById('btn-ai-close');
const btnAiSummarize = document.getElementById('btn-ai-summarize');
const btnAiClear = document.getElementById('btn-ai-clear');
const aiMessagesList = document.getElementById('ai-messages-list');
const aiLoadingBox = document.getElementById('ai-loading-box');
const aiInputText = document.getElementById('ai-input-text');
const btnAiSend = document.getElementById('btn-ai-send');
const aiStatusIndicator = document.getElementById('ai-status-indicator');

// Audio / Radio
const audioPlayer = document.getElementById('audio-player');
const btnRadioPlay = document.getElementById('btn-radio-play');
const radioVolumeSlider = document.getElementById('radio-volume-slider');
const radioActiveName = document.getElementById('radio-active-name');
const radioActiveGenre = document.getElementById('radio-active-genre');
const radioStationsList = document.getElementById('radio-stations-list');
const radioPlayerBar = document.getElementById('radio-player-bar');

// Sidebar buttons
const sideBtnHome = document.getElementById('side-btn-home');
const sideBtnFavorites = document.getElementById('side-btn-favorites');
const sideBtnRadio = document.getElementById('side-btn-radio');
const sideBtnDownloads = document.getElementById('side-btn-downloads');
const sideBtnForge = document.getElementById('side-btn-forge');
const sideBtnSettings = document.getElementById('side-btn-settings');
const sideBtnFeedback = document.getElementById('side-btn-feedback');
const sideBtnAi = document.getElementById('side-btn-ai');

// Modals & Internal HUDs
const modalRadio = document.getElementById('modal-radio');
const settingsHud = document.getElementById('settings-hud');
const modalSettings = document.getElementById('modal-settings') || settingsHud;
const btnSettingsHudFeedback = document.getElementById('btn-settings-hud-feedback');
const downloadsHud = document.getElementById('downloads-hud');
const downloadsHudItems = document.getElementById('downloads-hud-items');
const btnHudClearDownloads = document.getElementById('btn-hud-clear-downloads');
const hudStatTotal = document.getElementById('hud-stat-total');
const hudStatActive = document.getElementById('hud-stat-active');
const hudStatCompleted = document.getElementById('hud-stat-completed');
const modalFavorites = document.getElementById('modal-favorites');
const modalDownloads = document.getElementById('modal-downloads') || downloadsHud;

// Auto-Update HUD
const updateHud = document.getElementById('update-hud');
const updateHudText = document.getElementById('update-hud-text');
const updateHudProgress = document.getElementById('update-hud-progress');
const updateHudProgressFill = document.getElementById('update-hud-progress-fill');
const btnUpdateRestart = document.getElementById('btn-update-restart');
const btnUpdateDismiss = document.getElementById('btn-update-dismiss');

// Cyberpunk Web Page Translate Banner Elements
const translateBanner = document.getElementById('translate-banner');
const translateBannerText = document.getElementById('translate-banner-text');
const btnTranslateConfirm = document.getElementById('btn-translate-confirm');
const btnTranslateOriginal = document.getElementById('btn-translate-original');
const btnTranslateDismiss = document.getElementById('btn-translate-dismiss');
const btnTranslateClose = document.getElementById('btn-translate-close');

// Settings Inputs & Controls
const settingGeminiKey = document.getElementById('setting-gemini-key');
const btnSaveApiKey = document.getElementById('btn-save-api-key');
const btnClearApiKey = document.getElementById('btn-clear-api-key');
const settingNeuralKey = document.getElementById('setting-neural-key');
const btnSaveNeuralKey = document.getElementById('btn-save-neural-key');
const btnClearNeuralKey = document.getElementById('btn-clear-neural-key');
const neuralKeyLabel = document.getElementById('neural-key-label');
const neuralKeyHelpLink = document.getElementById('neural-key-help-link');
const neuralModelIdFast = document.getElementById('neural-model-id-fast');
const neuralModelIdPro = document.getElementById('neural-model-id-pro');
const settingMatrixRain = document.getElementById('setting-matrix-rain');
const settingForceDark = document.getElementById('setting-force-dark');
const settingBackgroundRadio = document.getElementById('setting-background-radio');
const settingAiStartup = document.getElementById('setting-ai-startup');
const settingNotifyUpdates = document.getElementById('setting-notify-updates');
const settingAnimatedDownloads = document.getElementById('setting-animated-downloads');
const btnSaveSettings = document.getElementById('btn-save-settings');

// Favorites inputs
const favNewTitle = document.getElementById('fav-new-title');
const favNewUrl = document.getElementById('fav-new-url');
const btnAddFavoriteSubmit = document.getElementById('btn-add-favorite-submit');
const favoritesFullList = document.getElementById('favorites-full-list');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Multi-Provider Meta Registry
const PROVIDER_META = {
  google: {
    name: 'Google (Gemini)',
    label: 'NEURAL-LINK KEY // API (GOOGLE GEMINI):',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpText: '[ GET FREE GEMINI API KEY ]',
    placeholder: 'AIzaSy... API-Key hier einfügen',
    fastModel: 'gemini-3.8-flash',
    proModel: 'gemini-2.5-pro'
  },
  openai: {
    name: 'OpenAI (ChatGPT)',
    label: 'NEURAL-LINK KEY // API (OPENAI):',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: '[ GET OPENAI API KEY ]',
    placeholder: 'sk-... API-Key hier einfügen',
    fastModel: 'gpt-4o-mini',
    proModel: 'gpt-4o'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    label: 'NEURAL-LINK KEY // API (ANTHROPIC):',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: '[ GET ANTHROPIC API KEY ]',
    placeholder: 'sk-ant-... API-Key hier einfügen',
    fastModel: 'claude-3-5-haiku-latest',
    proModel: 'claude-3-5-sonnet-latest'
  },
  ollama: {
    name: 'Local (Ollama)',
    label: 'NEURAL-LINK ENDPOINT // OLLAMA HOST:',
    helpUrl: 'https://ollama.com',
    helpText: '[ DOWNLOAD OLLAMA (FREE & LOCAL) ]',
    placeholder: 'http://localhost:11434 (Standard)',
    fastModel: 'llama3.2',
    proModel: 'llama3.1:70b'
  }
};

// State
let currentTabs = [];
let activeTabId = null;
let chatHistory = [];
let radioStations = [];
let activeStation = null;
let currentDownloads = [];
let tabTranslationState = {}; // tabId -> { isTranslated: boolean, detectedLang: string }
let currentSettings = {
  language: 'de',
  searchEngine: 'google',
  customBackgroundMode: 'default',
  customBackgroundUrl: '',
  customBackgroundLocal: '',
  aiProvider: 'google',
  aiModel: 'gemini-3.8-flash',
  geminiModel: 'gemini-3.8-flash',
  neuralCoreTier: 'fast',
  matrixRain: true,
  forceDark: true,
  backgroundRadio: true,
  aiOnStartup: false,
  notifyUpdates: true,
  animatedDownloads: true
};

/**
 * Localization (i18n) & Webpage Translation Helpers
 */
function t(key, params = {}) {
  const lang = currentSettings.language || 'de';
  const dict = (window.WORLDCRAFT_LOCALES && window.WORLDCRAFT_LOCALES[lang]) || (window.WORLDCRAFT_LOCALES && window.WORLDCRAFT_LOCALES['de']) || {};
  let text = dict[key] || (window.WORLDCRAFT_LOCALES && window.WORLDCRAFT_LOCALES['de'] && window.WORLDCRAFT_LOCALES['de'][key]) || key;
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return text;
}

function updateLanguageUI(lang) {
  if (!lang) lang = 'de';
  currentSettings.language = lang;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
      el.setAttribute('aria-label', t(key));
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  document.querySelectorAll('.lang-flag-tile').forEach((tile) => {
    tile.classList.toggle('active', tile.getAttribute('data-lang') === lang);
  });

  if (urlInput) {
    const currentTab = currentTabs.find((t) => t.id === activeTabId);
    if (!currentTab || currentTab.isHome) {
      urlInput.placeholder = t('home_search_placeholder') || 'Adresse eingeben oder im Matrix-Netz suchen...';
    } else if (currentTab.isForge) {
      urlInput.placeholder = 'worldcraft://dev-forge';
    } else {
      urlInput.placeholder = t('url_placeholder') || 'URL eingeben oder Web durchsuchen...';
    }
  }

  if (homeSearchInput) {
    homeSearchInput.placeholder = t('home_search_placeholder') || 'Matrix-Suche: Begriff eingeben oder URL ansteuern...';
  }

  if (translateBanner && !translateBanner.classList.contains('hidden')) {
    const tabState = tabTranslationState[activeTabId];
    if (tabState && tabState.detectedLang) {
      const langMeta = window.WORLDCRAFT_LANGUAGES && window.WORLDCRAFT_LANGUAGES[tabState.detectedLang];
      const langName = langMeta ? langMeta.name : tabState.detectedLang.toUpperCase();
      if (translateBannerText) {
        translateBannerText.textContent = t('translate_banner_ask', { lang: langName });
      }
    }
  }

  document.title = t('app_title');
}

function showTranslateBanner(pageLang) {
  if (!translateBanner) return;
  const langMeta = window.WORLDCRAFT_LANGUAGES && window.WORLDCRAFT_LANGUAGES[pageLang];
  const langName = langMeta ? langMeta.name : pageLang.toUpperCase();

  if (translateBannerText) {
    translateBannerText.textContent = t('translate_banner_ask', { lang: langName });
  }

  const isTranslated = Boolean(tabTranslationState[activeTabId]?.isTranslated);
  if (btnTranslateConfirm) btnTranslateConfirm.classList.toggle('hidden', isTranslated);
  if (btnTranslateOriginal) btnTranslateOriginal.classList.toggle('hidden', !isTranslated);

  translateBanner.classList.remove('hidden');
  if (window.worldcraft && window.worldcraft.view && window.worldcraft.view.setTranslateBanner) {
    window.worldcraft.view.setTranslateBanner(true);
  }
}

function hideTranslateBanner() {
  if (!translateBanner) return;
  translateBanner.classList.add('hidden');
  if (window.worldcraft && window.worldcraft.view && window.worldcraft.view.setTranslateBanner) {
    window.worldcraft.view.setTranslateBanner(false);
  }
}

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Bounds Synchronizer: Notifies Electron of the exact content container rect
 */
function syncViewportBounds() {
  if (!window.worldcraft || !window.worldcraft.tabs) return;
  const rect = viewportContainer.getBoundingClientRect();
  window.worldcraft.tabs.setBounds({
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });
}

/**
 * Settings Tab Navigation (Option A: Internal Tab worldcraft://settings)
 */
async function openSettingsTab() {
  closeAllModals();
  const existing = currentTabs.find((t) => t.isSettings || t.url === 'worldcraft://settings');
  if (existing) {
    await window.worldcraft.tabs.activate(existing.id);
  } else {
    const current = currentTabs.find((t) => t.id === activeTabId);
    if (current && current.isHome && !current.isForge) {
      await window.worldcraft.tabs.navigate(activeTabId, 'worldcraft://settings');
    } else {
      await window.worldcraft.tabs.create('worldcraft://settings');
    }
  }
}

/**
 * Downloads Tab Navigation (Singleton: switches to existing or opens internal://downloads)
 */
async function openDownloadsTab() {
  closeAllModals();
  const existing = currentTabs.find((t) => t.isDownloads || t.url === 'internal://downloads' || t.url === 'worldcraft://downloads');
  if (existing) {
    await window.worldcraft.tabs.activate(existing.id);
  } else {
    const current = currentTabs.find((t) => t.id === activeTabId);
    if (current && current.isHome && !current.isForge && !current.isSettings && !current.isDownloads) {
      await window.worldcraft.tabs.navigate(activeTabId, 'internal://downloads');
    } else {
      await window.worldcraft.tabs.create('internal://downloads');
    }
  }
}

/**
 * Downloads Dropdown Bounds & Visibility Management
 */
function handleDownloadsDropdownState(isOpen) {
  if (isOpen) {
    document.body.classList.add('downloads-dropdown-open');
    if (window.innerWidth < 950 && window.worldcraft && window.worldcraft.tabs) {
      window.worldcraft.tabs.setViewVisible(false);
    }
    syncViewportBounds();
  } else {
    document.body.classList.remove('downloads-dropdown-open');
    if (window.worldcraft && window.worldcraft.tabs) {
      window.worldcraft.tabs.setViewVisible(true);
      window.worldcraft.tabs.focus();
    }
    syncViewportBounds();
  }
}

/**
 * Modal Handling (Option B: Temporary WebContentsView Hiding & Focus Restoration)
 */
function openModal(modal) {
  if (!modal) return;
  if (modal === modalSettings || modal === settingsHud) {
    openSettingsTab();
    return;
  }
  if (modal === modalDownloads || modal === downloadsHud) {
    openDownloadsTab();
    return;
  }
  modal.classList.add('open');
  if (window.worldcraft && window.worldcraft.tabs) {
    window.worldcraft.tabs.setViewVisible(false);
  }
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('open');
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  const anyOpen = document.querySelector('.modal-overlay.open');
  if (!anyOpen && window.worldcraft && window.worldcraft.tabs) {
    window.worldcraft.tabs.setViewVisible(true);
    window.worldcraft.tabs.focus();
    syncViewportBounds();
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
  if (downloadsDropdown && downloadsDropdown.classList.contains('open')) {
    downloadsDropdown.classList.remove('open');
    handleDownloadsDropdownState(false);
  }
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  if (window.worldcraft && window.worldcraft.tabs) {
    window.worldcraft.tabs.setViewVisible(true);
    window.worldcraft.tabs.focus();
  }
  syncViewportBounds();
}

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-close-modal');
    closeModal(document.getElementById(targetId));
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllModals();
    if (!aiPanel.classList.contains('collapsed')) {
      toggleAiPanel(false);
    }
  }

  // Browserweite Shortcuts (Strg+N, Strg+T, Strg+W, F11, ...) werden ausschließlich im Main-Prozess
  // über handleBrowserInputEvent (before-input-event) verarbeitet.
});

// Tab Drag-out / Tear-off State (Pointer Capture & Mouse Events)
let tabDragCandidate = null;
let tabDragElement = null;
let isTabDragging = false;
let tabDragStartX = 0;
let tabDragStartY = 0;
let tabDragPointerId = null;
let tabDragStartedAt = 0;
let tabDragOffsetX = 30;
let tabDragOffsetY = 18;
let pendingTabState = null; // Tab-Leisten-Render, der während eines Drags zurückgestellt wurde
let wasTabDetachedJustNow = false;

function handleTabDragMove(e) {
  if (!tabDragCandidate) return;

  // Prüfe, ob der primäre Pointer weiterhin aktiv ist (Maus: linke Taste gedrückt; Touch/Pen: aktiv)
  if (!(e.isPrimary && (e.pointerType === 'mouse' ? (e.buttons & 1) === 1 : true))) {
    cancelTabDrag();
    return;
  }

  const deltaX = Math.abs(e.clientX - tabDragStartX);
  const deltaY = Math.abs(e.clientY - tabDragStartY);

  const tabBarEl = document.getElementById('tab-bar');
  const rect = tabBarEl ? tabBarEl.getBoundingClientRect() : { top: 0, bottom: 40, left: 0, right: window.innerWidth };

  // Bei Ziehen mit gedrückter Maustaste:
  // Prüfe, ob der Cursor den Fensterrand verlässt oder ein Schwellenwert nach unten/außen überschritten wird.
  const isThresholdExceeded = deltaY > 20 || deltaX > 30;
  const isOutsideTabArea = (
    e.clientY < rect.top - 5 ||
    e.clientY > rect.bottom + 15 ||
    e.clientX < rect.left - 10 ||
    e.clientX > rect.right + 10 ||
    e.clientY <= 0 ||
    e.clientY >= window.innerHeight ||
    e.clientX <= 0 ||
    e.clientX >= window.innerWidth
  );

  if (isThresholdExceeded || isOutsideTabArea) {
    const wasAlreadyDragging = isTabDragging;
    isTabDragging = true;
    document.body.classList.add('tab-dragging-active');
    const activeEl = tabDragElement || document.querySelector(`.tab-item[data-tab-id="${tabDragCandidate.id}"]`);
    if (activeEl) {
      activeEl.classList.add('tab-dragging');
    }

    const screenX = typeof e.screenX === 'number' && e.screenX > 0 ? e.screenX : (window.screenX + e.clientX);
    const screenY = typeof e.screenY === 'number' && e.screenY > 0 ? e.screenY : (window.screenY + e.clientY);

    const tabsApi = window.worldcraft && window.worldcraft.tabs;
    if (tabsApi) {
      if (!wasAlreadyDragging && typeof tabsApi.dragStart === 'function') {
        tabsApi.dragStart({
          title: tabDragCandidate.title || (tabDragCandidate.isHome ? t('tab_home') : t('tab_new')),
          favicon: tabDragCandidate.favicon,
          screenX,
          screenY,
          offsetX: tabDragOffsetX,
          offsetY: tabDragOffsetY
        }).catch(() => {});
      } else if (typeof tabsApi.dragMove === 'function') {
        tabsApi.dragMove({
          screenX,
          screenY,
          offsetX: tabDragOffsetX,
          offsetY: tabDragOffsetY
        }).catch(() => {});
      }
    }
  }
}

async function handleTabDragEnd(e) {
  if (!tabDragCandidate) return;

  const candidate = tabDragCandidate;
  const wasDragging = isTabDragging;

  if (window.worldcraft && window.worldcraft.tabs && typeof window.worldcraft.tabs.dragEnd === 'function') {
    window.worldcraft.tabs.dragEnd().catch(() => {});
  }

  cancelTabDrag();

  // Nur ein echter Drag kann einen Tear-off auslösen
  if (!wasDragging) return;

  wasTabDetachedJustNow = true;
  setTimeout(() => { wasTabDetachedJustNow = false; }, 300);

  // Wenn die Maustaste losgelassen wird und der Cursor außerhalb der Tab-Leiste / des Fensters ist
  const tabBarEl = document.getElementById('tab-bar');
  const rect = tabBarEl ? tabBarEl.getBoundingClientRect() : { top: 0, bottom: 40, left: 0, right: window.innerWidth };

  const isOutside = (
    e.clientY < rect.top ||
    e.clientY > rect.bottom + 15 ||
    e.clientX < rect.left - 10 ||
    e.clientX > rect.right + 10 ||
    e.clientY <= 0 ||
    e.clientY >= window.innerHeight ||
    e.clientX <= 0 ||
    e.clientX >= window.innerWidth
  );
  if (!isOutside) return;

  const screenX = typeof e.screenX === 'number' && e.screenX > 0 ? e.screenX : (window.screenX + e.clientX);
  const screenY = typeof e.screenY === 'number' && e.screenY > 0 ? e.screenY : (window.screenY + e.clientY);

  const tabsApi = window.worldcraft && window.worldcraft.tabs;
  if (!tabsApi || typeof tabsApi.detachToNewWindow !== 'function') {
    console.error('[Worldcraft] Tab-Detach nicht möglich: window.worldcraft.tabs.detachToNewWindow fehlt.');
    return;
  }

  // 1. Neues Fenster erzeugen – Ursprungstab bleibt unangetastet, bis dies erfolgreich war
  try {
    const result = await tabsApi.detachToNewWindow({ url: candidate.url, x: screenX, y: screenY });
    if (!result || result.ok !== true) {
      throw new Error((result && result.error) || 'detachToNewWindow lieferte kein ok:true');
    }
  } catch (err) {
    console.error('[Worldcraft] Tab-Detach fehlgeschlagen, Tab bleibt im Ursprungsfenster:', err);
    return;
  }

  // 2. Erst jetzt den Tab im Ursprungsfenster schließen
  try {
    if (typeof tabsApi.close === 'function') {
      await tabsApi.close(candidate.id);
    }
  } catch (err) {
    console.error('[Worldcraft] Ursprungstab konnte nach dem Detach nicht geschlossen werden:', err);
  }
}

function cancelTabDrag() {
  document.body.classList.remove('tab-dragging-active');
  document.querySelectorAll('.tab-item.tab-dragging').forEach((el) => el.classList.remove('tab-dragging'));
  if (tabDragElement && tabDragPointerId !== null) {
    try {
      if (typeof tabDragElement.hasPointerCapture === 'function' && tabDragElement.hasPointerCapture(tabDragPointerId)) {
        tabDragElement.releasePointerCapture(tabDragPointerId);
      }
    } catch (err) {}
  }

  if (window.worldcraft && window.worldcraft.tabs && typeof window.worldcraft.tabs.dragEnd === 'function') {
    window.worldcraft.tabs.dragEnd().catch(() => {});
  }

  tabDragCandidate = null;
  tabDragElement = null;
  isTabDragging = false;
  tabDragPointerId = null;
  tabDragOffsetX = 30;
  tabDragOffsetY = 18;

  if (pendingTabState) {
    const stateToRender = pendingTabState;
    pendingTabState = null;
    renderTabs(stateToRender);
  }
}

// Globale Pointer-Listener (Pointer Capture sorgt für Events auch außerhalb des Fensters)
window.addEventListener('pointermove', handleTabDragMove);
window.addEventListener('pointerup', handleTabDragEnd);
window.addEventListener('pointercancel', cancelTabDrag);

// blur / visibilitychange dürfen einen AKTIVEN Drag nicht verwerfen: Verlässt der Cursor das Fenster
// oder wechselt der Fokus, muss das nachfolgende pointerup den Tear-off noch auslösen können.
// Ein hängengebliebener Drag wird über handleTabDragMove (Maustaste nicht mehr gedrückt) bzw.
// den nächsten pointerdown zurückgesetzt.
function cancelTabDragIfNotActive() {
  if (!isTabDragging) cancelTabDrag();
}
window.addEventListener('blur', cancelTabDragIfNotActive);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelTabDragIfNotActive();
});

// Close downloads dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (downloadsDropdown && downloadsDropdown.classList.contains('open')) {
    if (!downloadsDropdown.contains(e.target) &&
        !btnNavDownloads.contains(e.target) &&
        !(sideBtnDownloads && sideBtnDownloads.contains(e.target))) {
      downloadsDropdown.classList.remove('open');
      handleDownloadsDropdownState(false);
    }
  }
});

// Canvas Matrix-Regen Animation wurde durch statischen Cyberpunk-Bildhintergrund (src/assets/cyberpunk-bg.png) ersetzt.

/**
 * Tab Bar Rendering
 */
function renderTabs(tabState) {
  if (!tabState) return;

  // Während eines laufenden Tab-Drags die DOM-Elemente nicht neu aufbauen (Pointer Capture hängt am Element).
  // Sicherheitsnetz: nach 10s wird trotzdem gerendert, falls ein Drag nie beendet wurde.
  if (tabDragCandidate && Date.now() - tabDragStartedAt < 10000) {
    pendingTabState = tabState;
    return;
  }
  pendingTabState = null;

  currentTabs = tabState.tabs || [];
  activeTabId = tabState.activeTabId;

  tabsList.innerHTML = '';

  for (const tab of currentTabs) {
    const tabEl = document.createElement('div');
    tabEl.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
    tabEl.title = tab.title || (tab.isHome ? t('tab_home') : t('tab_new'));

    // Favicon or Spinner
    const faviconWrap = document.createElement('span');
    faviconWrap.className = 'tab-favicon';
    if (tab.isLoading) {
      faviconWrap.innerHTML = '<div class="tab-spinner"></div>';
    } else if (tab.isSettings || tab.url === 'worldcraft://settings') {
      faviconWrap.innerHTML = '<span style="font-size:12px; line-height:1;">⚙</span>';
    } else if (tab.isDownloads || tab.url === 'internal://downloads' || tab.url === 'worldcraft://downloads') {
      faviconWrap.innerHTML = '<span style="font-size:12px; line-height:1;">⬇</span>';
    } else if (tab.isForge || tab.url === 'worldcraft://dev-forge') {
      faviconWrap.innerHTML = '<span style="font-size:12px; line-height:1;">⚡</span>';
    } else if (tab.favicon) {
      const img = document.createElement('img');
      img.src = tab.favicon;
      img.style.width = '14px';
      img.style.height = '14px';
      img.onerror = () => { img.style.display = 'none'; };
      faviconWrap.appendChild(img);
    } else {
      faviconWrap.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>';
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    let tabDisplayTitle = tab.title;
    if (tab.isSettings || tab.url === 'worldcraft://settings') {
      tabDisplayTitle = t('settings_title') || 'Einstellungen';
    } else if (tab.isDownloads || tab.url === 'internal://downloads' || tab.url === 'worldcraft://downloads') {
      tabDisplayTitle = t('downloads_title_tab') || 'Downloads';
    } else if (!tabDisplayTitle) {
      tabDisplayTitle = tab.isHome ? t('tab_home') : t('tab_new');
    }
    titleEl.textContent = tabDisplayTitle;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.title = t('tab_close');
    closeBtn.setAttribute('aria-label', t('tab_close'));
    closeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.worldcraft.tabs.close(tab.id);
    });

    tabEl.appendChild(faviconWrap);
    tabEl.appendChild(titleEl);
    tabEl.appendChild(closeBtn);

    tabEl.setAttribute('data-tab-id', tab.id);

    // Tab Drag-out Logik (Tab abreißen / Tear-off via Pointer Events & Pointer Capture)
    tabEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // nur linke Maustaste
      if (e.target.closest('.tab-close')) return; // Klick auf Schließen-Button ignorieren
      tabDragCandidate = tab;
      tabDragElement = tabEl;
      isTabDragging = false;
      tabDragStartX = e.clientX;
      tabDragStartY = e.clientY;
      try {
        const tabRect = tabEl.getBoundingClientRect();
        tabDragOffsetX = Math.max(10, Math.min(200, Math.round(e.clientX - tabRect.left)));
        tabDragOffsetY = Math.max(5, Math.min(30, Math.round(e.clientY - tabRect.top)));
      } catch (rectErr) {
        tabDragOffsetX = 30;
        tabDragOffsetY = 18;
      }
      tabDragPointerId = e.pointerId;
      tabDragStartedAt = Date.now();
      try {
        if (typeof tabEl.setPointerCapture === 'function') {
          tabEl.setPointerCapture(e.pointerId);
        }
      } catch (err) {
        console.warn('[Worldcraft] setPointerCapture fehlgeschlagen:', err);
      }
    });

    tabEl.addEventListener('pointermove', (e) => {
      if (!tabDragCandidate || tabDragCandidate.id !== tab.id) return;
      handleTabDragMove(e);
    });

    tabEl.addEventListener('pointerup', async (e) => {
      if (!tabDragCandidate || tabDragCandidate.id !== tab.id) return;
      try {
        if (typeof tabEl.hasPointerCapture === 'function' && tabEl.hasPointerCapture(e.pointerId)) {
          tabEl.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
      await handleTabDragEnd(e);
    });

    tabEl.addEventListener('pointercancel', (e) => {
      if (!tabDragCandidate || tabDragCandidate.id !== tab.id) return;
      cancelTabDrag();
    });

    tabEl.addEventListener('click', async (e) => {
      if (wasTabDetachedJustNow) {
        wasTabDetachedJustNow = false;
        e.stopPropagation();
        return;
      }
      if (tab.id !== activeTabId) {
        await window.worldcraft.tabs.activate(tab.id);
      }
    });

    tabsList.appendChild(tabEl);
  }

  // Inline '+' button directly adjacent to the last opened tab
  if (btnNewTab) {
    tabsList.appendChild(btnNewTab);
  }

  const currentTab = currentTabs.find((t) => t.id === activeTabId);
  if (currentTab) {
    btnNavBack.disabled = !currentTab.canGoBack;
    btnNavForward.disabled = !currentTab.canGoForward;

    if (currentTab.isForge || currentTab.url === 'worldcraft://dev-forge') {
      urlInput.value = 'worldcraft://dev-forge';
      urlInput.placeholder = 'worldcraft://dev-forge';
      homescreen.style.display = 'none';
      if (settingsHud) settingsHud.classList.add('hidden');
      if (downloadsHud) downloadsHud.classList.add('hidden');
      if (forgeHud) forgeHud.classList.remove('hidden');
      sideBtnHome.classList.remove('active');
      if (sideBtnSettings) sideBtnSettings.classList.remove('active');
      if (sideBtnDownloads) sideBtnDownloads.classList.remove('active');
      if (sideBtnForge) sideBtnForge.classList.add('active');
      loadForgeWidgets();
      hideTranslateBanner();
    } else if (currentTab.isSettings || currentTab.url === 'worldcraft://settings') {
      urlInput.value = 'worldcraft://settings';
      urlInput.placeholder = 'worldcraft://settings';
      homescreen.style.display = 'none';
      if (forgeHud) forgeHud.classList.add('hidden');
      if (downloadsHud) downloadsHud.classList.add('hidden');
      if (settingsHud) settingsHud.classList.remove('hidden');
      sideBtnHome.classList.remove('active');
      if (sideBtnForge) sideBtnForge.classList.remove('active');
      if (sideBtnDownloads) sideBtnDownloads.classList.remove('active');
      if (sideBtnSettings) sideBtnSettings.classList.add('active');
      hideTranslateBanner();
    } else if (currentTab.isDownloads || currentTab.url === 'internal://downloads' || currentTab.url === 'worldcraft://downloads') {
      urlInput.value = 'internal://downloads';
      urlInput.placeholder = 'internal://downloads';
      homescreen.style.display = 'none';
      if (forgeHud) forgeHud.classList.add('hidden');
      if (settingsHud) settingsHud.classList.add('hidden');
      if (downloadsHud) downloadsHud.classList.remove('hidden');
      sideBtnHome.classList.remove('active');
      if (sideBtnForge) sideBtnForge.classList.remove('active');
      if (sideBtnSettings) sideBtnSettings.classList.remove('active');
      if (sideBtnDownloads) sideBtnDownloads.classList.add('active');
      hideTranslateBanner();
      renderDownloadsHud();
    } else if (currentTab.isHome) {
      urlInput.value = '';
      urlInput.placeholder = t('home_search_placeholder') || 'Adresse eingeben oder im Matrix-Netz suchen...';
      homescreen.style.display = 'flex';
      if (forgeHud) forgeHud.classList.add('hidden');
      if (settingsHud) settingsHud.classList.add('hidden');
      if (downloadsHud) downloadsHud.classList.add('hidden');
      sideBtnHome.classList.add('active');
      if (sideBtnForge) sideBtnForge.classList.remove('active');
      if (sideBtnSettings) sideBtnSettings.classList.remove('active');
      if (sideBtnDownloads) sideBtnDownloads.classList.remove('active');
      hideTranslateBanner();
    } else {
      urlInput.value = currentTab.url || '';
      urlInput.placeholder = t('url_placeholder') || 'URL eingeben oder Web durchsuchen...';
      homescreen.style.display = 'none';
      if (forgeHud) forgeHud.classList.add('hidden');
      if (settingsHud) settingsHud.classList.add('hidden');
      if (downloadsHud) downloadsHud.classList.add('hidden');
      sideBtnHome.classList.remove('active');
      if (sideBtnForge) sideBtnForge.classList.remove('active');
      if (sideBtnSettings) sideBtnSettings.classList.remove('active');
      if (sideBtnDownloads) sideBtnDownloads.classList.remove('active');

      // Check page language vs user language for translate banner
      const tabInfo = tabTranslationState[activeTabId];
      const userLang = (currentSettings.language || 'de').toLowerCase();
      if (tabInfo && tabInfo.detectedLang && tabInfo.detectedLang !== userLang) {
        showTranslateBanner(tabInfo.detectedLang);
      } else {
        hideTranslateBanner();
      }
    }
  } else {
    hideTranslateBanner();
  }

  syncViewportBounds();
}

/**
 * Speed Dial Grid Rendering
 */
async function loadFavorites() {
  try {
    const res = await window.worldcraft.favorites.list();
    if (!res.ok) return;
    const favorites = res.data || [];

    speedDialGrid.innerHTML = '';

    favorites.forEach((fav) => {
      const tile = document.createElement('div');
      tile.className = 'speed-tile';

      const icon = document.createElement('div');
      icon.className = 'speed-tile-icon';

      // Domain für Favicon ermitteln
      let domain = '';
      try {
        const rawUrl = (fav.url || '').trim();
        if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
          domain = new URL(rawUrl).hostname;
        } else if (rawUrl && !rawUrl.includes('://')) {
          domain = new URL(`https://${rawUrl}`).hostname;
        }
      } catch (e) {
        domain = '';
      }

      const fallbackChar = ((fav.title || domain || 'W').trim()[0] || 'W').toUpperCase();
      const isInternalRadio = fav.url === 'internal://radio' || fav.url === 'worldcraft://radio' || fav.icon === 'radio';

      if (isInternalRadio) {
        icon.textContent = '♫';
      } else if (domain) {
        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
        img.alt = fav.title || domain;
        img.loading = 'lazy';
        img.style.cssText = 'width:24px; height:24px; border-radius:4px; object-fit:contain; display:block;';
        img.onerror = () => {
          img.remove();
          if (fav.icon === 'youtube') icon.textContent = '▶';
          else if (fav.icon === 'twitch') icon.textContent = '👾';
          else if (fav.icon === 'github') icon.textContent = '⚡';
          else icon.textContent = fallbackChar;
        };
        icon.appendChild(img);
      } else if (fav.icon === 'youtube') {
        icon.textContent = '▶';
      } else if (fav.icon === 'twitch') {
        icon.textContent = '👾';
      } else if (fav.icon === 'github') {
        icon.textContent = '⚡';
      } else {
        icon.textContent = fallbackChar;
      }

      const title = document.createElement('span');
      title.className = 'speed-tile-title';
      title.textContent = fav.title;

      const delBtn = document.createElement('button');
      delBtn.className = 'speed-tile-delete';
      delBtn.innerHTML = '×';
      delBtn.title = 'Entfernen';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.worldcraft.favorites.remove(fav.id);
        loadFavorites();
        showToast('Favorit entfernt', 'info');
      });

      tile.appendChild(delBtn);
      tile.appendChild(icon);
      tile.appendChild(title);

      tile.addEventListener('click', async () => {
        if (fav.url === 'internal://radio' || fav.url === 'worldcraft://radio') {
          openModal(modalRadio);
        } else {
          await window.worldcraft.tabs.navigate(activeTabId, fav.url);
        }
      });

      speedDialGrid.appendChild(tile);
    });

    // Favorites Full List in Modal
    favoritesFullList.innerHTML = '';
    favorites.forEach((fav) => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:var(--bg-tertiary); border-radius:4px; border:1px solid var(--border-color);';

      const label = document.createElement('div');
      label.style.overflow = 'hidden';
      label.innerHTML = `<strong>${fav.title}</strong> <span style="color:var(--text-muted); font-size:11px;">(${fav.url})</span>`;

      const remove = document.createElement('button');
      remove.className = 'btn-secondary';
      remove.style.cssText = 'padding:2px 8px; font-size:11px;';
      remove.textContent = 'Löschen';
      remove.addEventListener('click', async () => {
        await window.worldcraft.favorites.remove(fav.id);
        loadFavorites();
      });

      item.appendChild(label);
      item.appendChild(remove);
      favoritesFullList.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading favorites:', err);
  }
}

/**
 * Digital Matrix Clock
 */
function startClock() {
  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    homeClock.textContent = `${hours}:${minutes}:${seconds}`;

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    homeDate.textContent = `${day}.${month}.${year}`;
  }
  update();
  setInterval(update, 1000);
}

/**
 * Worldcraft Radio Player
 */
async function initRadio() {
  try {
    const res = await window.worldcraft.radio.getStations();
    if (res.ok) {
      radioStations = res.data;
      renderRadioStations();
    }
  } catch (err) {
    console.error('Failed to load radio stations:', err);
  }

  btnRadioPlay.addEventListener('click', toggleAudioPlayback);

  radioVolumeSlider.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    audioPlayer.volume = vol;
  });

  audioPlayer.addEventListener('playing', () => {
    btnRadioPlay.textContent = '❚❚';
    radioPlayerBar.classList.add('radio-playing');
  });

  audioPlayer.addEventListener('pause', () => {
    btnRadioPlay.textContent = '▶';
    radioPlayerBar.classList.remove('radio-playing');
  });

  audioPlayer.addEventListener('error', () => {
    showToast('Radiostream konnte nicht geladen werden.', 'error');
    btnRadioPlay.textContent = '▶';
    radioPlayerBar.classList.remove('radio-playing');
  });
}

function renderRadioStations() {
  radioStationsList.innerHTML = '';
  radioStations.forEach((station) => {
    const card = document.createElement('div');
    card.className = 'speed-tile';
    card.style.cssText = 'flex-direction:row; justify-content:space-between; padding:10px 14px; text-align:left;';

    const info = document.createElement('div');
    info.innerHTML = `<strong>${station.name}</strong><br><span style="font-size:10px; color:var(--text-muted);">${station.genre}</span>`;

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-primary';
    playBtn.style.cssText = 'padding:4px 10px; font-size:11px;';
    playBtn.textContent = 'Streamen';

    card.appendChild(info);
    card.appendChild(playBtn);

    card.addEventListener('click', () => {
      playStation(station);
    });

    radioStationsList.appendChild(card);
  });
}

function playStation(station) {
  activeStation = station;
  radioActiveName.textContent = station.name;
  radioActiveGenre.textContent = station.genre;
  audioPlayer.src = station.url;
  audioPlayer.play().catch(() => {
    showToast('Wiedergabefehler beim Radiostream.', 'error');
  });
  showToast(`Stream gestartet: ${station.name}`, 'success');
}

function toggleAudioPlayback() {
  if (!audioPlayer.src && radioStations.length > 0) {
    playStation(radioStations[0]);
    return;
  }
  if (audioPlayer.paused) {
    audioPlayer.play().catch(() => {});
  } else {
    audioPlayer.pause();
  }
}

/**
 * AI Side Panel
 */
function toggleAiPanel(forceState) {
  const isCollapsed = aiPanel.classList.contains('collapsed');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : isCollapsed;

  if (shouldOpen) {
    aiPanel.classList.remove('collapsed');
    sideBtnAi.classList.add('active');
    setTimeout(() => aiInputText.focus(), 100);
  } else {
    aiPanel.classList.add('collapsed');
    sideBtnAi.classList.remove('active');
  }

  setTimeout(syncViewportBounds, 300);
}

function appendAiMessage(role, text) {
  const msgEl = document.createElement('div');
  msgEl.className = `ai-msg ${role}`;

  const roleLabel = document.createElement('span');
  roleLabel.className = 'ai-msg-role';
  roleLabel.textContent = role === 'user' ? '[BENUTZER]' : '[WORLDCRAFT]';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'ai-msg-body';

  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  bodyEl.innerHTML = formatted;

  msgEl.appendChild(roleLabel);
  msgEl.appendChild(bodyEl);
  aiMessagesList.appendChild(msgEl);
  aiMessagesList.scrollTop = aiMessagesList.scrollHeight;

  chatHistory.push({ role, text });
}

async function sendAiMessage() {
  const query = aiInputText.value.trim();
  if (!query) return;

  aiInputText.value = '';
  appendAiMessage('user', query);

  aiLoadingBox.classList.add('active');
  btnAiSend.disabled = true;

  try {
    const res = await window.worldcraft.ai.chat(query, { chatHistory });
    aiLoadingBox.classList.remove('active');
    btnAiSend.disabled = false;

    if (res.ok) {
      appendAiMessage('assistant', res.data.reply);
    } else {
      if (res.error && (res.error.code === 'NO_API_KEY' || (res.error.message && res.error.message.includes('NEURAL-LINK OFFLINE')))) {
        appendOfflineAiNotice();
        showToast('Kein API-Key hinterlegt! Bitte in Einstellungen konfigurieren.', 'error');
      } else {
        appendAiMessage('assistant', `Fehler [${res.error.code}]: ${res.error.message}`);
        showToast(res.error.message, 'error');
      }
    }
  } catch (err) {
    aiLoadingBox.classList.remove('active');
    btnAiSend.disabled = false;
    appendAiMessage('assistant', `Netzwerkfehler: ${err.message}`);
  }
}

function appendOfflineAiNotice() {
  const provider = currentSettings.aiProvider || 'google';
  const meta = PROVIDER_META[provider] || PROVIDER_META.google;

  const msgEl = document.createElement('div');
  msgEl.className = 'ai-msg assistant';

  const roleLabel = document.createElement('span');
  roleLabel.className = 'ai-msg-role';
  roleLabel.textContent = '[WORLDCRAFT AI]';

  const bodyEl = document.createElement('div');
  bodyEl.className = 'ai-msg-body';
  bodyEl.innerHTML = `
    <div style="color:var(--neon-green); font-weight:800; font-size:12px; margin-bottom:6px; letter-spacing:1px;">
      [ NEURAL-LINK OFFLINE // KEY IN SETTINGS HINTERLEGEN ]
    </div>
    <div style="font-size:11px; color:var(--text-secondary); margin-bottom:10px;">
      Für <strong>${meta.name}</strong> wurde noch kein Zugriffsschlüssel im sicheren Speicher hinterlegt (0 € Standard-Entwicklerkosten).
    </div>
    <button class="btn-primary btn-open-settings-from-chat" style="padding:4px 12px; font-size:11px;">
      [ EINSTELLUNGEN ÖFFNEN ]
    </button>
  `;

  const btnOpen = bodyEl.querySelector('.btn-open-settings-from-chat');
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      openModal(modalSettings);
    });
  }

  msgEl.appendChild(roleLabel);
  msgEl.appendChild(bodyEl);
  aiMessagesList.appendChild(msgEl);
  aiMessagesList.scrollTop = aiMessagesList.scrollHeight;
}

async function summarizeCurrentPage() {
  toggleAiPanel(true);
  aiLoadingBox.classList.add('active');

  try {
    const res = await window.worldcraft.ai.summarizeCurrentPage();
    aiLoadingBox.classList.remove('active');

    if (res.ok) {
      appendAiMessage('assistant', `### Zusammenfassung von "${res.data.title}":\n\n${res.data.summary}`);
      showToast('Zusammenfassung abgeschlossen', 'success');
    } else {
      if (res.error && (res.error.code === 'NO_API_KEY' || (res.error.message && res.error.message.includes('NEURAL-LINK OFFLINE')))) {
        appendOfflineAiNotice();
        showToast('Kein API-Key hinterlegt!', 'error');
      } else {
        appendAiMessage('assistant', `Zusammenfassung fehlgeschlagen [${res.error.code}]: ${res.error.message}`);
        showToast(res.error.message, 'error');
      }
    }
  } catch (err) {
    aiLoadingBox.classList.remove('active');
    appendAiMessage('assistant', `Fehler: ${err.message}`);
  }
}

async function checkAiStatus() {
  try {
    const res = await window.worldcraft.ai.getStatus();
    if (res && res.ok && res.data.isConfigured) {
      aiStatusIndicator.classList.add('online');
      aiStatusIndicator.title = `Status: Verbunden (${(res.data.provider || 'AI').toUpperCase()} // ${res.data.model})`;
    } else {
      aiStatusIndicator.classList.remove('online');
      aiStatusIndicator.title = 'Status: Neural-Link Offline (Kein API-Key)';
    }
  } catch (err) {
    aiStatusIndicator.classList.remove('online');
  }
}

/**
 * DOWNLOAD MANAGER & MATRIX DATA STREAM VISUALIZATION
 */
function formatBytes(bytes) {
  if (typeof bytes !== 'number' || bytes < 0 || isNaN(bytes)) return 'UNKNOWN';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec) {
  if (typeof bytesPerSec !== 'number' || bytesPerSec <= 0 || isNaN(bytesPerSec)) return '0.0 KB/S';
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/S`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/S`;
}

function renderDownloadsList() {
  if (!downloadsListItems) return;

  const progressing = currentDownloads.filter((d) => d.state === 'progressing');
  const activeCount = progressing.length;

  if (activeCount > 0) {
    downloadBadge.textContent = activeCount;
    downloadBadge.classList.add('active');
    btnNavDownloads.classList.add('active-transfer');

    // Calculate aggregate percentage
    let totalReceived = 0;
    let totalExpected = 0;
    progressing.forEach((d) => {
      if (typeof d.receivedBytes === 'number') totalReceived += d.receivedBytes;
      if (typeof d.totalBytes === 'number' && d.totalBytes > 0) totalExpected += d.totalBytes;
    });

    let avgPercent = 0;
    if (totalExpected > 0) {
      avgPercent = Math.min(100, Math.round((totalReceived / totalExpected) * 100));
    } else {
      const pList = progressing.map((d) => d.percent).filter((p) => typeof p === 'number');
      avgPercent = pList.length > 0 ? Math.round(pList.reduce((a, b) => a + b, 0) / pList.length) : 50;
    }

    if (downloadRingProgress) {
      const circumference = 87.96;
      const offset = circumference * (1 - avgPercent / 100);
      downloadRingProgress.style.strokeDashoffset = offset;
    }
  } else {
    downloadBadge.classList.remove('active');
    btnNavDownloads.classList.remove('active-transfer');
    if (downloadRingProgress) {
      downloadRingProgress.style.strokeDashoffset = 87.96;
    }
  }

  if (currentDownloads.length === 0) {
    downloadsListItems.innerHTML = `
      <div class="datastream-empty-state">
        <img src="assets/datastream-globe.jpg" class="datastream-globe-img" alt="Wireframe Globe">
        <div class="datastream-idle-text">[ DATASTREAM IDLE ]</div>
      </div>
    `;
    return;
  }

  downloadsListItems.innerHTML = '';

  currentDownloads.forEach((dl) => {
    const card = document.createElement('div');
    card.className = `download-card ${dl.pulse ? 'neon-complete-pulse' : ''}`;
    delete dl.pulse; // Only pulse once

    const top = document.createElement('div');
    top.className = 'download-card-top';

    const name = document.createElement('span');
    name.className = 'download-file-name';
    name.textContent = dl.fileName;
    name.title = dl.fileName;

    const badge = document.createElement('span');
    badge.className = `download-state-badge ${dl.state}`;
    if (dl.state === 'completed') badge.textContent = '[ DECRYPTED & READY ]';
    else if (dl.state === 'progressing') badge.textContent = 'STREAMING...';
    else if (dl.state === 'cancelled') badge.textContent = 'CANCELLED';
    else badge.textContent = 'INTERRUPTED';

    top.appendChild(name);
    top.appendChild(badge);

    // Matrix Data Stream Graphic Materialization
    const streamContainer = document.createElement('div');
    streamContainer.className = 'matrix-materialize-container';

    const grid = document.createElement('div');
    grid.className = 'matrix-materialize-grid';

    const fill = document.createElement('div');
    fill.className = 'matrix-materialize-fill';
    const percentWidth = dl.percent !== null && dl.percent !== undefined
      ? Math.min(100, Math.max(0, dl.percent))
      : (dl.state === 'completed' ? 100 : 35);
    fill.style.width = `${percentWidth}%`;

    const edge = document.createElement('div');
    edge.className = 'matrix-materialize-edge';
    if (percentWidth >= 100 || dl.state === 'completed') {
      edge.style.display = 'none';
    }
    fill.appendChild(edge);

    const glyphs = document.createElement('div');
    glyphs.className = 'matrix-materialize-text';
    glyphs.textContent = dl.state === 'completed'
      ? '01010101 [ DECRYPTED & READY ] 10101010 01101100'
      : '7F A2 0B 9C 4D 8E 10 01 AF BC DE 01 22 34 56 78 9A BC DE F0';

    streamContainer.appendChild(grid);
    streamContainer.appendChild(fill);
    streamContainer.appendChild(glyphs);

    // Terminal Status Line: [ SPEED: <mb/s> // PROGRESS: <%> // DATA: <geladen>/<gesamt> ]
    const statusLine = document.createElement('div');
    statusLine.className = 'terminal-status-line';
    const speedStr = formatSpeed(dl.speed);
    const recStr = formatBytes(dl.receivedBytes);
    const totStr = dl.totalBytes > 0 ? formatBytes(dl.totalBytes) : 'UNKNOWN';
    const progStr = dl.percent !== null && dl.percent !== undefined
      ? `${dl.percent}%`
      : (dl.state === 'completed' ? '100%' : 'UNKNOWN');

    statusLine.textContent = `[ SPEED: ${speedStr} // PROGRESS: ${progStr} // DATA: ${recStr}/${totStr} ]`;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'download-card-actions';

    if (dl.state === 'completed') {
      const btnOpen = document.createElement('button');
      btnOpen.className = 'btn-primary';
      btnOpen.style.cssText = 'padding:3px 8px; font-size:10px;';
      btnOpen.textContent = '[ OPEN ]';
      btnOpen.addEventListener('click', async () => {
        const res = await window.worldcraft.downloads.open(dl.id);
        if (!res.ok) showToast(res.error, 'error');
      });

      const btnFolder = document.createElement('button');
      btnFolder.className = 'btn-secondary';
      btnFolder.style.cssText = 'padding:3px 8px; font-size:10px;';
      btnFolder.textContent = '[ SHOW IN FOLDER ]';
      btnFolder.addEventListener('click', async () => {
        const res = await window.worldcraft.downloads.showInFolder(dl.id);
        if (!res.ok) showToast(res.error, 'error');
      });

      actions.appendChild(btnFolder);
      actions.appendChild(btnOpen);
    } else if (dl.state === 'progressing') {
      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn-secondary';
      btnCancel.style.cssText = 'padding:3px 8px; font-size:10px; color:#ff7777;';
      btnCancel.textContent = '[ CANCEL ]';
      btnCancel.addEventListener('click', async () => {
        await window.worldcraft.downloads.cancel(dl.id);
      });
      actions.appendChild(btnCancel);
    }

    card.appendChild(top);
    card.appendChild(streamContainer);
    card.appendChild(statusLine);
    if (actions.children.length > 0) {
      card.appendChild(actions);
    }

    downloadsListItems.appendChild(card);
  });

  renderDownloadsHud();
}

function renderDownloadsHud() {
  if (!downloadsHudItems) return;

  const progressing = currentDownloads.filter((d) => d.state === 'progressing');
  const completed = currentDownloads.filter((d) => d.state === 'completed');

  if (hudStatTotal) hudStatTotal.textContent = currentDownloads.length;
  if (hudStatActive) hudStatActive.textContent = progressing.length;
  if (hudStatCompleted) hudStatCompleted.textContent = completed.length;

  if (currentDownloads.length === 0) {
    downloadsHudItems.innerHTML = `
      <div class="datastream-empty-state">
        <img src="assets/datastream-globe.jpg" class="datastream-globe-img" alt="Wireframe Globe">
        <div class="datastream-idle-text">[ DATASTREAM IDLE // KEINE DOWNLOADS VORHANDEN ]</div>
      </div>
    `;
    return;
  }

  downloadsHudItems.innerHTML = '';

  currentDownloads.forEach((dl) => {
    const card = document.createElement('div');
    card.className = `download-card ${dl.pulse ? 'neon-complete-pulse' : ''}`;

    const top = document.createElement('div');
    top.className = 'download-card-top';

    const name = document.createElement('span');
    name.className = 'download-file-name';
    name.textContent = dl.fileName;
    name.title = dl.fileName;

    const badge = document.createElement('span');
    badge.className = `download-state-badge ${dl.state}`;
    if (dl.state === 'completed') badge.textContent = '[ DECRYPTED & READY ]';
    else if (dl.state === 'progressing') badge.textContent = 'STREAMING...';
    else if (dl.state === 'cancelled') badge.textContent = 'CANCELLED';
    else badge.textContent = 'INTERRUPTED';

    top.appendChild(name);
    top.appendChild(badge);

    // Matrix Data Stream Graphic Materialization
    const streamContainer = document.createElement('div');
    streamContainer.className = 'matrix-materialize-container';

    const grid = document.createElement('div');
    grid.className = 'matrix-materialize-grid';

    const fill = document.createElement('div');
    fill.className = 'matrix-materialize-fill';
    const percentWidth = dl.percent !== null && dl.percent !== undefined
      ? Math.min(100, Math.max(0, dl.percent))
      : (dl.state === 'completed' ? 100 : 35);
    fill.style.width = `${percentWidth}%`;

    const edge = document.createElement('div');
    edge.className = 'matrix-materialize-edge';
    if (percentWidth >= 100 || dl.state === 'completed') {
      edge.style.display = 'none';
    }
    fill.appendChild(edge);

    const glyphs = document.createElement('div');
    glyphs.className = 'matrix-materialize-text';
    glyphs.textContent = dl.state === 'completed'
      ? '01010101 [ DECRYPTED & READY ] 10101010 01101100'
      : '7F A2 0B 9C 4D 8E 10 01 AF BC DE 01 22 34 56 78 9A BC DE F0';

    streamContainer.appendChild(grid);
    streamContainer.appendChild(fill);
    streamContainer.appendChild(glyphs);

    // Terminal Status Line: [ SPEED: <mb/s> // PROGRESS: <%> // DATA: <geladen>/<gesamt> ]
    const statusLine = document.createElement('div');
    statusLine.className = 'terminal-status-line';
    const speedStr = formatSpeed(dl.speed);
    const recStr = formatBytes(dl.receivedBytes);
    const totStr = dl.totalBytes > 0 ? formatBytes(dl.totalBytes) : 'UNKNOWN';
    const progStr = dl.percent !== null && dl.percent !== undefined
      ? `${dl.percent}%`
      : (dl.state === 'completed' ? '100%' : 'UNKNOWN');

    let statusText = `[ SPEED: ${speedStr} // PROGRESS: ${progStr} // DATA: ${recStr}/${totStr} ]`;
    if (dl.savePath) {
      statusText += ` // PATH: ${dl.savePath}`;
    }
    statusLine.textContent = statusText;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'download-card-actions';

    if (dl.state === 'completed') {
      const btnFolder = document.createElement('button');
      btnFolder.className = 'btn-primary';
      btnFolder.style.cssText = 'padding:4px 10px; font-size:11px;';
      btnFolder.textContent = '[ IM ORDNER ANZEIGEN ]';
      btnFolder.addEventListener('click', async () => {
        const res = await window.worldcraft.downloads.showInFolder(dl.id);
        if (!res.ok) showToast(res.error || 'Fehler beim Anzeigen im Ordner', 'error');
      });

      const btnOpen = document.createElement('button');
      btnOpen.className = 'btn-secondary';
      btnOpen.style.cssText = 'padding:4px 10px; font-size:11px;';
      btnOpen.textContent = '[ ÖFFNEN ]';
      btnOpen.addEventListener('click', async () => {
        const res = await window.worldcraft.downloads.open(dl.id);
        if (!res.ok) showToast(res.error || 'Fehler beim Öffnen der Datei', 'error');
      });

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-secondary';
      btnDelete.style.cssText = 'padding:4px 10px; font-size:11px; color:#ff7777;';
      btnDelete.textContent = '[ LÖSCHEN ]';
      btnDelete.addEventListener('click', async () => {
        await window.worldcraft.downloads.removeHistoryEntry(dl.id);
        loadDownloads();
      });

      actions.appendChild(btnFolder);
      actions.appendChild(btnOpen);
      actions.appendChild(btnDelete);
    } else if (dl.state === 'progressing') {
      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn-secondary';
      btnCancel.style.cssText = 'padding:4px 10px; font-size:11px; color:#ff7777;';
      btnCancel.textContent = '[ ABBRECHEN ]';
      btnCancel.addEventListener('click', async () => {
        await window.worldcraft.downloads.cancel(dl.id);
      });
      actions.appendChild(btnCancel);
    } else {
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-secondary';
      btnDelete.style.cssText = 'padding:4px 10px; font-size:11px; color:#ff7777;';
      btnDelete.textContent = '[ AUS VERLAUF ENTFERNEN ]';
      btnDelete.addEventListener('click', async () => {
        await window.worldcraft.downloads.removeHistoryEntry(dl.id);
        loadDownloads();
      });
      actions.appendChild(btnDelete);
    }

    card.appendChild(top);
    card.appendChild(streamContainer);
    card.appendChild(statusLine);
    if (actions.children.length > 0) {
      card.appendChild(actions);
    }

    downloadsHudItems.appendChild(card);
  });
}

async function loadDownloads() {
  if (!window.worldcraft || !window.worldcraft.downloads) return;
  try {
    const res = await window.worldcraft.downloads.list();
    if (res && res.ok) {
      currentDownloads = res.data || [];
      renderDownloadsList();
    }
  } catch (err) {
    console.error('Failed to load downloads:', err);
  }
}

/**
 * AUTO-UPDATER HUD UI & SETTINGS TERMINAL UPDATER
 */
function initUpdater() {
  const versionDisplayVal = document.getElementById('version-display-val');
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const updaterTerminalBox = document.getElementById('updater-terminal-box');
  const updaterStatusText = document.getElementById('updater-status-text');
  const updaterMatrixProgressWrap = document.getElementById('updater-matrix-progress-wrap');
  const updaterMatrixProgressFill = document.getElementById('updater-matrix-progress-fill');
  const updaterMatrixProgressText = document.getElementById('updater-matrix-progress-text');
  const updaterActionRow = document.getElementById('updater-action-row');
  const btnRestartAndInstall = document.getElementById('btn-restart-and-install');

  async function loadAppVersion() {
    if (versionDisplayVal && window.worldcraft && window.worldcraft.updater) {
      try {
        const stateRes = await window.worldcraft.updater.getState();
        if (stateRes && stateRes.ok && stateRes.data && (stateRes.data.version || stateRes.data.currentVersion)) {
          versionDisplayVal.textContent = stateRes.data.version || stateRes.data.currentVersion;
        } else if (typeof window.worldcraft.updater.getVersion === 'function') {
          const vRes = await window.worldcraft.updater.getVersion();
          if (vRes && vRes.ok && vRes.version) {
            versionDisplayVal.textContent = vRes.version;
          }
        }
      } catch (err) {
        // Fallback remains 1.0.0
      }
    }
  }
  loadAppVersion();

  if (btnCheckUpdates) {
    btnCheckUpdates.addEventListener('click', async () => {
      if (updaterTerminalBox) updaterTerminalBox.classList.remove('hidden');
      if (updaterStatusText) updaterStatusText.textContent = 'PINGING UPDATE SERVERS...';
      btnCheckUpdates.disabled = true;
      btnCheckUpdates.classList.add('checking');
      if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
      if (updaterActionRow) updaterActionRow.classList.add('hidden');

      if (window.worldcraft && window.worldcraft.updater) {
        try {
          await window.worldcraft.updater.check();
        } catch (err) {
          if (updaterStatusText) updaterStatusText.textContent = 'SYSTEM UP TO DATE // KEINE UPDATES VORHANDEN';
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }
      } else {
        setTimeout(() => {
          if (updaterStatusText) updaterStatusText.textContent = 'SYSTEM UP TO DATE // KEINE UPDATES VORHANDEN';
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }, 800);
      }
    });
  }

  if (btnRestartAndInstall) {
    btnRestartAndInstall.addEventListener('click', async () => {
      if (window.worldcraft && window.worldcraft.updater) {
        await window.worldcraft.updater.install();
      }
    });
  }

  if (!window.worldcraft || !window.worldcraft.events) return;

  window.worldcraft.events.onUpdateStatus((state) => {
    if (!state) return;

    // 1. Settings Terminal Updates
    if (updaterTerminalBox && updaterStatusText) {
      updaterTerminalBox.classList.remove('hidden');

      if (state.status === 'checking') {
        updaterStatusText.textContent = 'PINGING UPDATE SERVERS...';
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = true;
          btnCheckUpdates.classList.add('checking');
        }
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
        if (updaterActionRow) updaterActionRow.classList.add('hidden');
      } else if (state.status === 'available') {
        const currentVer = state.currentVersion || state.version || '1.2.0';
        const availableVer = (state.updateInfo && state.updateInfo.version) || state.availableVersion || '';
        updaterStatusText.textContent = `UPDATE VERFÜGBAR: V${availableVer} (Installiert: V${currentVer}) // BEREIT ZUM DOWNLOAD`;
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
        if (updaterActionRow) updaterActionRow.classList.remove('hidden');
        const btnDl = document.getElementById('btn-download-update');
        if (btnDl) {
          btnDl.classList.remove('hidden');
          btnDl.disabled = false;
        }
        if (btnRestartAndInstall) btnRestartAndInstall.classList.add('hidden');
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }
      } else if (state.status === 'downloading') {
        const p = (state.progress && state.progress.percent) || 0;
        const ver = (state.updateInfo && state.updateInfo.version) || state.availableVersion || '';
        updaterStatusText.textContent = `LÄDT UPDATE V${ver} HERUNTER...`;
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.remove('hidden');
        if (updaterMatrixProgressFill) updaterMatrixProgressFill.style.width = `${p}%`;
        if (updaterMatrixProgressText) updaterMatrixProgressText.textContent = `${p}% DOWNLOADING PATCH...`;
        if (updaterActionRow) updaterActionRow.classList.add('hidden');
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = true;
          btnCheckUpdates.classList.add('checking');
        }
      } else if (state.status === 'downloaded') {
        const ver = (state.updateInfo && state.updateInfo.version) || state.availableVersion || '';
        updaterStatusText.textContent = `UPDATE V${ver} // BEREIT ZUR INSTALLATION`;
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.remove('hidden');
        if (updaterMatrixProgressFill) updaterMatrixProgressFill.style.width = '100%';
        if (updaterMatrixProgressText) updaterMatrixProgressText.textContent = '100% PATCH READY & VERIFIED';
        if (updaterActionRow) updaterActionRow.classList.remove('hidden');
        const btnDl = document.getElementById('btn-download-update');
        if (btnDl) btnDl.classList.add('hidden');
        if (btnRestartAndInstall) {
          btnRestartAndInstall.classList.remove('hidden');
          btnRestartAndInstall.disabled = false;
        }
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }
      } else if (state.status === 'not-available') {
        const currentVer = state.currentVersion || state.version || '1.2.0';
        updaterStatusText.textContent = `SYSTEM UP TO DATE // V${currentVer} IST DIE NEUESTE VERSION`;
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
        if (updaterActionRow) updaterActionRow.classList.add('hidden');
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }
      } else if (state.status === 'error') {
        const errText = state.error || 'Fehler bei der Updateprüfung';
        updaterStatusText.textContent = `UPDATE FEHLER // ${errText.toUpperCase()}`;
        if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
        if (updaterActionRow) updaterActionRow.classList.add('hidden');
        if (btnCheckUpdates) {
          btnCheckUpdates.disabled = false;
          btnCheckUpdates.classList.remove('checking');
        }
      }
    }

    // 2. Global Floating HUD
    if (updateHud && updateHudText) {
      if (state.status === 'available') {
        updateHud.classList.add('active');
        updateHudText.textContent = `UPDATE V${(state.updateInfo && state.updateInfo.version) || ''} VERFÜGBAR`;
        updateHudProgress.style.display = 'none';
        btnUpdateRestart.style.display = 'none';
      } else if (state.status === 'downloading') {
        updateHud.classList.add('active');
        const p = state.progress ? state.progress.percent : 0;
        updateHudText.textContent = `DOWNLOADING UPDATE: ${p}%`;
        updateHudProgress.style.display = 'block';
        updateHudProgressFill.style.width = `${p}%`;
        btnUpdateRestart.style.display = 'none';
      } else if (state.status === 'downloaded') {
        updateHud.classList.add('active');
        updateHudText.textContent = `UPDATE V${(state.updateInfo && state.updateInfo.version) || ''} // READY TO INSTALL`;
        updateHudProgress.style.display = 'none';
        btnUpdateRestart.style.display = 'inline-block';
      } else if (state.status === 'error') {
        updateHud.classList.remove('active');
      }
    }
  });

  if (btnUpdateRestart) {
    btnUpdateRestart.addEventListener('click', async () => {
      await window.worldcraft.updater.install();
    });
  }

  if (btnUpdateDismiss) {
    btnUpdateDismiss.addEventListener('click', () => {
      updateHud.classList.remove('active');
    });
  }
}

/**
 * SETTINGS DASHBOARD REDESIGN (Search Cards, Neural Core, Cyber Switches)
 */
async function loadSettings() {
  try {
    const res = await window.worldcraft.settings.get();
    if (res.ok) {
      currentSettings = { ...currentSettings, ...res.data };
      applySettingsToUI(currentSettings);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function applyHomescreenBackground(s) {
  const homescreenEl = document.getElementById('homescreen');
  if (!homescreenEl) return;
  const mode = (s && s.customBackgroundMode) || 'default';
  const customUrl = s && s.customBackgroundUrl;
  const customLocal = s && s.customBackgroundLocal;

  if (mode === 'url' && customUrl) {
    homescreenEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${customUrl}")`;
  } else if (mode === 'local' && customLocal) {
    homescreenEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${customLocal}")`;
  } else {
    homescreenEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('assets/cyberpunk-bg.png')`;
  }
}

function updateHudBackgroundUI(s) {
  const mode = (s && s.customBackgroundMode) || 'default';
  const urlVal = (s && s.customBackgroundUrl) || '';
  const localVal = (s && s.customBackgroundLocal) || '';

  document.querySelectorAll('input[name="hudCustomBgMode"]').forEach((radio) => {
    const isChecked = radio.value === mode;
    radio.checked = isChecked;
    const parentLabel = radio.closest('.bg-mode-option');
    if (parentLabel) parentLabel.classList.toggle('active', isChecked);
  });

  const urlPanel = document.getElementById('hud-bg-url-panel');
  const localPanel = document.getElementById('hud-bg-local-panel');
  const urlInput = document.getElementById('hud-setting-bg-url');
  const fileName = document.getElementById('hud-bg-file-name');
  const previewBox = document.getElementById('hud-bg-preview-box');
  const previewTag = document.getElementById('hud-bg-preview-mode-tag');

  if (urlPanel) urlPanel.classList.toggle('hidden', mode !== 'url');
  if (localPanel) localPanel.classList.toggle('hidden', mode !== 'local');
  if (urlInput) urlInput.value = urlVal;

  if (fileName) {
    fileName.textContent = localVal ? 'Lokal gespeichert // aktiv' : 'Keine Datei gewählt';
  }

  if (previewBox && previewTag) {
    if (mode === 'url' && urlVal) {
      previewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${urlVal}")`;
      previewTag.textContent = 'CUSTOM URL';
      previewTag.style.borderColor = 'var(--neon-green)';
      previewTag.style.color = 'var(--neon-green)';
    } else if (mode === 'local' && localVal) {
      previewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${localVal}")`;
      previewTag.textContent = 'LOCAL IMAGE';
      previewTag.style.borderColor = 'var(--neon-cyan)';
      previewTag.style.color = 'var(--neon-cyan)';
    } else {
      previewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('assets/cyberpunk-bg.png')`;
      previewTag.textContent = 'DEFAULT';
      previewTag.style.borderColor = 'var(--border-color)';
      previewTag.style.color = 'var(--text-secondary)';
    }
  }
}

function updateHudAiStatus(isConfigured) {
  const indicator = document.getElementById('hud-ai-status-indicator');
  const badgeText = document.getElementById('hud-ai-status-badge-text');
  if (!indicator || !badgeText) return;

  if (isConfigured) {
    indicator.classList.remove('not-configured');
    indicator.classList.add('configured');
    badgeText.textContent = t('settings_ai_status_active') || 'AKTIVIERT // ONLINE';
  } else {
    indicator.classList.remove('configured');
    indicator.classList.add('not-configured');
    badgeText.textContent = t('settings_ai_status_inactive') || 'NICHT KONFIGURIERT // STANDBY';
  }
}

function applySettingsToUI(s) {
  // 0. Language UI Sync
  const activeLang = s.language || 'de';
  updateLanguageUI(activeLang);

  // Dynamic Homescreen & HUD Background
  applyHomescreenBackground(s);
  updateHudBackgroundUI(s);

  // 1. Search Engine Cards & Select Sync
  const hudSearchSelect = document.getElementById('hud-setting-search-select');
  if (hudSearchSelect) {
    hudSearchSelect.value = s.searchEngine || 'google';
  }

  document.querySelectorAll('.search-engine-card').forEach((card) => {
    const engine = card.getAttribute('data-engine');
    if (engine === s.searchEngine) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // 2. Multi-Provider Cards (BYOK)
  const activeProv = s.aiProvider || 'google';
  document.querySelectorAll('.provider-card').forEach((card) => {
    const prov = card.getAttribute('data-provider');
    if (prov === activeProv) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  updateProviderUI(activeProv);

  // 3. Neural Core Model Cards
  document.querySelectorAll('.neural-model-card').forEach((card) => {
    const tier = card.getAttribute('data-model-tier');
    const isPro = s.neuralCoreTier === 'pro';
    if ((tier === 'pro' && isPro) || (tier === 'fast' && !isPro)) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // 4. System Switches
  settingMatrixRain.checked = s.matrixRain !== false;
  settingForceDark.checked = s.forceDark !== false;
  settingBackgroundRadio.checked = s.backgroundRadio !== false;
  settingAiStartup.checked = Boolean(s.aiOnStartup);
  settingNotifyUpdates.checked = s.notifyUpdates !== false;
  settingAnimatedDownloads.checked = s.animatedDownloads !== false;
}

async function updateProviderUI(provider) {
  const meta = PROVIDER_META[provider] || PROVIDER_META.google;
  if (neuralKeyLabel) neuralKeyLabel.textContent = meta.label;
  if (neuralKeyHelpLink) {
    neuralKeyHelpLink.href = meta.helpUrl;
    const txtSpan = neuralKeyHelpLink.querySelector('span');
    if (txtSpan) txtSpan.textContent = meta.helpText;
  }
  if (neuralModelIdFast) neuralModelIdFast.textContent = meta.fastModel;
  if (neuralModelIdPro) neuralModelIdPro.textContent = meta.proModel;

  try {
    const res = await window.worldcraft.ai.getProviders();
    const isConfigured = Boolean(
      res && res.ok && res.data && res.data.configured && (
        Array.isArray(res.data.configured)
          ? res.data.configured.includes(provider)
          : res.data.configured[provider]
      )
    );
    updateHudAiStatus(isConfigured);
    if (isConfigured) {
      if (settingNeuralKey) {
        settingNeuralKey.placeholder = '[ SCHLÜSSEL HINTERLEGT (KRYPTOGRAFISCH GESICHERT) ]';
        settingNeuralKey.value = '';
      }
    } else {
      if (settingNeuralKey) {
        settingNeuralKey.placeholder = meta.placeholder;
        settingNeuralKey.value = '';
      }
    }
  } catch (err) {
    updateHudAiStatus(false);
    if (settingNeuralKey) {
      settingNeuralKey.placeholder = meta.placeholder;
      settingNeuralKey.value = '';
    }
  }
}

function setupSettingsInteractivity() {
  // 1. Chrome-Sidebar Click-To-Scroll Navigation for #settings-hud
  const hudNavItems = document.querySelectorAll('#settings-hud .chrome-settings-sidebar .settings-nav-item');
  const hudScrollContainer = document.getElementById('hud-settings-content-scroll');

  hudNavItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      hudNavItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll-Spy for HUD Sidebar
  if (hudScrollContainer && 'IntersectionObserver' in window) {
    const hudSections = document.querySelectorAll('#settings-hud .cyber-settings-section');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          hudNavItems.forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-target') === id);
          });
        }
      });
    }, { root: hudScrollContainer, threshold: 0.3 });
    hudSections.forEach((sec) => observer.observe(sec));
  }

  // 2. Homescreen Background Customization in HUD
  document.querySelectorAll('input[name="hudCustomBgMode"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      const mode = radio.value;
      currentSettings.customBackgroundMode = mode;
      applyHomescreenBackground(currentSettings);
      updateHudBackgroundUI(currentSettings);
      await window.worldcraft.settings.save({ customBackgroundMode: mode });
    });
  });

  const hudBtnApplyBgUrl = document.getElementById('hud-btn-apply-bg-url');
  const hudSettingBgUrl = document.getElementById('hud-setting-bg-url');
  if (hudBtnApplyBgUrl && hudSettingBgUrl) {
    hudBtnApplyBgUrl.addEventListener('click', async () => {
      const url = hudSettingBgUrl.value.trim();
      if (!url) return;
      currentSettings.customBackgroundMode = 'url';
      currentSettings.customBackgroundUrl = url;
      applyHomescreenBackground(currentSettings);
      updateHudBackgroundUI(currentSettings);
      await window.worldcraft.settings.save({
        customBackgroundMode: 'url',
        customBackgroundUrl: url
      });
      showToast('Homescreen-Hintergrund aktualisiert!', 'success');
    });
  }

  const hudBtnChooseBgFile = document.getElementById('hud-btn-choose-bg-file');
  const hudSettingBgFile = document.getElementById('hud-setting-bg-file');
  if (hudBtnChooseBgFile && hudSettingBgFile) {
    hudBtnChooseBgFile.addEventListener('click', () => {
      hudSettingBgFile.click();
    });

    hudSettingBgFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        const res = await window.worldcraft.settings.saveCustomBackground({
          dataUrl,
          filename: file.name
        });
        if (res && res.ok) {
          currentSettings.customBackgroundMode = 'local';
          currentSettings.customBackgroundLocal = res.fileUrl || dataUrl;
          applyHomescreenBackground(currentSettings);
          updateHudBackgroundUI(currentSettings);
          showToast('Lokales Hintergrundbild übernommen!', 'success');
        } else {
          showToast('Fehler beim Speichern des Hintergrundbildes.', 'error');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const hudBtnResetBg = document.getElementById('hud-btn-reset-bg');
  if (hudBtnResetBg) {
    hudBtnResetBg.addEventListener('click', async () => {
      currentSettings.customBackgroundMode = 'default';
      currentSettings.customBackgroundUrl = '';
      currentSettings.customBackgroundLocal = '';
      applyHomescreenBackground(currentSettings);
      updateHudBackgroundUI(currentSettings);
      await window.worldcraft.settings.save({
        customBackgroundMode: 'default',
        customBackgroundUrl: '',
        customBackgroundLocal: ''
      });
      showToast('Standard-Cyberpunk-Hintergrund wiederhergestellt.', 'info');
    });
  }

  const hudBtnApplyHomescreenBg = document.getElementById('hud-btn-apply-homescreen-bg');
  if (hudBtnApplyHomescreenBg) {
    hudBtnApplyHomescreenBg.addEventListener('click', async () => {
      if (currentSettings.customBackgroundMode === 'url' && hudSettingBgUrl && hudSettingBgUrl.value.trim()) {
        currentSettings.customBackgroundUrl = hudSettingBgUrl.value.trim();
      }
      applyHomescreenBackground(currentSettings);
      updateHudBackgroundUI(currentSettings);
      await window.worldcraft.settings.save({
        customBackgroundMode: currentSettings.customBackgroundMode || 'default',
        customBackgroundUrl: currentSettings.customBackgroundUrl || '',
        customBackgroundLocal: currentSettings.customBackgroundLocal || ''
      });
      showToast('Hintergrundbild für New-Tab und Startseite aktiviert!', 'success');
    });
  }

  // 3. Standardsuchmaschine Dropdown & Card Sync
  const hudSettingSearchSelect = document.getElementById('hud-setting-search-select');
  if (hudSettingSearchSelect) {
    hudSettingSearchSelect.addEventListener('change', async () => {
      const engine = hudSettingSearchSelect.value;
      currentSettings.searchEngine = engine;
      document.querySelectorAll('.search-engine-card').forEach((c) => {
        c.classList.toggle('active', c.getAttribute('data-engine') === engine);
      });
      await window.worldcraft.settings.save({ searchEngine: engine });
      showToast(`Suchmaschine auf ${engine} gesetzt.`, 'success');
    });
  }

  // Language Flag Tile Selection (i18n)
  document.querySelectorAll('#modal-language-flags-grid .lang-flag-tile').forEach((tile) => {
    tile.addEventListener('click', async () => {
      const lang = tile.getAttribute('data-lang');
      if (!lang) return;
      currentSettings.language = lang;
      updateLanguageUI(lang);
      await window.worldcraft.settings.save({ language: lang });
      const langMeta = window.WORLDCRAFT_LANGUAGES && window.WORLDCRAFT_LANGUAGES[lang];
      showToast(`${t('settings_section_lang')}: ${langMeta ? langMeta.name : lang.toUpperCase()}`, 'success');

      // Re-evaluate translate banner for active tab if open
      const tabInfo = tabTranslationState[activeTabId];
      const currentTab = currentTabs.find((t) => t.id === activeTabId);
      if (currentTab && !currentTab.isHome && !currentTab.isForge && tabInfo && tabInfo.detectedLang) {
        if (tabInfo.detectedLang !== lang.toLowerCase()) {
          showTranslateBanner(tabInfo.detectedLang);
        } else {
          hideTranslateBanner();
        }
      }
    });
  });

  // Search Engine Card Selection
  document.querySelectorAll('.search-engine-card').forEach((card) => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.search-engine-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const engine = card.getAttribute('data-engine');
      currentSettings.searchEngine = engine;
      if (hudSettingSearchSelect) hudSettingSearchSelect.value = engine;
      await window.worldcraft.settings.save({ searchEngine: engine });
      showToast(`Suchmaschine auf ${card.querySelector('.search-card-name').textContent} gesetzt.`, 'success');
    });
  });

  // Multi-Provider Card Selection
  document.querySelectorAll('.provider-card').forEach((card) => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.provider-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const provider = card.getAttribute('data-provider');
      currentSettings.aiProvider = provider;
      const meta = PROVIDER_META[provider] || PROVIDER_META.google;
      const isPro = currentSettings.neuralCoreTier === 'pro';
      currentSettings.aiModel = isPro ? meta.proModel : meta.fastModel;
      currentSettings.geminiModel = currentSettings.aiModel;

      await window.worldcraft.settings.save({
        aiProvider: provider,
        aiModel: currentSettings.aiModel,
        geminiModel: currentSettings.geminiModel
      });
      await updateProviderUI(provider);
      showToast(`KI-Provider auf ${meta.name} umgestellt.`, 'info');
      checkAiStatus();
    });
  });

  // Neural Core Model Selection
  document.querySelectorAll('.neural-model-card').forEach((card) => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.neural-model-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const tier = card.getAttribute('data-model-tier');
      const provider = currentSettings.aiProvider || 'google';
      const meta = PROVIDER_META[provider] || PROVIDER_META.google;
      const model = tier === 'pro' ? meta.proModel : meta.fastModel;
      currentSettings.neuralCoreTier = tier;
      currentSettings.aiModel = model;
      currentSettings.geminiModel = model;
      await window.worldcraft.settings.save({
        neuralCoreTier: tier,
        aiModel: model,
        geminiModel: model
      });
      showToast(`Neural Core Modell: ${model}`, 'success');
      checkAiStatus();
    });
  });

  // 4. Password Eye Toggle
  const hudBtnToggleKeyVisibility = document.getElementById('hud-btn-toggle-key-visibility');
  if (hudBtnToggleKeyVisibility && settingNeuralKey) {
    hudBtnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = settingNeuralKey.type === 'password';
      settingNeuralKey.type = isPass ? 'text' : 'password';
      hudBtnToggleKeyVisibility.title = isPass ? 'Passwort verbergen' : 'Passwort anzeigen';
    });
  }

  // 5. Neural Key Test Button
  const hudBtnTestNeuralKey = document.getElementById('hud-btn-test-neural-key');
  const hudKeyTestFeedback = document.getElementById('hud-key-test-feedback');
  if (hudBtnTestNeuralKey) {
    hudBtnTestNeuralKey.addEventListener('click', async () => {
      const provider = currentSettings.aiProvider || 'google';
      const keyVal = settingNeuralKey ? settingNeuralKey.value.trim() : '';

      if (hudKeyTestFeedback) {
        hudKeyTestFeedback.className = 'key-test-feedback testing';
        hudKeyTestFeedback.textContent = t('settings_ai_test_testing') || 'Prüfe Verbindung...';
      }

      try {
        const res = await window.worldcraft.ai.testKey({ provider, key: keyVal });
        if (res && res.ok) {
          if (hudKeyTestFeedback) {
            hudKeyTestFeedback.className = 'key-test-feedback success';
            hudKeyTestFeedback.textContent = '✓ ' + (res.message || t('settings_ai_test_success') || 'Verbindung erfolgreich! Neural-Link bereit.');
          }
          updateHudAiStatus(true);
          showToast('Neural-Link Test erfolgreich!', 'success');
        } else {
          const errMsg = (res && res.error && (res.error.message || res.error.code)) || t('settings_ai_test_failed') || 'Verbindung fehlgeschlagen.';
          if (hudKeyTestFeedback) {
            hudKeyTestFeedback.className = 'key-test-feedback error';
            hudKeyTestFeedback.textContent = '✗ ' + errMsg;
          }
          showToast(errMsg, 'error');
        }
      } catch (err) {
        if (hudKeyTestFeedback) {
          hudKeyTestFeedback.className = 'key-test-feedback error';
          hudKeyTestFeedback.textContent = '✗ ' + err.message;
        }
        showToast(err.message, 'error');
      }
    });
  }

  // Save Neural Key
  if (btnSaveNeuralKey) {
    btnSaveNeuralKey.addEventListener('click', async () => {
      const key = settingNeuralKey ? settingNeuralKey.value.trim() : '';
      if (!key) {
        showToast('Bitte gib einen Schlüssel/Endpoint ein.', 'error');
        return;
      }
      const provider = currentSettings.aiProvider || 'google';
      const res = await window.worldcraft.ai.setProviderKey(provider, key);
      if (res && res.ok) {
        if (settingNeuralKey) {
          settingNeuralKey.value = '';
          settingNeuralKey.placeholder = '[ SCHLÜSSEL HINTERLEGT (KRYPTOGRAFISCH GESICHERT) ]';
        }
        updateHudAiStatus(true);
        showToast(`Neural-Link Schlüssel für ${provider.toUpperCase()} gespeichert!`, 'success');
        checkAiStatus();
      } else {
        showToast(res && res.error ? res.error.message : 'Fehler beim Speichern', 'error');
      }
    });
  }

  // Clear Neural Key
  if (btnClearNeuralKey) {
    btnClearNeuralKey.addEventListener('click', async () => {
      const provider = currentSettings.aiProvider || 'google';
      await window.worldcraft.ai.clearProviderKey(provider);
      const meta = PROVIDER_META[provider] || PROVIDER_META.google;
      if (settingNeuralKey) {
        settingNeuralKey.value = '';
        settingNeuralKey.placeholder = meta.placeholder;
      }
      updateHudAiStatus(false);
      showToast(`Schlüssel für ${provider.toUpperCase()} gelöscht.`, 'info');
      checkAiStatus();
    });
  }

  // Legacy API Key Buttons (fallback)
  if (btnSaveApiKey && settingGeminiKey) {
    btnSaveApiKey.addEventListener('click', async () => {
      const key = settingGeminiKey.value.trim();
      if (!key) {
        showToast('Bitte gib einen API-Key ein.', 'error');
        return;
      }
      const res = await window.worldcraft.ai.setApiKey(key, currentSettings.aiProvider || 'google');
      if (res && res.ok) {
        settingGeminiKey.value = '';
        showToast('API-Key sicher gespeichert.', 'success');
        checkAiStatus();
      } else {
        showToast(res.error.message, 'error');
      }
    });
  }

  if (btnClearApiKey && settingGeminiKey) {
    btnClearApiKey.addEventListener('click', async () => {
      await window.worldcraft.ai.clearApiKey(currentSettings.aiProvider || 'google');
      settingGeminiKey.value = '';
      showToast('API-Key gelöscht.', 'info');
      checkAiStatus();
    });
  }

  // Save Settings Button in HUD
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      await window.worldcraft.settings.save(currentSettings);
      btnSaveSettings.textContent = '[ EINSTELLUNGEN GESPEICHERT ]';
      setTimeout(() => {
        btnSaveSettings.textContent = '[ EINSTELLUNGEN SPEICHERN ]';
      }, 2000);
      showToast('Einstellungen erfolgreich gespeichert.', 'success');
    });
  }

  // Switches
  const bindSwitch = (element, key, onChange) => {
    if (!element) return;
    element.addEventListener('change', async () => {
      currentSettings[key] = element.checked;
      await window.worldcraft.settings.save({ [key]: element.checked });
      if (onChange) onChange(element.checked);
    });
  };

  bindSwitch(settingMatrixRain, 'matrixRain');

  bindSwitch(settingForceDark, 'forceDark', () => {
    showToast('Dark Mode Schalter aktualisiert. Bei manchen Seiten Neustart erforderlich.', 'info');
  });

  bindSwitch(settingBackgroundRadio, 'backgroundRadio');
  bindSwitch(settingAiStartup, 'aiOnStartup');
  bindSwitch(settingNotifyUpdates, 'notifyUpdates');
  bindSwitch(settingAnimatedDownloads, 'animatedDownloads');
}

/**
 * Event Listeners Initializer
 */
function setupEventListeners() {
  // Navigation
  btnNewTab.addEventListener('click', async () => {
    await window.worldcraft.tabs.create();
  });

  btnNavBack.addEventListener('click', async () => {
    if (activeTabId) await window.worldcraft.tabs.back(activeTabId);
  });

  btnNavForward.addEventListener('click', async () => {
    if (activeTabId) await window.worldcraft.tabs.forward(activeTabId);
  });

  btnNavReload.addEventListener('click', async () => {
    if (activeTabId) await window.worldcraft.tabs.reload(activeTabId);
  });

  // Intelligente Omnibox-Auflösung (URL vs. Websuche)
  function resolveOmniboxTarget(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';

    const lower = trimmed.toLowerCase();
    if (lower.startsWith('worldcraft://') || lower.startsWith('internal://')) {
      return trimmed;
    }
    if (lower === 'home' || lower === 'about:blank') {
      return 'internal://home';
    }
    if (lower === 'settings') return 'worldcraft://settings';
    if (lower === 'downloads') return 'internal://downloads';
    if (lower === 'radio') return 'internal://radio';
    if (lower === 'forge' || lower === 'dev-forge') return 'worldcraft://dev-forge';

    // Bereits Standard-Protokoll vorhanden
    if (/^https?:\/\//i.test(trimmed) || /^file:\/\//i.test(trimmed)) {
      return trimmed;
    }

    // Lokaler Windows-Pfad (z.B. C:\ oder C:/)
    if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
      return trimmed;
    }

    // Prüfung auf Domain: Keine Leerzeichen, enthält Domain-Muster (.com, .de, .org, localhost, IP usw.)
    const hasWhitespace = /\s/.test(trimmed);
    const isWww = lower.startsWith('www.');
    const isLocalhost = /^localhost(:\d+)?(\/.*)?$/i.test(trimmed);
    const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmed);
    const isDomainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed);

    if (!hasWhitespace && (isWww || isLocalhost || isIp || isDomainPattern)) {
      return `https://${trimmed}`;
    }

    // Keine URL -> Suchanfrage über Google ausführen
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  // URL Bar Navigation
  async function triggerNavigation(urlVal) {
    if (!urlVal || !urlVal.trim()) return;
    const resolved = resolveOmniboxTarget(urlVal);
    if (!resolved) return;

    if (resolved === 'internal://radio' || resolved === 'worldcraft://radio') {
      openModal(modalRadio);
      return;
    }
    if (resolved === 'internal://settings' || resolved === 'worldcraft://settings') {
      openSettingsTab();
      return;
    }
    if (resolved === 'internal://downloads' || resolved === 'worldcraft://downloads') {
      openDownloadsTab();
      return;
    }
    if (resolved === 'internal://home' || resolved === 'worldcraft://home') {
      if (activeTabId) await window.worldcraft.tabs.navigate(activeTabId, 'internal://home');
      return;
    }
    if (activeTabId) {
      const res = await window.worldcraft.tabs.navigate(activeTabId, resolved);
      if (!res.ok && res.error) {
        showToast(res.error.message, 'error');
      }
    } else {
      await window.worldcraft.tabs.create(resolved);
    }
  }

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      triggerNavigation(urlInput.value);
    }
  });

  btnUrlGo.addEventListener('click', () => {
    triggerNavigation(urlInput.value);
  });

  // Homescreen Search
  homeSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerNavigation(homeSearchInput.value);
  });

  // Pop-out Standalone App
  btnNavDetach.addEventListener('click', async () => {
    const currentTab = currentTabs.find((t) => t.id === activeTabId);
    if (currentTab && currentTab.url && !currentTab.isHome) {
      const res = await window.worldcraft.apps.detach(currentTab.url);
      if (res.ok) {
        showToast('Webseite in Standalone-Fenster ausgekoppelt.', 'success');
      } else {
        showToast(res.error.message, 'error');
      }
    } else {
      showToast('Nur geöffnete Webseiten können ausgekoppelt werden.', 'info');
    }
  });

  // Downloads Button & Navigation
  btnNavDownloads.addEventListener('click', (e) => {
    e.stopPropagation();
    openDownloadsTab();
  });

  if (btnClearDownloads) {
    btnClearDownloads.addEventListener('click', async () => {
      await window.worldcraft.downloads.clearCompleted();
      loadDownloads();
      showToast('Abgeschlossene Downloads geleert.', 'info');
    });
  }

  if (btnHudClearDownloads) {
    btnHudClearDownloads.addEventListener('click', async () => {
      await window.worldcraft.downloads.clearCompleted();
      loadDownloads();
      showToast('Abgeschlossene Downloads geleert.', 'info');
    });
  }

  // Sidebar Controls
  sideBtnHome.addEventListener('click', async () => {
    if (activeTabId) {
      await window.worldcraft.tabs.navigate(activeTabId, 'internal://home');
    }
  });

  sideBtnFavorites.addEventListener('click', () => openModal(modalFavorites));
  btnAddSpeedDial.addEventListener('click', () => openModal(modalFavorites));
  sideBtnRadio.addEventListener('click', () => openModal(modalRadio));
  sideBtnDownloads.addEventListener('click', (e) => {
    e.stopPropagation();
    openDownloadsTab();
  });
  if (sideBtnForge) {
    sideBtnForge.addEventListener('click', async () => {
      if (activeTabId) {
        await window.worldcraft.tabs.navigate(activeTabId, 'worldcraft://dev-forge');
      } else {
        await window.worldcraft.tabs.create('worldcraft://dev-forge');
      }
    });
  }
  sideBtnSettings.addEventListener('click', () => openSettingsTab());
  btnNavSettings.addEventListener('click', () => openSettingsTab());

  // Feedback & Bug Report Buttons
  if (btnNavFeedback) {
    btnNavFeedback.addEventListener('click', async () => {
      await window.worldcraft.tabs.create(FEEDBACK_URL);
    });
  }
  if (sideBtnFeedback) {
    sideBtnFeedback.addEventListener('click', async () => {
      await window.worldcraft.tabs.create(FEEDBACK_URL);
    });
  }
  if (btnSettingsHudFeedback) {
    btnSettingsHudFeedback.addEventListener('click', async () => {
      await window.worldcraft.tabs.create(FEEDBACK_URL);
    });
  }

  sideBtnAi.addEventListener('click', () => toggleAiPanel());
  btnNavAi.addEventListener('click', () => toggleAiPanel());
  fabAiToggle.addEventListener('click', () => toggleAiPanel());
  btnAiClose.addEventListener('click', () => toggleAiPanel(false));

  // AI Actions
  btnAiSummarize.addEventListener('click', summarizeCurrentPage);
  btnAiClear.addEventListener('click', () => {
    chatHistory = [];
    aiMessagesList.innerHTML = '';
    appendAiMessage('assistant', 'Chatverlauf geleert. Wie kann ich dir helfen?');
  });

  btnAiSend.addEventListener('click', sendAiMessage);
  aiInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  });

  // Settings Actions
  if (btnSaveApiKey && settingGeminiKey) {
    btnSaveApiKey.addEventListener('click', async () => {
      const key = settingGeminiKey.value.trim();
      if (!key) {
        showToast('Bitte gib einen API-Key ein.', 'error');
        return;
      }
      const res = await window.worldcraft.ai.setApiKey(key);
      if (res.ok) {
        settingGeminiKey.value = '';
        showToast('API-Key sicher im Betriebssystem gespeichert.', 'success');
        checkAiStatus();
      } else {
        showToast(res.error.message, 'error');
      }
    });
  }

  if (btnClearApiKey && settingGeminiKey) {
    btnClearApiKey.addEventListener('click', async () => {
      await window.worldcraft.ai.clearApiKey();
      settingGeminiKey.value = '';
      showToast('API-Key gelöscht.', 'info');
      checkAiStatus();
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      await window.worldcraft.settings.save(currentSettings);
      showToast('Einstellungen gespeichert.', 'success');
      closeModal(modalSettings);
    });
  }

  // Favorites Actions
  btnAddFavoriteSubmit.addEventListener('click', async () => {
    const title = favNewTitle.value.trim();
    let url = favNewUrl.value.trim();
    if (!title || !url) {
      showToast('Titel und URL sind erforderlich.', 'error');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('internal://') && !url.startsWith('worldcraft://')) {
      url = `https://${url}`;
    }
    const res = await window.worldcraft.favorites.add({ title, url });
    if (res.ok) {
      favNewTitle.value = '';
      favNewUrl.value = '';
      showToast('Favorit hinzugefügt.', 'success');
      loadFavorites();
    } else {
      showToast(res.error.message, 'error');
    }
  });

  // Translate Banner Actions
  if (btnTranslateConfirm) {
    btnTranslateConfirm.addEventListener('click', async () => {
      if (!activeTabId) return;
      const targetLang = currentSettings.language || 'de';
      btnTranslateConfirm.disabled = true;
      const prevText = btnTranslateConfirm.textContent;
      btnTranslateConfirm.textContent = t('translate_status_translating') || 'Übersetzung läuft...';

      try {
        const res = await window.worldcraft.tabs.translate(activeTabId, targetLang);
        btnTranslateConfirm.disabled = false;
        btnTranslateConfirm.textContent = prevText;
        if (res && res.ok) {
          tabTranslationState[activeTabId] = {
            ...(tabTranslationState[activeTabId] || {}),
            isTranslated: true
          };
          btnTranslateConfirm.classList.add('hidden');
          if (btnTranslateOriginal) btnTranslateOriginal.classList.remove('hidden');
          showToast('Webseite erfolgreich übersetzt.', 'success');
        } else {
          showToast('Übersetzung fehlgeschlagen.', 'error');
        }
      } catch (err) {
        btnTranslateConfirm.disabled = false;
        btnTranslateConfirm.textContent = prevText;
        showToast('Übersetzungsfehler: ' + err.message, 'error');
      }
    });
  }

  if (btnTranslateOriginal) {
    btnTranslateOriginal.addEventListener('click', async () => {
      if (!activeTabId) return;
      try {
        const res = await window.worldcraft.tabs.restoreTranslation(activeTabId);
        if (res && res.ok) {
          tabTranslationState[activeTabId] = {
            ...(tabTranslationState[activeTabId] || {}),
            isTranslated: false
          };
          btnTranslateOriginal.classList.add('hidden');
          if (btnTranslateConfirm) btnTranslateConfirm.classList.remove('hidden');
          showToast('Originalfassung wiederhergestellt.', 'info');
        }
      } catch (err) {
        showToast('Fehler: ' + err.message, 'error');
      }
    });
  }

  if (btnTranslateDismiss) {
    btnTranslateDismiss.addEventListener('click', () => {
      hideTranslateBanner();
    });
  }

  if (btnTranslateClose) {
    btnTranslateClose.addEventListener('click', () => {
      hideTranslateBanner();
    });
  }

  // Window Resize
  window.addEventListener('resize', () => {
    syncViewportBounds();
  });

  // Globales Abfangen aller Link-Klicks: Öffnet ausnahmslos als interner Worldcraft-Tab
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || anchor.href;
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    if (/^(https?|internal|worldcraft):/i.test(href)) {
      event.preventDefault();
      if (window.worldcraft && window.worldcraft.tabs && typeof window.worldcraft.tabs.create === 'function') {
        window.worldcraft.tabs.create(href);
      }
    }
  }, true);

  // Register Electron IPC Push Listeners
  if (window.worldcraft && window.worldcraft.events) {
    window.worldcraft.events.onTabsUpdated((state) => {
      renderTabs(state);
    });

    if (typeof window.worldcraft.events.onNavigationStateChanged === 'function') {
      window.worldcraft.events.onNavigationStateChanged(({ tabId, canGoBack, canGoForward }) => {
        if (tabId === activeTabId) {
          btnNavBack.disabled = !canGoBack;
          btnNavForward.disabled = !canGoForward;
        }
      });
    }

    window.worldcraft.events.onActivePageChanged(({ tabId, url }) => {
      if (tabId === activeTabId) {
        if (url) urlInput.value = url;
        syncViewportBounds();
      }
    });

    window.worldcraft.events.onAiStatus(() => {
      checkAiStatus();
    });

    // Downloads listeners
    window.worldcraft.events.onDownloadsUpdated((dl) => {
      const idx = currentDownloads.findIndex((d) => d.id === dl.id);
      if (idx !== -1) {
        currentDownloads[idx] = { ...currentDownloads[idx], ...dl };
      } else {
        currentDownloads.unshift({ ...dl });
      }
      renderDownloadsList();
    });

    window.worldcraft.events.onDownloadDone((dl) => {
      const idx = currentDownloads.findIndex((d) => d.id === dl.id);
      if (idx !== -1) {
        currentDownloads[idx] = { ...currentDownloads[idx], ...dl, pulse: true };
      } else {
        currentDownloads.unshift({ ...dl, pulse: true });
      }
      renderDownloadsList();
      if (dl.state === 'completed') {
        showToast(`Download abgeschlossen: ${dl.fileName}`, 'success');
      }
    });

    if (window.worldcraft.events.onRadioOpenModal) {
      window.worldcraft.events.onRadioOpenModal(() => {
        openModal(modalRadio);
      });
    }

    if (window.worldcraft.events.onPageLanguageDetected) {
      window.worldcraft.events.onPageLanguageDetected(({ tabId, url, lang }) => {
        if (!lang) return;
        const cleanLang = lang.split('-')[0].split('_')[0].toLowerCase();
        tabTranslationState[tabId] = {
          ...(tabTranslationState[tabId] || {}),
          detectedLang: cleanLang
        };

        const currentTab = currentTabs.find((t) => t.id === tabId);
        if (!currentTab || currentTab.isHome || currentTab.isForge) return;

        const userLang = (currentSettings.language || 'de').toLowerCase();
        if (tabId === activeTabId && cleanLang !== userLang) {
          showTranslateBanner(cleanLang);
        }
      });
    }

    if (window.worldcraft.events.onViewFocused) {
      window.worldcraft.events.onViewFocused(() => {
        if (downloadsDropdown && downloadsDropdown.classList.contains('open')) {
          downloadsDropdown.classList.remove('open');
          handleDownloadsDropdownState(false);
        }
      });
    }

    if (window.worldcraft.events.onSettingsUpdated) {
      window.worldcraft.events.onSettingsUpdated((newSettings) => {
        currentSettings = { ...currentSettings, ...newSettings };
        applySettingsToUI(currentSettings);
        applyHomescreenBackground(currentSettings);
      });
    }

    if (window.worldcraft.events.onToggleBrowserUi) {
      window.worldcraft.events.onToggleBrowserUi((visible) => {
        if (!visible) {
          document.body.classList.add('fullscreen-mode');
        } else {
          document.body.classList.remove('fullscreen-mode');
        }
        syncViewportBounds();
      });
    }

    if (window.worldcraft.events.onFocusUrlInput) {
      window.worldcraft.events.onFocusUrlInput(() => {
        if (urlInput) {
          urlInput.focus();
          urlInput.select();
        }
      });
    }
  }
}

/**
 * OBS OVERLAYS FORGE CONTROLLER
 */
function setupForge() {
  // Preset Chips
  document.querySelectorAll('.forge-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      const name = chip.getAttribute('data-name');
      if (forgeWidgetName) forgeWidgetName.value = name || '';
      if (forgePromptInput) forgePromptInput.value = prompt || '';
      showToast(`Preset geladen: ${chip.textContent.trim()}`, 'info');
    });
  });

  // Synthesize / Compile Button
  if (btnForgeSynthesize) {
    btnForgeSynthesize.addEventListener('click', async () => {
      const name = (forgeWidgetName ? forgeWidgetName.value : '') || `widget-${Date.now()}`;
      const prompt = (forgePromptInput ? forgePromptInput.value : '').trim();
      if (!prompt) {
        showToast('Bitte beschreibe das gewünschte OBS-Overlay.', 'error');
        return;
      }

      btnForgeSynthesize.disabled = true;
      if (forgeTerminalLog) forgeTerminalLog.classList.remove('hidden');
      if (forgeWidgetStatusBadge) {
        forgeWidgetStatusBadge.textContent = 'SYNTHESIZING...';
        forgeWidgetStatusBadge.classList.add('loading');
      }

      try {
        const res = await window.worldcraft.forge.generate({ name, prompt });
        btnForgeSynthesize.disabled = false;

        if (res && res.ok) {
          if (forgeOutputUrl) forgeOutputUrl.value = res.data.obsUrl;
          if (forgePreviewFrame) forgePreviewFrame.src = res.data.obsUrl;
          if (forgeWidgetStatusBadge) {
            forgeWidgetStatusBadge.textContent = '[ SYNTHESIS ONLINE ]';
            forgeWidgetStatusBadge.classList.remove('loading');
          }
          showToast(`OBS Widget "${res.data.name}" erfolgreich generiert!`, 'success');
          loadForgeWidgets();
        } else {
          if (forgeWidgetStatusBadge) {
            forgeWidgetStatusBadge.textContent = 'FEHLER';
            forgeWidgetStatusBadge.classList.remove('loading');
          }
          if (res && res.error && res.error.code === 'NO_API_KEY') {
            showToast('Kein API-Key hinterlegt! Bitte in Einstellungen konfigurieren.', 'error');
            openModal(modalSettings);
          } else {
            showToast(`Forge-Fehler: ${res && res.error ? res.error.message : 'Unbekannt'}`, 'error');
          }
        }
      } catch (err) {
        btnForgeSynthesize.disabled = false;
        if (forgeWidgetStatusBadge) {
          forgeWidgetStatusBadge.textContent = 'FEHLER';
          forgeWidgetStatusBadge.classList.remove('loading');
        }
        showToast(`Synthese-Fehler: ${err.message}`, 'error');
      }
    });
  }

  // Copy OBS Browser Source URL Button
  if (btnCopyObsUrl) {
    btnCopyObsUrl.addEventListener('click', async () => {
      const url = forgeOutputUrl ? forgeOutputUrl.value : '';
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        showToast('OBS Browser Source URL kopiert: ' + url, 'success');
      } catch (e) {
        if (forgeOutputUrl) {
          forgeOutputUrl.select();
          document.execCommand('copy');
        }
        showToast('OBS URL kopiert!', 'success');
      }
    });
  }

  // Reload Preview
  if (btnReloadPreview) {
    btnReloadPreview.addEventListener('click', () => {
      if (forgePreviewFrame && forgeOutputUrl && forgeOutputUrl.value) {
        const urlStr = forgeOutputUrl.value;
        const u = new URL(urlStr);
        u.searchParams.set('t', Date.now().toString());
        forgePreviewFrame.src = u.toString();
      }
    });
  }

  // Open Preview in New Tab
  if (btnOpenPreviewTab) {
    btnOpenPreviewTab.addEventListener('click', async () => {
      if (forgeOutputUrl && forgeOutputUrl.value) {
        await window.worldcraft.tabs.create(forgeOutputUrl.value);
      }
    });
  }

  // Refresh Widgets Button
  if (btnRefreshWidgets) {
    btnRefreshWidgets.addEventListener('click', loadForgeWidgets);
  }
}

async function loadForgeWidgets() {
  if (!forgeWidgetsList || !window.worldcraft || !window.worldcraft.forge) return;
  try {
    const res = await window.worldcraft.forge.list();
    if (!res || !res.ok) return;
    const list = res.data || [];
    if (list.length === 0) {
      forgeWidgetsList.innerHTML = '<div style="color:var(--text-muted); font-size:11px; padding:10px;">Noch keine Overlays generiert.</div>';
      return;
    }
    forgeWidgetsList.innerHTML = '';
    list.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'forge-widget-item';
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:4px; margin-bottom:6px;';

      const title = document.createElement('div');
      title.style.cssText = 'cursor:pointer; overflow:hidden;';
      title.innerHTML = `<strong>${item.name}</strong> <span style="font-size:10px; color:var(--text-muted);">(${item.obsUrl})</span>`;
      title.addEventListener('click', () => {
        if (forgeOutputUrl) forgeOutputUrl.value = item.obsUrl;
        if (forgePreviewFrame) forgePreviewFrame.src = item.obsUrl;
        if (forgeWidgetName) forgeWidgetName.value = item.name;
        showToast(`Widget geladen: ${item.name}`, 'info');
      });

      const del = document.createElement('button');
      del.className = 'btn-secondary';
      del.style.cssText = 'padding:2px 8px; font-size:10px; color:#ff7777;';
      del.textContent = 'Löschen';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.worldcraft.forge.delete(item.name);
        loadForgeWidgets();
        showToast(`Widget "${item.name}" gelöscht.`, 'info');
      });

      row.appendChild(title);
      row.appendChild(del);
      forgeWidgetsList.appendChild(row);
    });
  } catch (err) {
    console.error('Failed to load forge widgets:', err);
  }
}

/**
 * Bootstrap Application
 */
async function initApp() {
  setupEventListeners();
  setupSettingsInteractivity();
  setupForge();
  startClock();

  await loadSettings();
  await loadFavorites();
  await initRadio();
  await checkAiStatus();
  await loadDownloads();
  await loadForgeWidgets();
  initUpdater();

  // If user configured AI on startup
  if (currentSettings.aiOnStartup) {
    toggleAiPanel(true);
  }

  // Initial tab state sync
  if (window.worldcraft && window.worldcraft.tabs) {
    const stateRes = await window.worldcraft.tabs.getState();
    if (stateRes && stateRes.ok) {
      renderTabs(stateRes.data);
    }
  }

  syncViewportBounds();
}

window.addEventListener('DOMContentLoaded', initApp);
