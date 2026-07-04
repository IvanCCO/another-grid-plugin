import {
  DEFAULT_SETTINGS,
  GRID_MESSAGE_TYPE,
  STORAGE_KEY,
  normalizeSettings,
} from './utils';
import {
  getActivePattern,
  getSiteState,
  getSiteStorageKey,
  normalizeGridStorage,
  setSiteState,
  updateActivePatternSettings,
} from './site-patterns';

function ensureDefaultSettings(): void {
  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    const value = result[STORAGE_KEY];
    if (value && typeof value === 'object' && 'version' in value && value.version === 2) {
      return;
    }

    const settings = normalizeSettings(value);
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  });
}

function isSupportedTab(tab: chrome.tabs.Tab): boolean {
  return typeof tab.id === 'number' && /^https?:\/\//.test(tab.url ?? '');
}

function getTabSiteKey(tab: chrome.tabs.Tab): string | null {
  if (!tab.url) {
    return null;
  }

  try {
    return getSiteStorageKey(new URL(tab.url).hostname);
  } catch {
    return null;
  }
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

  const siteKey = getTabSiteKey(tab);
  if (!siteKey) {
    return;
  }

  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    const storage = normalizeGridStorage(result[STORAGE_KEY], siteKey);
    const siteState = getSiteState(storage, siteKey);
    const currentSettings = getActivePattern(siteState).settings;
    const nextSettings = normalizeSettings({ ...currentSettings, enabled: !currentSettings.enabled });
    const nextSiteState = updateActivePatternSettings(siteState, nextSettings);
    const nextStorage = setSiteState(storage, siteKey, nextSiteState);

    chrome.storage.sync.set({ [STORAGE_KEY]: nextStorage }, () => {
      chrome.tabs
        .sendMessage(tab.id!, {
          type: GRID_MESSAGE_TYPE,
          settings: nextSettings,
        })
        .catch(() => undefined);
    });
  });
});
