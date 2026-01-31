/**
 * 行為設定服務
 * 管理使用者行為偏好，如儲存後關閉分頁等
 */

export interface BehaviorSettings {
  closeTabAfterSave: boolean;
}

const STORAGE_KEY = 'behaviorSettings';

const DEFAULT_SETTINGS: BehaviorSettings = {
  closeTabAfterSave: false,
};

/**
 * 讀取行為設定
 */
export async function getBehaviorSettings(): Promise<BehaviorSettings> {
  try {
    const result = await new Promise<any>((resolve) => {
      chrome.storage?.local?.get?.({ [STORAGE_KEY]: DEFAULT_SETTINGS }, resolve);
    });
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * 儲存行為設定
 */
export async function setBehaviorSettings(
  settings: Partial<BehaviorSettings>
): Promise<BehaviorSettings> {
  const current = await getBehaviorSettings();
  const updated = { ...current, ...settings };
  try {
    await new Promise<void>((resolve) => {
      chrome.storage?.local?.set?.({ [STORAGE_KEY]: updated }, resolve);
    });
  } catch {}
  return updated;
}

/**
 * 安全關閉分頁
 * 處理以下邊界情況：
 * 1. 視窗中最後一個分頁不關閉
 * 2. 分頁已被關閉
 * 3. 無權限關閉（如 chrome:// 頁面）
 */
export async function closeTabSafely(tabId: number): Promise<boolean> {
  try {
    // 取得分頁資訊
    const tab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
      chrome.tabs.get(tabId, (t) => {
        if (chrome.runtime.lastError) {
          resolve(undefined);
        } else {
          resolve(t);
        }
      });
    });

    if (!tab) {
      // 分頁已被關閉
      return false;
    }

    // 檢查是否為視窗中最後一個分頁
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      chrome.tabs.query({ windowId: tab.windowId }, (result) => {
        resolve(result || []);
      });
    });

    if (tabs.length <= 1) {
      // 最後一個分頁，不關閉
      console.log('[behaviorSettings] Skipping close: last tab in window');
      return false;
    }

    // 關閉分頁
    await new Promise<void>((resolve, reject) => {
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    return true;
  } catch (e) {
    console.warn('[behaviorSettings] Failed to close tab:', e);
    return false;
  }
}
