# 提交規範（現況）

本文件描述目前專案可採用的提交格式。  
`.kiro/` 已刪除，無任務序號規則；請以 Conventional Commits 為主。

**最後更新：2026-01-07**

---

## 基本格式（Conventional Commits）

```
<type>(<scope>): <subject>
```

### 常用 type
- `feat`：新增功能
- `fix`：錯誤修正
- `refactor`：重構（無行為變更）
- `docs`：文件更新
- `test`：測試相關
- `chore`：雜項/工具/設定

### scope（可選）
建議使用模組名或資料夾，例如：
- `groups`
- `webpages`
- `sidebar`
- `background`
- `data`

---

## 範例

- `feat(groups): add share dialog`
- `fix(webpages): handle empty meta fields`
- `refactor(background): extract storage helpers`
- `docs(architecture): add data-flow overview`

---

## 注意事項

- 變更範圍不大可省略 scope，但建議保留以利追蹤。
- 一次 commit 儘量只做一件事（功能/修 bug/文件）。
- 測試與格式化不是自動化流程；如有跑測試請在 commit 訊息或 PR 說明中註記。
