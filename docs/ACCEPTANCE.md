# Acceptance Checklist

This checklist outlines user‑visible behaviors to verify after changes. Use it for manual QA and regression checks.

## Project Backup/Restore (Settings)
- Title reads “專案備份與還原（僅本專案）”; export/import styles match.
- Export JSON downloads a file and shows success; failures show an error.
- Import JSON accepts only JSON, asks for confirmation, replaces data, shows success summary; invalid JSON shows an error.
- After import, categories/templates/webpages and per‑group order are restored (order.subcat.<groupId>).

## Group‑Level Import – Toby JSON
- Entry: Home → group header → “匯入 Toby”.
- Scope: merges into the selected group; does not replace existing data.
- Mapping: customTitle/title → title; url → url; customDescription → note.
- Order: cards keep the file order; order meta updated.
- Thumbnails: favicon guessed via DuckDuckGo ip3; UI onError fallback avoids broken images.
- Invalid JSON shows an error; success shows “新增 N 筆”.

## Group‑Level Import – HTML (Netscape)
- Entry: Home → group header → “匯入 HTML”.
- Format: supports <A href> with optional following <DD> as description; ignores invalid URLs.
- Order: preserves document order; writes order meta.
- Mapping: <A> text → title (fallback hostname); <DD> → note.
- Thumbnails: favicon guessed via DuckDuckGo ip3; UI onError fallback avoids broken images.
- Success toast shows “新增 N 筆”; no console errors.

## Drag and Drop
- Dropping a new tab inserts at the ghost preview position (not always at end).
- In‑group reordering works; cross‑group moves work; hidden original wrapper is excluded from index calculations.
- No noisy debug logs; tab/card favicons don’t trigger native image drag.

## Groups
- Deleting a group deletes its webpages with confirmation; at least one group remains.
- On startup, a default group exists for the selected collection.

## Non‑Functional
- No noticeable jank; progress/toasts during operations; no unexpected network errors.
- IndexedDB meta `order.subcat.<groupId>` updated accordingly.
- No permission errors; no unhandled promise rejections in console.

