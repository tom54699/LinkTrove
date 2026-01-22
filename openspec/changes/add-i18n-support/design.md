# Design: add-i18n-support

## Context

LinkTrove 需要支援多語言切換，首階段為繁體中文與英文。作為 Chrome 擴充功能，需選擇適合的 i18n 方案。

## Goals / Non-Goals

**Goals:**
- 支援繁體中文 (zh-TW) 與英文 (en) 切換
- 語言偏好持久化儲存
- 切換後立即生效，無需重新載入擴充

**Non-Goals:**
- 自動偵測系統語言（未來擴展）
- 翻譯用戶資料內容
- 第三方翻譯服務整合

## Decisions

### Decision 1: 使用 Chrome 原生 i18n API

**選擇**: `chrome.i18n.getMessage()` + `_locales/` 目錄

**原因**:
- 無外部依賴，bundle size 不增加
- Chrome 擴充原生支援，無相容性問題
- 足以應對固定 UI 文字需求

**捨棄方案**:
- i18next: 功能強大但增加 ~30KB，對此需求過重
- 自建方案: 需維護成本，無明顯優勢

### Decision 2: 語言切換機制

**選擇**: React Context + chrome.storage.local

```
LanguageProvider (Context)
  ├── 讀取 chrome.storage.local['language']
  ├── 提供 currentLanguage state
  ├── 提供 setLanguage() 方法
  └── 語言變更時重新渲染子組件
```

**原因**:
- 符合專案現有 Provider pattern
- 即時切換無需 reload extension

### Decision 3: 翻譯檔案結構

**選擇**: Chrome 標準 `_locales/` 結構

```
src/_locales/
  ├── en/
  │   └── messages.json
  └── zh_TW/
      └── messages.json
```

**messages.json 格式**:
```json
{
  "btn_save": {
    "message": "Save",
    "description": "Save button label"
  },
  "btn_cancel": {
    "message": "Cancel"
  },
  "toast_saved_count": {
    "message": "Saved $COUNT$ cards",
    "placeholders": {
      "count": { "content": "$1" }
    }
  }
}
```

### Decision 4: React Hook 設計

```typescript
// src/app/hooks/useI18n.ts
export function useI18n() {
  const { language } = useLanguage();

  const t = useCallback((key: string, substitutions?: string[]) => {
    return chrome.i18n.getMessage(key, substitutions) || key;
  }, [language]);

  return { t, language };
}
```

**使用方式**:
```tsx
const { t } = useI18n();
return <button>{t('btn_save')}</button>;
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chrome i18n 不支援動態切換 | 中 | 使用 Context 強制重新渲染 |
| 翻譯 key 命名不一致 | 低 | 建立命名規範：`{type}_{name}` |
| 遺漏部分文字 | 低 | 分階段遷移，逐組件驗證 |

## Translation Key Naming Convention

```
btn_*       - 按鈕標籤 (btn_save, btn_cancel, btn_delete)
menu_*      - 選單項目 (menu_edit, menu_move, menu_share)
dialog_*    - 對話框標題/內容 (dialog_confirm_delete)
label_*     - 表單標籤 (label_name, label_url)
placeholder_* - 輸入框提示 (placeholder_search)
toast_*     - Toast 訊息 (toast_saved, toast_error)
settings_*  - 設定相關 (settings_language, settings_theme)
```

## Open Questions

- [ ] 是否需要支援 RTL 語言（阿拉伯文、希伯來文）？→ 目前不需要
- [ ] 未來簡體中文是否自動轉換或獨立翻譯？→ 待定
