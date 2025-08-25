// Background Service Worker (Manifest V3)
import { createTabsManager } from './background/tabsManager';

const tabsManager = createTabsManager({
  onChange: (evt) => {
    // Future: broadcast via runtime.Port or storage updates
    // eslint-disable-next-line no-console
    console.log('[tabs]', evt.type, evt.payload);
  },
});

async function boot() {
  try {
    await tabsManager.start();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start tabs manager', err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  boot();
});

// Some Chromium variants may not support onStartup in SW context; guard
chrome.runtime.onStartup?.addListener?.(() => {
  boot();
});
