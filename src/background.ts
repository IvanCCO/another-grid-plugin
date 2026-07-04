import { DEFAULT_SETTINGS, STORAGE_KEY, normalizeSettings } from './utils';

function ensureDefaultSettings(): void {
  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SETTINGS }, (result) => {
    const settings = normalizeSettings(result[STORAGE_KEY]);
    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  ensureDefaultSettings();

  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('[Grid Systems Overlay] Extension installed.');
  } else if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    console.log('[Grid Systems Overlay] Extension updated.');
  }
});
