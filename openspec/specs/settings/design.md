# Design: Settings Management

## Context
LinkTrove 需要完整的設定管理系統，讓使用者自訂應用程式行為和外觀。設定資料需要：
- **持久化儲存**：重啟後保留設定
- **安全管理**：GitHub Token 等敏感資訊加密儲存
- **跨裝置同步**：匯出/匯入設定檔案
- **預設值**：新使用者有合理的預設設定

**約束條件**：
- 使用 chrome.storage.local 儲存設定
- chrome.storage.sync 可選（需考慮 quota 限制）
- 敏感資訊（Token）需加密
- React 18 + Context API 管理狀態

## Goals / Non-Goals

### Goals
- ✅ 完整的設定選項（外觀、行為、隱私）
- ✅ GitHub Token 安全管理（加密儲存）
- ✅ 設定匯出/匯入功能
- ✅ 預設設定開箱即用
- ✅ 即時套用設定變更

### Non-Goals
- ❌ 雲端設定同步（使用匯出/匯入）
- ❌ 多帳號設定檔（單一使用者）
- ❌ 進階隱私功能（VPN, 代理伺服器）

## Technical Decisions

### Decision 1: chrome.storage.local vs chrome.storage.sync
**選擇**: 主要使用 chrome.storage.local，提供可選的 chrome.storage.sync

**理由**：
1. **Quota 限制**：
   - chrome.storage.local: ~10MB（足夠設定資料）
   - chrome.storage.sync: 100KB（太小，無法儲存完整設定）
2. **速度**：chrome.storage.local 更快（本地存取）
3. **隱私**：不自動同步到 Google 伺服器

**架構**：
```typescript
interface SettingsData {
  // 外觀設定
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-TW' | 'zh-CN' | 'en';
    cardDensity: 'compact' | 'standard' | 'comfortable';
  };

  // 行為設定
  behavior: {
    closeTabAfterSave: boolean;
    confirmDragDrop: boolean;
    autoBackupFrequency: 'off' | 'daily' | 'weekly' | 'monthly';
    newCardPosition: 'top' | 'bottom';
    duplicateURLHandling: 'prompt' | 'skip' | 'allow';
  };

  // 預設視圖
  defaultView: {
    mode: 'last-used' | 'specified' | 'blank';
    organizationId?: string;
    categoryId?: string;
  };

  // GitHub Token（加密儲存）
  github: {
    token?: string;  // 加密後的 Token
    username?: string;  // GitHub 使用者名稱（驗證後儲存）
  };

  // 隱私設定
  privacy: {
    privacyMode: boolean;
    autoLock: {
      enabled: boolean;
      idleMinutes: 5 | 15 | 30 | 60;
    };
    encryption: {
      enabled: boolean;
      passwordHash?: string;  // bcrypt hash
    };
  };

  // 元資訊
  meta: {
    version: string;  // 設定版本
    createdAt: string;
    updatedAt: string;
  };
}

// 預設設定
const DEFAULT_SETTINGS: SettingsData = {
  appearance: {
    theme: 'auto',
    language: 'zh-TW',
    cardDensity: 'standard'
  },
  behavior: {
    closeTabAfterSave: false,
    confirmDragDrop: false,
    autoBackupFrequency: 'off',
    newCardPosition: 'bottom',
    duplicateURLHandling: 'prompt'
  },
  defaultView: {
    mode: 'last-used'
  },
  github: {},
  privacy: {
    privacyMode: false,
    autoLock: {
      enabled: false,
      idleMinutes: 15
    },
    encryption: {
      enabled: false
    }
  },
  meta: {
    version: '1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};
```

**儲存和讀取**：
```typescript
async function loadSettings(): Promise<SettingsData> {
  const result = await chrome.storage.local.get('settings');

  if (!result.settings) {
    // 首次使用，建立預設設定
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  // 合併預設值（處理新增的設定欄位）
  return deepMerge(DEFAULT_SETTINGS, result.settings);
}

async function saveSettings(settings: Partial<SettingsData>): Promise<void> {
  const current = await loadSettings();
  const updated = {
    ...current,
    ...settings,
    meta: {
      ...current.meta,
      updatedAt: new Date().toISOString()
    }
  };

  await chrome.storage.local.set({ settings: updated });

  // 觸發設定變更事件
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      notifySettingsChanged(changes.settings.newValue);
    }
  });
}
```

