// Background Service Worker (Manifest V3)
import { createTabsManager } from './background/tabsManager';
import * as pageMeta from './background/pageMeta';

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

      // Safe initialization of meta listeners
      try {
        if (typeof pageMeta.initPendingExtractionListeners === 'function') {
          pageMeta.initPendingExtractionListeners();
        }
      } catch (err) {
        console.warn('Failed to initialize pageMeta listeners:', err);
      }
    }
  } catch (err) {
    console.error('Failed to start tabs manager', err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  boot();
});

chrome.runtime.onStartup?.addListener?.(() => {
  boot();
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'openTabs') return;
  boot();
  clients.add(port);

  port.onMessage.addListener((msg) => {
    if (msg?.kind === 'ready') {
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
    }
  });

  port.onDisconnect.addListener(() => {
    clients.delete(port);
  });
});

chrome.windows?.onFocusChanged?.addListener?.((windowId) => {
  clients.forEach((p) => {
    try {
      p.postMessage({ kind: 'window-focus', windowId });
    } catch {}
  });
});

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