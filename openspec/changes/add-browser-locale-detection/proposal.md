# Change: 根據瀏覽器語系自動設定預設語言

## Why
目前語系預設硬編碼為 `en`，對於非英語使用者不夠友善。應該根據瀏覽器語系自動偵測並設定合適的預設語言。

## What Changes
- 初始化時偵測瀏覽器語系（`navigator.language`）
- 將瀏覽器語系格式（如 `zh-TW`）轉換為應用程式格式（如 `zh_TW`）
- 優先使用已儲存的語系偏好，其次使用瀏覽器語系，最後 fallback 到 `en`

## Impact
- Affected code: `src/app/i18n/LanguageProvider.tsx`
- UX: 新使用者會看到符合其瀏覽器設定的語言
- No breaking changes
