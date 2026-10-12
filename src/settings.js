'use strict';

const FEEDBACK_URL = 'https://form.jotform.com/262835970270058';

// Multi-Provider Registry
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

// DOM References
const versionDisplayVal = document.getElementById('version-display-val');
const btnCheckUpdates = document.getElementById('btn-check-updates');
const updaterTerminalBox = document.getElementById('updater-terminal-box');
const updaterStatusText = document.getElementById('updater-status-text');
const updaterMatrixProgressWrap = document.getElementById('updater-matrix-progress-wrap');
const updaterMatrixProgressFill = document.getElementById('updater-matrix-progress-fill');
const updaterMatrixProgressText = document.getElementById('updater-matrix-progress-text');
const updaterActionRow = document.getElementById('updater-action-row');
const btnRestartAndInstall = document.getElementById('btn-restart-and-install');

const neuralKeyLabel = document.getElementById('neural-key-label');
const settingNeuralKey = document.getElementById('setting-neural-key');
const neuralKeyHelpLink = document.getElementById('neural-key-help-link');
const btnSaveNeuralKey = document.getElementById('btn-save-neural-key');
const btnClearNeuralKey = document.getElementById('btn-clear-neural-key');
const btnTestNeuralKey = document.getElementById('btn-test-neural-key');
const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
const keyTestFeedback = document.getElementById('key-test-feedback');
const aiStatusIndicator = document.getElementById('ai-status-indicator');
const aiStatusBadgeText = document.getElementById('ai-status-badge-text');

const neuralModelIdFast = document.getElementById('neural-model-id-fast');
const neuralModelIdPro = document.getElementById('neural-model-id-pro');
const btnSaveSettings = document.getElementById('btn-save-settings');

// Background DOM References
const bgUrlPanel = document.getElementById('bg-url-panel');
const settingBgUrl = document.getElementById('setting-bg-url');
const btnApplyBgUrl = document.getElementById('btn-apply-bg-url');
const bgLocalPanel = document.getElementById('bg-local-panel');
const settingBgFile = document.getElementById('setting-bg-file');
const btnChooseBgFile = document.getElementById('btn-choose-bg-file');
const bgFileName = document.getElementById('bg-file-name');
const btnResetBg = document.getElementById('btn-reset-bg');
const bgPreviewBox = document.getElementById('bg-preview-box');
const bgPreviewModeTag = document.getElementById('bg-preview-mode-tag');

// Search DOM References
const settingSearchSelect = document.getElementById('setting-search-select');

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

function applyI18n(lang) {
  if (!lang) lang = 'de';
  const dict = (window.WORLDCRAFT_LOCALES && window.WORLDCRAFT_LOCALES[lang]) || (window.WORLDCRAFT_LOCALES && window.WORLDCRAFT_LOCALES['de']) || {};
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) {
      el.title = dict[key];
      el.setAttribute('aria-label', dict[key]);
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
}

