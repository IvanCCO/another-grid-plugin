import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  STORAGE_KEY,
  normalizeSettings,
} from './utils';

function ensureDefaultSettings(): void {
  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    const settings = normalizeSettings(result[STORAGE_KEY]);
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  });
}

function isSupportedTab(tab: chrome.tabs.Tab): boolean {
  return typeof tab.id === 'number' && /^https?:\/\//.test(tab.url ?? '');
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  ensureDefaultSettings();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('[Grid Systems Overlay] Extension installed.');
  } else if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    console.log('[Grid Systems Overlay] Extension updated.');
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (!isSupportedTab(tab)) {
    return;
  }

  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    const currentSettings = normalizeSettings(result[STORAGE_KEY]);
    const nextSettings = normalizeSettings({
      ...currentSettings,
      enabled: !currentSettings.enabled,
    });

    chrome.storage.sync.set({ [STORAGE_KEY]: nextSettings }, () => {
      chrome.tabs
        .sendMessage(tab.id!, {
          type: GRID_MESSAGE_TYPE,
          settings: nextSettings,
        })
        .catch(() => undefined);
    });
  });
});