**替代方案考量**：
- ❌ **只用 chrome.storage.sync**：Quota 太小，無法儲存完整設定
- ❌ **IndexedDB**：過度複雜，chrome.storage 已足夠

**Trade-offs**：
- 優點：chrome.storage 簡單、可靠、跨分頁同步
- 優點：不需處理 IndexedDB 交易
- 缺點：無法跨裝置自動同步（需手動匯出/匯入）

---

### Decision 2: GitHub Token 加密策略
**選擇**: 使用 Web Crypto API（AES-GCM）加密 GitHub Token

**理由**：
1. **安全性**：Token 不以明文儲存
2. **瀏覽器原生支援**：Web Crypto API 無需引入外部依賴
3. **效能**：硬體加速，加解密速度快

**加密實作**：
```typescript
import { subtle } from 'crypto';

// 生成加密金鑰（衍生自主密碼）
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// 加密 GitHub Token
async function encryptGitHubToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 使用固定密碼（衍生自擴充套件 ID）
  const password = chrome.runtime.id;  // 擴充套件 ID 作為密碼
  const key = await deriveKey(password, salt);

  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );

  // 組合: salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Base64 編碼
  return btoa(String.fromCharCode(...combined));
}

// 解密 GitHub Token
async function decryptGitHubToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);

  const password = chrome.runtime.id;
  const key = await deriveKey(password, salt);

  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// 儲存加密的 Token
async function saveGitHubToken(token: string): Promise<void> {
  const encryptedToken = await encryptGitHubToken(token);

  const settings = await loadSettings();
  settings.github.token = encryptedToken;

  await saveSettings(settings);
}

// 讀取並解密 Token
async function getGitHubToken(): Promise<string | null> {
  const settings = await loadSettings();

  if (!settings.github.token) {
    return null;
  }

  try {
    return await decryptGitHubToken(settings.github.token);
  } catch (error) {
    console.error('Failed to decrypt GitHub token:', error);
    return null;
  }
}
```

**Token 驗證**：
```typescript
async function verifyGitHubToken(token: string): Promise<{ valid: boolean; username?: string }> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const user = await response.json();

      // 檢查 Token 權限
      const scopes = response.headers.get('X-OAuth-Scopes') || '';
      if (!scopes.includes('gist')) {
        return {
          valid: false,
          error: 'Token 缺少 gist 權限'
        };
      }

      return {
        valid: true,
        username: user.login
      };
    }

    return { valid: false };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

**替代方案考量**：
- ❌ **明文儲存**：安全風險太大
- ❌ **使用第三方加密庫**：增加依賴，Web Crypto API 已足夠

**Trade-offs**：
- 優點：安全性高（AES-256 加密）
- 優點：瀏覽器原生支援，無需依賴
- 缺點：擴充套件 ID 作為密碼，重新安裝後無法解密（可接受）

---

### Decision 3: SettingsProvider 架構
**選擇**: 使用 React Context API 集中管理設定狀態

**架構設計**：
```typescript
interface SettingsContextValue {
  settings: SettingsData;
  loading: boolean;
  updateSettings: (partial: Partial<SettingsData>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (json: string) => Promise<void>;
  saveGitHubToken: (token: string) => Promise<void>;
  verifyGitHubToken: () => Promise<{ valid: boolean; username?: string }>;
  deleteGitHubToken: () => Promise<void>;
}

function SettingsProvider({ children }: Props) {
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings().then(settings => {
      setSettings(settings);
      setLoading(false);

      // 套用主題
      applyTheme(settings.appearance.theme);

      // 套用語言
      applyLanguage(settings.appearance.language);
    });

    // 監聽設定變更（跨分頁同步）
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        setSettings(changes.settings.newValue);
      }
    });
  }, []);

  async function updateSettings(partial: Partial<SettingsData>) {
    const updated = deepMerge(settings, partial);
    await saveSettings(updated);
    setSettings(updated);

    // 即時套用變更
    if (partial.appearance?.theme) {
      applyTheme(partial.appearance.theme);
    }
    if (partial.appearance?.language) {
      applyLanguage(partial.appearance.language);
    }
  }

  // ... 其他方法

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, ... }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

**使用範例**：
```typescript
function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  function handleThemeChange(theme: 'light' | 'dark' | 'auto') {
    updateSettings({
      appearance: {
        ...settings.appearance,
        theme
      }
    });
  }

  return (
    <div>
      <label>主題</label>
      <select value={settings.appearance.theme} onChange={e => handleThemeChange(e.target.value)}>
        <option value="light">淡色</option>
        <option value="dark">深色</option>
        <option value="auto">自動</option>
      </select>
    </div>
  );
}
```

