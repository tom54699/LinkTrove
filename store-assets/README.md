# Store Assets（商店素材）

本資料夾包含依 PUBLISH.md 規範準備的圖示與宣傳圖 SVG 原檔，方便你在本機導出對應的 PNG。

## 內容

- `icon-master.svg`：方形主圖（1024×1024），用於匯出 16/48/128 PNG。
- `promo-small.svg`：440×280（商店小圖）。
- `promo-large.svg`：1400×560（商店大圖）。

顏色依專案現有設計的重點色：`#ff507a`（accent）。

## 導出 PNG（建議）

若你已安裝 Inkscape，可直接執行下列指令在本機產生 PNG（不會在此環境自動執行）。

```bash
# 於專案根目錄執行（需先安裝 Inkscape）

# 建立輸出資料夾
mkdir -p public

# 1) 擴充功能 manifest 用 icon（PNG）
inkscape store-assets/icon-master.svg -o public/icon-16.png  -w 16  -h 16
inkscape store-assets/icon-master.svg -o public/icon-48.png  -w 48  -h 48
inkscape store-assets/icon-master.svg -o public/icon-128.png -w 128 -h 128

# 2) 商店宣傳圖（PNG）
inkscape store-assets/promo-small.svg -o store-assets/promo-small.png  -w 440  -h 280
inkscape store-assets/promo-large.svg -o store-assets/promo-large.png  -w 1400 -h 560
```

產生完成後，請於 `public/manifest.json` 增加：

```json
{
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  }
}
```

另外可依 PUBLISH.md 準備 `screenshot-*.png`（1280×800 或 640×400）；此處未自動產出，建議以實際 UI 截圖為準。