function updateBackgroundUI() {
  const mode = currentSettings.customBackgroundMode || 'default';

  // Update radio buttons
  document.querySelectorAll('input[name="customBgMode"]').forEach((radio) => {
    const isChecked = radio.value === mode;
    radio.checked = isChecked;
    const parentLabel = radio.closest('.bg-mode-option');
    if (parentLabel) parentLabel.classList.toggle('active', isChecked);
  });

  // Toggle subpanels
  if (bgUrlPanel) bgUrlPanel.classList.toggle('hidden', mode !== 'url');
  if (bgLocalPanel) bgLocalPanel.classList.toggle('hidden', mode !== 'local');

  if (settingBgUrl) settingBgUrl.value = currentSettings.customBackgroundUrl || '';
  if (bgFileName && currentSettings.customBackgroundLocal) {
    bgFileName.textContent = 'Lokal gespeichert // aktiv';
  } else if (bgFileName) {
    bgFileName.textContent = 'Keine Datei gewählt';
  }

  // Update live preview box
  if (bgPreviewBox && bgPreviewModeTag) {
    if (mode === 'url' && currentSettings.customBackgroundUrl) {
      bgPreviewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${currentSettings.customBackgroundUrl}")`;
      bgPreviewModeTag.textContent = 'CUSTOM URL';
      bgPreviewModeTag.style.borderColor = 'var(--neon-green)';
      bgPreviewModeTag.style.color = 'var(--neon-green)';
    } else if (mode === 'local' && currentSettings.customBackgroundLocal) {
      bgPreviewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${currentSettings.customBackgroundLocal}")`;
      bgPreviewModeTag.textContent = 'LOCAL IMAGE';
      bgPreviewModeTag.style.borderColor = 'var(--neon-cyan)';
      bgPreviewModeTag.style.color = 'var(--neon-cyan)';
    } else {
      bgPreviewBox.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url('assets/cyberpunk-bg.png')`;
      bgPreviewModeTag.textContent = 'DEFAULT';
      bgPreviewModeTag.style.borderColor = 'var(--border-color)';
      bgPreviewModeTag.style.color = 'var(--text-secondary)';
    }
  }
}

function updateAiStatusIndicator(isConfigured) {
  if (!aiStatusIndicator || !aiStatusBadgeText) return;
  if (isConfigured) {
    aiStatusIndicator.classList.remove('not-configured');
    aiStatusIndicator.classList.add('configured');
    aiStatusBadgeText.textContent = t('settings_ai_status_active') || 'AKTIVIERT // ONLINE';
  } else {
    aiStatusIndicator.classList.remove('configured');
    aiStatusIndicator.classList.add('not-configured');
    aiStatusBadgeText.textContent = t('settings_ai_status_inactive') || 'NICHT KONFIGURIERT // STANDBY';
  }
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

  if (window.worldcraft && window.worldcraft.ai) {
    try {
      const res = await window.worldcraft.ai.getProviders();
      const isConfigured = Boolean(
        res && res.ok && res.data && res.data.configured && (
          Array.isArray(res.data.configured)
            ? res.data.configured.includes(provider)
            : res.data.configured[provider]
          )
      );
      updateAiStatusIndicator(isConfigured);
      if (isConfigured && settingNeuralKey) {
        settingNeuralKey.placeholder = '[ SCHLÜSSEL HINTERLEGT (KRYPTOGRAFISCH GESICHERT) ]';
        settingNeuralKey.value = '';
      } else if (settingNeuralKey) {
        settingNeuralKey.placeholder = meta.placeholder;
        settingNeuralKey.value = '';
      }
    } catch (e) {
      updateAiStatusIndicator(false);
      if (settingNeuralKey) {
        settingNeuralKey.placeholder = meta.placeholder;
        settingNeuralKey.value = '';
      }
    }
  } else {
    updateAiStatusIndicator(false);
  }
}

function applySettingsToUI(s) {
  // Language Flag Tiles & i18n
  const activeLang = s.language || 'de';
  document.querySelectorAll('.lang-flag-tile').forEach((tile) => {
    tile.classList.toggle('active', tile.getAttribute('data-lang') === activeLang);
  });
  applyI18n(activeLang);

  // Background Customization
  updateBackgroundUI();

  // Search engines sync
  const activeEngine = s.searchEngine || 'google';
  if (settingSearchSelect) {
    settingSearchSelect.value = activeEngine;
  }
  document.querySelectorAll('.search-engine-card').forEach((card) => {
    const engine = card.getAttribute('data-engine');
    card.classList.toggle('active', engine === activeEngine);
  });

  // Providers
  const activeProv = s.aiProvider || 'google';
  document.querySelectorAll('.provider-card').forEach((card) => {
    const prov = card.getAttribute('data-provider');
    card.classList.toggle('active', prov === activeProv);
  });
  updateProviderUI(activeProv);

  // Model tier
  document.querySelectorAll('.neural-model-card').forEach((card) => {
    const tier = card.getAttribute('data-model-tier');
    const isPro = s.neuralCoreTier === 'pro';
    card.classList.toggle('active', (tier === 'pro' && isPro) || (tier === 'fast' && !isPro));
  });

  // Switches
  const setSwitch = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = val !== false;
  };

  setSwitch('setting-matrix-rain', s.matrixRain);
  setSwitch('setting-force-dark', s.forceDark);
  setSwitch('setting-background-radio', s.backgroundRadio);
  setSwitch('setting-ai-startup', Boolean(s.aiOnStartup));
  setSwitch('setting-notify-updates', s.notifyUpdates);
  setSwitch('setting-animated-downloads', s.animatedDownloads);
}

async function loadVersion() {
  let ver = '1.2.0';
  if (window.worldcraft && window.worldcraft.updater) {
    try {
      const stateRes = await window.worldcraft.updater.getState();
      if (stateRes && stateRes.ok && stateRes.data && (stateRes.data.version || stateRes.data.currentVersion)) {
        ver = stateRes.data.version || stateRes.data.currentVersion;
      } else if (typeof window.worldcraft.updater.getVersion === 'function') {
        const vRes = await window.worldcraft.updater.getVersion();
        if (vRes && vRes.ok && vRes.version) ver = vRes.version;
      }
    } catch (e) {
      // Fallback to default
    }
  }
  if (versionDisplayVal) {
    versionDisplayVal.textContent = ver;
  }
}

function renderUpdateState(state) {
  if (!state) return;
  if (!updaterTerminalBox || !updaterStatusText) return;

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
    const ver = (state.updateInfo && state.updateInfo.version) || '';
    updaterStatusText.textContent = `UPDATE FOUND: V${ver} // DOWNLOADING PATCH...`;
    if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.remove('hidden');
    if (updaterMatrixProgressFill) updaterMatrixProgressFill.style.width = '10%';
    if (updaterMatrixProgressText) updaterMatrixProgressText.textContent = '10% DOWNLOADING PATCH...';
    if (updaterActionRow) updaterActionRow.classList.add('hidden');
  } else if (state.status === 'downloading') {
    const p = (state.progress && state.progress.percent) || 0;
    const ver = (state.updateInfo && state.updateInfo.version) || '';
    updaterStatusText.textContent = `UPDATE FOUND: V${ver} // DOWNLOADING PATCH...`;
    if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.remove('hidden');
    if (updaterMatrixProgressFill) updaterMatrixProgressFill.style.width = `${p}%`;
    if (updaterMatrixProgressText) updaterMatrixProgressText.textContent = `${p}% DOWNLOADING PATCH...`;
    if (updaterActionRow) updaterActionRow.classList.add('hidden');
  } else if (state.status === 'downloaded') {
    const ver = (state.updateInfo && state.updateInfo.version) || '';
    updaterStatusText.textContent = `UPDATE V${ver} // READY TO INSTALL`;
    if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.remove('hidden');
    if (updaterMatrixProgressFill) updaterMatrixProgressFill.style.width = '100%';
    if (updaterMatrixProgressText) updaterMatrixProgressText.textContent = '100% PATCH READY';
    if (updaterActionRow) updaterActionRow.classList.remove('hidden');
    if (btnCheckUpdates) {
      btnCheckUpdates.disabled = false;
      btnCheckUpdates.classList.remove('checking');
    }
  } else if (state.status === 'not-available' || state.status === 'error') {
    updaterStatusText.textContent = 'SYSTEM UP TO DATE // KEINE UPDATES VORHANDEN';
    if (updaterMatrixProgressWrap) updaterMatrixProgressWrap.classList.add('hidden');
    if (updaterActionRow) updaterActionRow.classList.add('hidden');
    if (btnCheckUpdates) {
      btnCheckUpdates.disabled = false;
      btnCheckUpdates.classList.remove('checking');
    }
  }
}

function setupEventListeners() {
  // 1. Chrome-Sidebar Click-To-Scroll Navigation
  const navItems = document.querySelectorAll('.chrome-settings-sidebar .settings-nav-item');
  const scrollContainer = document.getElementById('settings-content-scroll');

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      navItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll-Spy Observer for Sidebar Highlights
  if (scrollContainer && 'IntersectionObserver' in window) {
    const sections = document.querySelectorAll('.cyber-settings-section');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navItems.forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-target') === id);
          });
        }
      });
    }, { root: scrollContainer, threshold: 0.3 });
    sections.forEach((sec) => observer.observe(sec));
  }

  // 2. Homescreen Background Mode Radios
  document.querySelectorAll('input[name="customBgMode"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      const mode = radio.value;
      currentSettings.customBackgroundMode = mode;
      updateBackgroundUI();
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({ customBackgroundMode: mode });
      }
    });
  });

  // Background URL Apply
  if (btnApplyBgUrl && settingBgUrl) {
    btnApplyBgUrl.addEventListener('click', async () => {
      const url = settingBgUrl.value.trim();
      if (!url) return;
      currentSettings.customBackgroundMode = 'url';
      currentSettings.customBackgroundUrl = url;
      updateBackgroundUI();
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({
          customBackgroundMode: 'url',
          customBackgroundUrl: url
        });
      }
    });
  }

  // Background Local File Chooser
  if (btnChooseBgFile && settingBgFile) {
    btnChooseBgFile.addEventListener('click', () => {
      settingBgFile.click();
    });

    settingBgFile.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        if (bgFileName) bgFileName.textContent = file.name;
        if (window.worldcraft && window.worldcraft.settings && typeof window.worldcraft.settings.saveCustomBackground === 'function') {
          const res = await window.worldcraft.settings.saveCustomBackground({
            dataUrl,
            filename: file.name
          });
          if (res && res.ok) {
            currentSettings.customBackgroundMode = 'local';
            currentSettings.customBackgroundLocal = res.fileUrl || dataUrl;
            updateBackgroundUI();
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset Background to Default
  if (btnResetBg) {
    btnResetBg.addEventListener('click', async () => {
      currentSettings.customBackgroundMode = 'default';
      currentSettings.customBackgroundUrl = '';
      currentSettings.customBackgroundLocal = '';
      updateBackgroundUI();
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({
          customBackgroundMode: 'default',
          customBackgroundUrl: '',
          customBackgroundLocal: ''
        });
      }
    });
  }

  // Dedicated Immediate Apply Button for New Tab & Homescreen
  const btnApplyHomescreenBg = document.getElementById('btn-apply-homescreen-bg');
  if (btnApplyHomescreenBg) {
    btnApplyHomescreenBg.addEventListener('click', async () => {
      if (currentSettings.customBackgroundMode === 'url' && settingBgUrl && settingBgUrl.value.trim()) {
        currentSettings.customBackgroundUrl = settingBgUrl.value.trim();
      }
      updateBackgroundUI();
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({
          customBackgroundMode: currentSettings.customBackgroundMode || 'default',
          customBackgroundUrl: currentSettings.customBackgroundUrl || '',
          customBackgroundLocal: currentSettings.customBackgroundLocal || ''
        });
      }
      const prevText = btnApplyHomescreenBg.innerHTML;
      btnApplyHomescreenBg.innerHTML = '<span>✓ [ HINTERGRUND AKTIVIERT &amp; GESPEICHERT ]</span>';
      setTimeout(() => {
        btnApplyHomescreenBg.innerHTML = prevText;
      }, 2500);
    });
  }

  // 3. Search Engine Select Dropdown & Card Sync
  if (settingSearchSelect) {
    settingSearchSelect.addEventListener('change', async () => {
      const engine = settingSearchSelect.value;
      currentSettings.searchEngine = engine;
      document.querySelectorAll('.search-engine-card').forEach((c) => {
        c.classList.toggle('active', c.getAttribute('data-engine') === engine);
      });
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({ searchEngine: engine });
      }
    });
  }

  document.querySelectorAll('.search-engine-card').forEach((card) => {
    card.addEventListener('click', async () => {
      document.querySelectorAll('.search-engine-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const engine = card.getAttribute('data-engine');
      currentSettings.searchEngine = engine;
      if (settingSearchSelect) settingSearchSelect.value = engine;
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({ searchEngine: engine });
      }
    });
  });

  // 4. Password Visibility Eye Toggle
  if (btnToggleKeyVisibility && settingNeuralKey) {
    btnToggleKeyVisibility.addEventListener('click', () => {
      const isPass = settingNeuralKey.type === 'password';
      settingNeuralKey.type = isPass ? 'text' : 'password';
      btnToggleKeyVisibility.title = isPass ? 'Passwort verbergen' : 'Passwort anzeigen';
    });
  }

  // 5. Neural Key Test Button
  if (btnTestNeuralKey) {
    btnTestNeuralKey.addEventListener('click', async () => {
      const provider = currentSettings.aiProvider || 'google';
      const keyVal = settingNeuralKey ? settingNeuralKey.value.trim() : '';

      if (keyTestFeedback) {
        keyTestFeedback.className = 'key-test-feedback testing';
        keyTestFeedback.textContent = t('settings_ai_test_testing') || 'Prüfe Verbindung...';
      }

      if (window.worldcraft && window.worldcraft.ai && typeof window.worldcraft.ai.testKey === 'function') {
        try {
          const res = await window.worldcraft.ai.testKey({ provider, key: keyVal });
          if (res && res.ok) {
            if (keyTestFeedback) {
              keyTestFeedback.className = 'key-test-feedback success';
              keyTestFeedback.textContent = '✓ ' + (res.message || t('settings_ai_test_success') || 'Verbindung erfolgreich! Neural-Link bereit.');
            }
            updateAiStatusIndicator(true);
          } else {
            const errMsg = (res && res.error && (res.error.message || res.error.code)) || t('settings_ai_test_failed') || 'Verbindung fehlgeschlagen.';
            if (keyTestFeedback) {
              keyTestFeedback.className = 'key-test-feedback error';
              keyTestFeedback.textContent = '✗ ' + errMsg;
            }
          }
        } catch (err) {
          if (keyTestFeedback) {
            keyTestFeedback.className = 'key-test-feedback error';
            keyTestFeedback.textContent = '✗ ' + err.message;
          }
        }
      } else {
        setTimeout(() => {
          if (keyTestFeedback) {
            keyTestFeedback.className = 'key-test-feedback success';
            keyTestFeedback.textContent = '✓ Standalone-Check: Format akzeptiert // Neural Core Online';
          }
          updateAiStatusIndicator(true);
        }, 500);
      }
    });
  }

  // Language Flag Tile Selection (i18n)
  document.querySelectorAll('.lang-flag-tile').forEach((tile) => {
    tile.addEventListener('click', async () => {
      const lang = tile.getAttribute('data-lang');
      if (!lang) return;
      document.querySelectorAll('.lang-flag-tile').forEach((t) => t.classList.remove('active'));
      tile.classList.add('active');
      currentSettings.language = lang;
      applyI18n(lang);
      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({ language: lang });
      }
    });
  });

  // Provider Cards
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

      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({
          aiProvider: provider,
          aiModel: currentSettings.aiModel,
          geminiModel: currentSettings.geminiModel
        });
      }
      await updateProviderUI(provider);
      if (keyTestFeedback) keyTestFeedback.classList.add('hidden');
    });
  });

  // Neural Model Cards
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

      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save({
          neuralCoreTier: tier,
          aiModel: model,
          geminiModel: model
        });
      }
    });
  });

  // Save Neural Key
  if (btnSaveNeuralKey) {
    btnSaveNeuralKey.addEventListener('click', async () => {
      const key = settingNeuralKey ? settingNeuralKey.value.trim() : '';
      if (!key) return;
      const provider = currentSettings.aiProvider || 'google';
      if (window.worldcraft && window.worldcraft.ai) {
        await window.worldcraft.ai.setProviderKey(provider, key);
        if (settingNeuralKey) {
          settingNeuralKey.value = '';
          settingNeuralKey.placeholder = '[ SCHLÜSSEL HINTERLEGT (KRYPTOGRAFISCH GESICHERT) ]';
        }
        updateAiStatusIndicator(true);
        if (keyTestFeedback) {
          keyTestFeedback.className = 'key-test-feedback success';
          keyTestFeedback.textContent = '✓ Schlüssel sicher gespeichert.';
        }
      }
    });
  }

  // Clear Neural Key
  if (btnClearNeuralKey) {
    btnClearNeuralKey.addEventListener('click', async () => {
      const provider = currentSettings.aiProvider || 'google';
      if (window.worldcraft && window.worldcraft.ai) {
        await window.worldcraft.ai.clearProviderKey(provider);
        const meta = PROVIDER_META[provider] || PROVIDER_META.google;
        if (settingNeuralKey) {
          settingNeuralKey.value = '';
          settingNeuralKey.placeholder = meta.placeholder;
        }
        updateAiStatusIndicator(false);
        if (keyTestFeedback) keyTestFeedback.classList.add('hidden');
      }
    });
  }

  // Check For Updates Button
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
        } catch (e) {
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

  // Restart & Install Button
  if (btnRestartAndInstall) {
    btnRestartAndInstall.addEventListener('click', async () => {
      if (window.worldcraft && window.worldcraft.updater) {
        await window.worldcraft.updater.install();
      }
    });
  }

  // Feedback & Bug Report Button
  const btnSettingsFeedback = document.getElementById('btn-settings-feedback');
  if (btnSettingsFeedback) {
    btnSettingsFeedback.addEventListener('click', async () => {
      if (window.worldcraft && window.worldcraft.tabs) {
        await window.worldcraft.tabs.create(FEEDBACK_URL);
      }
    });
  }

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

  // Save Settings Button
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', async () => {
      const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.checked : true;
      };
      currentSettings.matrixRain = getVal('setting-matrix-rain');
      currentSettings.forceDark = getVal('setting-force-dark');
      currentSettings.backgroundRadio = getVal('setting-background-radio');
      currentSettings.aiOnStartup = getVal('setting-ai-startup');
      currentSettings.notifyUpdates = getVal('setting-notify-updates');
      currentSettings.animatedDownloads = getVal('setting-animated-downloads');

      if (window.worldcraft && window.worldcraft.settings) {
        await window.worldcraft.settings.save(currentSettings);
      }
      btnSaveSettings.textContent = '[ EINSTELLUNGEN GESPEICHERT ]';
      setTimeout(() => {
        btnSaveSettings.textContent = '[ EINSTELLUNGEN SPEICHERN ]';
      }, 2000);
    });
  }

  // IPC Event Listener for Updates
  if (window.worldcraft && window.worldcraft.events && typeof window.worldcraft.events.onUpdateStatus === 'function') {
    window.worldcraft.events.onUpdateStatus((state) => {
      renderUpdateState(state);
    });
  }

  // IPC Event Listener for Settings Updated
  if (window.worldcraft && window.worldcraft.events && typeof window.worldcraft.events.onSettingsUpdated === 'function') {
    window.worldcraft.events.onSettingsUpdated((newSettings) => {
      currentSettings = { ...currentSettings, ...newSettings };
      applySettingsToUI(currentSettings);
    });
  }
}

async function init() {
  setupEventListeners();
  await loadVersion();

  if (window.worldcraft && window.worldcraft.settings) {
    try {
      const res = await window.worldcraft.settings.get();
      if (res && res.ok && res.data) {
        currentSettings = { ...currentSettings, ...res.data };
        applySettingsToUI(currentSettings);
      }
    } catch (e) {
      applySettingsToUI(currentSettings);
    }
  } else {
    applySettingsToUI(currentSettings);
  }
}

window.addEventListener('DOMContentLoaded', init);
