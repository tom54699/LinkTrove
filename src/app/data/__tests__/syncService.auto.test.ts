import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const storageState: Record<string, any> = {};
let storageListeners: Array<(changes: any, areaName: string) => void> = [];

const exportJsonMock = vi.fn(async () => '{"ok":true}');
const importDataMock = vi.fn(async () => {});
const loadFromLocalMock = vi.fn(async () => [{ id: 'local-1' }]);
const loadFromSyncMock = vi.fn(async () => [{ id: 'cat-1' }]);
const loadTemplatesMock = vi.fn(async () => []);
const listOrganizationsMock = vi.fn(async () => [{ id: 'org-1' }]);
const createOrUpdateMock = vi.fn(async () => ({ fileId: 'file-1', modifiedTime: '2024-01-02T03:04:05.000Z', md5Checksum: 'md5-new' }));
const getFileMock = vi.fn(async () => ({ fileId: 'file-1', modifiedTime: '2024-01-02T03:04:05.000Z', md5Checksum: 'md5-new' }));
const downloadMock = vi.fn(async () => '{"ok":true}');
const connectMock = vi.fn(async () => ({ ok: true }));

function resetChrome() {
  storageListeners = [];
  for (const key of Object.keys(storageState)) delete storageState[key];
  storageState['cloudSync.status'] = {
    connected: false,
    syncing: false,
    auto: false,
  };

  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn((keys: any, cb: any) => {
          const defaults: Record<string, any> = typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
          const result: Record<string, any> = {};
          if (typeof keys === 'string') {
            result[keys] = storageState[keys];
          } else if (Array.isArray(keys)) {
            for (const k of keys) result[k] = storageState[k];
          } else {
            for (const [k, v] of Object.entries(defaults)) {
              result[k] = storageState[k] ?? v;
            }
          }
          cb(result);
        }),
        set: vi.fn((items: Record<string, any>, cb?: () => void) => {
          const changes: Record<string, { newValue: any; oldValue: any }> = {};
          for (const [k, v] of Object.entries(items)) {
            const oldValue = storageState[k];
            storageState[k] = v;
            changes[k] = { oldValue, newValue: v };
          }
          for (const listener of storageListeners) listener(changes, 'local');
          cb?.();
        }),
      },
      onChanged: {
        addListener: vi.fn((fn: (changes: any, areaName: string) => void) => {
          storageListeners.push(fn);
        }),
        removeListener: vi.fn((fn: (changes: any, areaName: string) => void) => {
          storageListeners = storageListeners.filter((l) => l !== fn);
        }),
      },
    },
  };
}

vi.mock('../exportImport', () => ({
  createExportImportService: vi.fn(() => ({
    exportJson: exportJsonMock,
  })),
}));

vi.mock('../../background/storageService', () => ({
  createStorageService: vi.fn(() => ({
    importData: importDataMock,
    loadFromLocal: loadFromLocalMock,
    loadFromSync: loadFromSyncMock,
    loadTemplates: loadTemplatesMock,
    listOrganizations: listOrganizationsMock,
  })),
}));

vi.mock('../cloud/googleDrive', () => ({
  connect: connectMock,
  createOrUpdate: createOrUpdateMock,
  getFile: getFileMock,
  download: downloadMock,
}));

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('syncService auto sync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    exportJsonMock.mockClear();
    importDataMock.mockClear();
    loadFromLocalMock.mockClear();
    loadFromLocalMock.mockImplementation(async () => [{ id: 'local-1' }]);
    loadFromSyncMock.mockClear();
    loadFromSyncMock.mockImplementation(async () => [{ id: 'cat-1' }]);
    loadTemplatesMock.mockClear();
    loadTemplatesMock.mockImplementation(async () => []);
    listOrganizationsMock.mockClear();
    listOrganizationsMock.mockImplementation(async () => [{ id: 'org-1' }]);
    createOrUpdateMock.mockClear();
    getFileMock.mockClear();
    downloadMock.mockClear();
    connectMock.mockClear();
    resetChrome();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.resetModules();
  });

  it('pulls from Drive when auto sync is enabled and remote is newer', async () => {
    const remoteTime = '2024-01-02T03:04:05.000Z';
    getFileMock.mockResolvedValueOnce({ fileId: 'file-1', modifiedTime: remoteTime, md5Checksum: 'md5-new' });

    const { connect, setAutoSync, getStatus } = await import('../syncService');

    await connect();
    expect(getStatus().connected).toBe(true);
    await setAutoSync(true);
    await flushMicrotasks();

    expect(downloadMock).toHaveBeenCalledOnce();
    expect(getFileMock).toHaveBeenCalled();
    const status = storageState['cloudSync.status'];
    expect(status.auto).toBe(true);
    expect(status.lastDownloadedAt).toBeDefined();
    expect(status.lastChecksum).toBe('md5-new');
  });

  it('debounces backups when storage changes arrive', async () => {
    const remoteTime = '2024-01-02T03:04:05.000Z';
    getFileMock.mockResolvedValue({ fileId: 'file-1', modifiedTime: remoteTime, md5Checksum: 'md5-new' });
    const { connect, setAutoSync, getStatus } = await import('../syncService');

    await connect();
    await setAutoSync(true);
    await flushMicrotasks();

    expect(storageListeners.length).toBeGreaterThan(0);
    const signal = storageListeners[0];

    signal({ webpages: { newValue: [{ id: 'w1' }], oldValue: [] } }, 'local');
    expect(getStatus().pendingPush).toBe(true);
    vi.advanceTimersByTime(2100);
    await flushMicrotasks();

    expect(createOrUpdateMock).toHaveBeenCalledOnce();
    expect(exportJsonMock).toHaveBeenCalledOnce();
    expect(getStatus().pendingPush).toBe(false);
    expect(getStatus().lastUploadedAt).toBeDefined();
  });

  it('reconnects silently when prior session was connected', async () => {
    storageState['cloudSync.status'] = {
      connected: true,
      syncing: false,
      auto: false,
      pendingPush: false,
    };

    const { getStatus } = await import('../syncService');
    await flushMicrotasks();

    expect(connectMock).toHaveBeenCalledWith(false);
    expect(getStatus().connected).toBe(true);
  });

  it('mirrors chrome.storage after restore', async () => {
    const { restoreNow, getStatus } = await import('../syncService');

    await restoreNow({ fileId: 'file-1', modifiedTime: '2024-01-02T03:04:05.000Z', md5Checksum: 'md5-new' });
    await flushMicrotasks();

    const setCalls: Array<[Record<string, any>]> = ((chrome as any).storage.local.set as any).mock.calls;
    expect(setCalls.length).toBeGreaterThan(0);
    const status = getStatus();
    expect(status.lastDownloadedAt).toBeDefined();
    expect(status.lastChecksum).toBe('md5-new');
  });
});