---

### Decision 4: 主題套用機制
**選擇**: CSS 變數 + data-theme 屬性

**實作**：
```css
/* styles/themes.css */
:root[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
}

:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
}
```

```typescript
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  let actualTheme = theme;

  if (theme === 'auto') {
    // 根據系統時間或瀏覽器主題
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    actualTheme = prefersDark ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-theme', actualTheme);
}

// 監聽系統主題變更
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  const { settings } = useSettings();
  if (settings.appearance.theme === 'auto') {
    applyTheme('auto');
  }
});
```

---

## Data Flow

### 設定載入流程
```
1. SettingsProvider mount
   ↓
2. 呼叫 loadSettings()
   ↓
3. 從 chrome.storage.local 讀取設定
   ↓
4. 若不存在，使用 DEFAULT_SETTINGS
   ↓
5. 套用主題和語言
   ↓
6. 設定 state（settings, loading: false）
```

### 設定更新流程
```
1. 使用者在 UI 修改設定
   ↓
2. 呼叫 updateSettings(partial)
   ↓
3. 合併新設定到當前設定
   ↓
4. 寫入 chrome.storage.local
   ↓
5. 更新 React state
   ↓
6. 即時套用變更（主題、語言等）
   ↓
7. chrome.storage.onChanged 觸發（跨分頁同步）
```

---

## Performance Considerations

### 設定快取
- 設定載入後快取在 React state
- 避免頻繁讀取 chrome.storage

### 批次更新
```typescript
// 避免多次寫入
// 不好：
await updateSettings({ appearance: { theme: 'dark' } });
await updateSettings({ behavior: { closeTabAfterSave: true } });

// 好：批次更新
await updateSettings({
  appearance: { theme: 'dark' },
  behavior: { closeTabAfterSave: true }
});
```

### Debounce 寫入
```typescript
const debouncedSaveSettings = debounce(saveSettings, 300);
```

---

## Security Considerations

### GitHub Token 安全
- 使用 AES-GCM 加密儲存
- Token 不在 UI 顯示（只顯示前 4 碼）
- 清除 Token 時安全刪除（覆寫記憶體）

### 資料加密
- 使用者可選啟用資料加密
- 密碼使用 PBKDF2（100,000 iterations）
- 加密後資料無法在 IndexedDB 直接讀取

### XSS 防護
- 設定值經過驗證和清理
- 不允許 HTML 或 Script 注入

---

## Testing Strategy

### 單元測試
```typescript
describe('Settings Management', () => {
  it('should load default settings on first use', async () => {
    const settings = await loadSettings();
    expect(settings.appearance.theme).toBe('auto');
  });

  it('should encrypt and decrypt GitHub token', async () => {
    const token = 'ghp_test1234567890';
    const encrypted = await encryptGitHubToken(token);
    const decrypted = await decryptGitHubToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it('should merge partial settings update', async () => {
    await updateSettings({ appearance: { theme: 'dark' } });
    const settings = await loadSettings();
    expect(settings.appearance.theme).toBe('dark');
    expect(settings.behavior.closeTabAfterSave).toBe(false);  // 保留預設值
  });
});
```

### 整合測試
- 測試設定匯出/匯入流程
- 測試 GitHub Token 驗證
- 測試主題切換即時套用
- 測試跨分頁設定同步

### 手動測試清單
- [ ] 修改主題並重新開啟新分頁，驗證主題保留
- [ ] 設定 GitHub Token，測試連線，驗證成功
- [ ] 匯出設定，重置應用程式，匯入設定，驗證恢復
- [ ] 啟用隱私模式，驗證不儲存歷史記錄
- [ ] 在多個分頁修改設定，驗證即時同步

---

## Known Issues & Limitations

### 目前限制
1. **無雲端同步**：需手動匯出/匯入設定
2. **Token 重新安裝後無法解密**：擴充套件 ID 作為密碼
3. **資料加密效能影響**：加密會略微影響讀寫速度

---

## References
- **需求規格**: `spec.md`
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- **Chrome Storage API**: https://developer.chrome.com/docs/extensions/reference/storage/
- **實作位置**: `src/app/settings/SettingsPage.tsx`, `src/app/providers/SettingsProvider.tsx`
