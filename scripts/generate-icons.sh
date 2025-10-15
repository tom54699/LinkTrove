#!/bin/bash

# 生成 Chrome Web Store 所需的 PNG 圖示
# 需要先安裝 Inkscape 或 ImageMagick

set -e

echo "🎨 生成 Chrome Web Store 圖示..."

# 檢查工具
if command -v inkscape &> /dev/null; then
    CONVERTER="inkscape"
    echo "✅ 使用 Inkscape"
elif command -v magick &> /dev/null; then
    CONVERTER="magick"
    echo "✅ 使用 ImageMagick"
elif command -v convert &> /dev/null; then
    CONVERTER="convert"
    echo "✅ 使用 ImageMagick (convert)"
else
    echo "❌ 錯誤：需要安裝 Inkscape 或 ImageMagick"
    echo ""
    echo "安裝方式："
    echo "  macOS:   brew install inkscape"
    echo "  或:      brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install inkscape"
    echo "  或:      sudo apt-get install imagemagick"
    exit 1
fi

# 創建輸出目錄
mkdir -p public
mkdir -p store-assets

echo ""
echo "📦 生成 manifest 圖示（public/）..."

if [ "$CONVERTER" = "inkscape" ]; then
    inkscape store-assets/icon-master.svg -o public/icon-16.png -w 16 -h 16
    inkscape store-assets/icon-master.svg -o public/icon-48.png -w 48 -h 48
    inkscape store-assets/icon-master.svg -o public/icon-128.png -w 128 -h 128
elif [ "$CONVERTER" = "magick" ]; then
    magick store-assets/icon-master.svg -resize 16x16 public/icon-16.png
    magick store-assets/icon-master.svg -resize 48x48 public/icon-48.png
    magick store-assets/icon-master.svg -resize 128x128 public/icon-128.png
else
    convert store-assets/icon-master.svg -resize 16x16 public/icon-16.png
    convert store-assets/icon-master.svg -resize 48x48 public/icon-48.png
    convert store-assets/icon-master.svg -resize 128x128 public/icon-128.png
fi

echo "  ✅ icon-16.png"
echo "  ✅ icon-48.png"
echo "  ✅ icon-128.png"

echo ""
echo "🖼️  生成商店宣傳圖（store-assets/）..."

if [ "$CONVERTER" = "inkscape" ]; then
    inkscape store-assets/promo-small.svg -o store-assets/promo-small.png -w 440 -h 280
    inkscape store-assets/promo-large.svg -o store-assets/promo-large.png -w 1400 -h 560
elif [ "$CONVERTER" = "magick" ]; then
    magick store-assets/promo-small.svg -resize 440x280 store-assets/promo-small.png
    magick store-assets/promo-large.svg -resize 1400x560 store-assets/promo-large.png
else
    convert store-assets/promo-small.svg -resize 440x280 store-assets/promo-small.png
    convert store-assets/promo-large.svg -resize 1400x560 store-assets/promo-large.png
fi

echo "  ✅ promo-small.png (440×280)"
echo "  ✅ promo-large.png (1400×560)"

echo ""
echo "✅ 圖示生成完成！"
echo ""
echo "📋 下一步："
echo "  1. 檢查 public/ 目錄中的圖示"
echo "  2. 在 public/manifest.json 中新增 icons 欄位"
echo "  3. 準備截圖（screenshot-*.png，1280×800 或 640×400）"
echo "  4. 執行 npm run build 建置擴充功能"
