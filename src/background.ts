// Background Service Worker (Manifest V3)
import { createTabsManager } from './background/tabsManager';

type ClientPort = chrome.runtime.Port;
const clients = new Set<ClientPort>();

function tabToPayload(t: any) {
  return {
    id: t.id,
    title: t.title,
    url: t.url,
    favIconUrl: t.favIconUrl,
    index: t.index,
    windowId: t.windowId,
  };
}

let started = false;
const tabsManager = createTabsManager({
  onChange: (evt) => {
    // Broadcast tab events to connected UI ports
    clients.forEach((p) => {
      try {
        p.postMessage({ kind: 'tab-event', evt });
      } catch (err) {
        console.error('postMessage failed', err);
      }
    });
  },
});

async function boot() {
  try {
    if (!started) {
      await tabsManager.start();
      started = true;
    }
  } catch (err) {
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

// Handle UI connections for Open Tabs syncing
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'openTabs') return;
  // Ensure listeners are active when a UI connects (SW may have cold-started)
  boot();
  clients.add(port);
  // Send initial snapshot of open tabs across all windows and current active window id
  chrome.windows.getLastFocused?.({ populate: false }, (w) => {
    const activeWindowId = w?.id;
    chrome.windows.getAll?.({ populate: false }, (wins) => {
      const windowIds = (wins || [])
        .map((x) => x.id)
        .filter((x) => typeof x === 'number');
      chrome.tabs.query({}, (tabs) => {
        try {
          const payload = {
            kind: 'init',
            activeWindowId,
            windowIds,
            tabs: tabs.map(tabToPayload),
          };
          port.postMessage(payload);
        } catch (err) {
          console.error('failed to send init tabs', err);
        }
      });
    });
  });
  port.onDisconnect.addListener(() => {
    clients.delete(port);
  });
});

// Broadcast window focus changes so UI can switch visible window
chrome.windows?.onFocusChanged?.addListener?.((windowId) => {
  clients.forEach((p) => {
    try {
      p.postMessage({ kind: 'window-focus', windowId });
    } catch {}
  });
});

// Broadcast window create/remove so UI can render groups immediately
chrome.windows?.onCreated?.addListener?.((win) => {
  clients.forEach((p) => {
    try {
      p.postMessage({
        kind: 'window-event',
        evt: { type: 'created', windowId: win?.id },
      });
    } catch {}
  });
});
chrome.windows?.onRemoved?.addListener?.((windowId) => {
  clients.forEach((p) => {
    try {
      p.postMessage({
        kind: 'window-event',
        evt: { type: 'removed', windowId },
      });
    } catch {}
  });
});
