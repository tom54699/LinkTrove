type TabEvent =
  | { type: 'created'; payload: any }
  | { type: 'removed'; payload: { tabId: number } }
  | { type: 'updated'; payload: { tabId: number; changeInfo: any } }
  | { type: 'activated'; payload: { tabId: number; windowId: number } }
  | { type: 'replaced'; payload: { addedTabId: number; removedTabId: number } };

export interface TabsManagerOptions {
  onChange: (event: TabEvent) => void;
}

export function createTabsManager(opts: TabsManagerOptions) {
  const { onChange } = opts;

  const created = (tab: any) => safe(() => onChange({ type: 'created', payload: tab }));
  const removed = (tabId: number) => safe(() => onChange({ type: 'removed', payload: { tabId } }));
  const updated = (tabId: number, changeInfo: any) =>
    safe(() => onChange({ type: 'updated', payload: { tabId, changeInfo } }));
  const activated = (activeInfo: { tabId: number; windowId: number }) =>
    safe(() => onChange({ type: 'activated', payload: activeInfo }));
  const replaced = (addedTabId: number, removedTabId: number) =>
    safe(() => onChange({ type: 'replaced', payload: { addedTabId, removedTabId } }));

  function addListeners() {
    chrome.tabs.onCreated.addListener(created);
    chrome.tabs.onRemoved.addListener((tabId: number) => removed(tabId));
    chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: any) => updated(tabId, changeInfo));
    chrome.tabs.onActivated.addListener(activated);
    chrome.tabs.onReplaced.addListener(replaced);
  }

  function removeListeners() {
    chrome.tabs.onCreated.removeListener(created);
    // Wrapped listeners above use inline closures; remove via matching signatures
    chrome.tabs.onRemoved.removeListener as any;
    chrome.tabs.onUpdated.removeListener as any;
    chrome.tabs.onActivated.removeListener(activated);
    chrome.tabs.onReplaced.removeListener(replaced);
    // For onRemoved/onUpdated, we cannot remove anonymous listeners; in runtime code
    // we bind named wrappers instead. Tests call stop() expecting zero listeners; our
    // mock's removeListener implementation will handle identity, so bind named ones:
  }

  async function hasRequiredPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!chrome?.permissions?.contains) return resolve(true); // assume granted if unavailable
      chrome.permissions.contains({ permissions: ['tabs'] }, (granted: boolean) => resolve(granted));
    });
  }

  async function start() {
    const ok = await hasRequiredPermissions();
    if (!ok) throw new Error('Missing required "tabs" permission');
    // Rebind listeners to have stable references for removal
    // Re-define to capture stable fns and use them in add/remove
    (removeListeners as any)._created = created;
    (removeListeners as any)._removed = (tabId: number) => removed(tabId);
    (removeListeners as any)._updated = (tabId: number, ci: any) => updated(tabId, ci);
    (removeListeners as any)._activated = activated;
    (removeListeners as any)._replaced = replaced;

    chrome.tabs.onCreated.addListener((removeListeners as any)._created);
    chrome.tabs.onRemoved.addListener((removeListeners as any)._removed);
    chrome.tabs.onUpdated.addListener((removeListeners as any)._updated);
    chrome.tabs.onActivated.addListener((removeListeners as any)._activated);
    chrome.tabs.onReplaced.addListener((removeListeners as any)._replaced);
  }

  function stop() {
    const rl: any = removeListeners as any;
    if (rl._created) chrome.tabs.onCreated.removeListener(rl._created);
    if (rl._removed) chrome.tabs.onRemoved.removeListener(rl._removed);
    if (rl._updated) chrome.tabs.onUpdated.removeListener(rl._updated);
    if (rl._activated) chrome.tabs.onActivated.removeListener(rl._activated);
    if (rl._replaced) chrome.tabs.onReplaced.removeListener(rl._replaced);
  }

  return { start, stop, hasRequiredPermissions };
}

function safe(fn: () => void) {
  try {
    fn();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('tabsManager handler error', err);
  }
}

