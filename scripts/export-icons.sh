#!/usr/bin/env bash
set -euo pipefail

# 導出商店素材圖示與宣傳圖為 PNG（需安裝 Inkscape）
# 不會在此環境自動執行；請於本機執行。

if ! command -v inkscape >/dev/null 2>&1; then
  echo "❌ 未找到 inkscape，請先安裝後重試（macOS 可用: brew install --cask inkscape）" >&2
  exit 1
fi

echo "📦 建立輸出目錄 public/（若不存在）"
mkdir -p public

echo "🎯 導出 manifest 用 icon PNG"
inkscape store-assets/icon-master.svg -o public/icon-16.png  -w 16  -h 16
inkscape store-assets/icon-master.svg -o public/icon-48.png  -w 48  -h 48
inkscape store-assets/icon-master.svg -o public/icon-128.png -w 128 -h 128

echo "🖼️ 導出商店宣傳圖 PNG"
inkscape store-assets/promo-small.svg -o store-assets/promo-small.png  -w 440  -h 280
inkscape store-assets/promo-large.svg -o store-assets/promo-large.png  -w 1400 -h 560

echo "✅ 完成。請在 manifest.json 加入 icons 並上傳商店素材。"

