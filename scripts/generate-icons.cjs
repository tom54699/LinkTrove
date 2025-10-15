#!/usr/bin/env node

/**
 * 生成 Chrome Web Store 所需的 PNG 圖示
 * 使用線上 API 或提示使用者手動轉換
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 LinkTrove 圖示生成指南\n');

// 檢查 SVG 檔案是否存在
const svgFiles = [
  'store-assets/icon-master.svg',
  'store-assets/promo-small.svg',
  'store-assets/promo-large.svg',
];

const missingFiles = svgFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ 缺少以下 SVG 檔案：');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

console.log('✅ SVG 檔案已就緒\n');

// 創建輸出目錄
const dirs = ['public', 'store-assets'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('📋 需要生成以下 PNG 檔案：\n');

const pngFiles = [
  { input: 'store-assets/icon-master.svg', output: 'public/icon-16.png', size: '16×16' },
  { input: 'store-assets/icon-master.svg', output: 'public/icon-48.png', size: '48×48' },
  { input: 'store-assets/icon-master.svg', output: 'public/icon-128.png', size: '128×128' },
  { input: 'store-assets/promo-small.svg', output: 'store-assets/promo-small.png', size: '440×280' },
  { input: 'store-assets/promo-large.svg', output: 'store-assets/promo-large.png', size: '1400×560' },
];

pngFiles.forEach(({ input, output, size }, index) => {
  console.log(`${index + 1}. ${output} (${size})`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n🛠️  生成方式（選擇其一）：\n');

console.log('方法 1：使用 Inkscape（推薦）');
console.log('───────────────────────────────');
console.log('1. 安裝 Inkscape：');
console.log('   macOS:   brew install inkscape');
console.log('   Ubuntu:  sudo apt-get install inkscape');
console.log('\n2. 執行腳本：');
console.log('   ./scripts/generate-icons.sh');
console.log('   或');
console.log('   bash scripts/generate-icons.sh\n');

console.log('方法 2：使用線上工具');
console.log('───────────────────────────────');
console.log('1. 前往 https://cloudconvert.com/svg-to-png');
console.log('2. 上傳 SVG 檔案並設定對應尺寸');
console.log('3. 下載 PNG 檔案到對應位置\n');

console.log('方法 3：使用 Figma/Sketch/Adobe XD');
console.log('───────────────────────────────');
console.log('1. 在設計工具中開啟 SVG 檔案');
console.log('2. 匯出為 PNG，設定對應尺寸');
console.log('3. 儲存到對應位置\n');

console.log('方法 4：使用 ImageMagick');
console.log('───────────────────────────────');
console.log('1. 安裝 ImageMagick：');
console.log('   macOS:   brew install imagemagick');
console.log('   Ubuntu:  sudo apt-get install imagemagick');
console.log('\n2. 執行腳本：');
console.log('   ./scripts/generate-icons.sh\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📝 生成後的檢查清單：');
console.log('───────────────────────────────');
console.log('□ 確認所有 PNG 檔案已生成');
console.log('□ 在 public/manifest.json 中新增 icons 欄位');
console.log('□ 執行 npm run build 建置擴充功能');
console.log('□ 在 chrome://extensions/ 測試圖示顯示\n');

// 檢查是否已經生成
const generatedFiles = pngFiles.filter(({ output }) => fs.existsSync(output));

if (generatedFiles.length > 0) {
  console.log('✅ 已生成的檔案：');
  generatedFiles.forEach(({ output }) => {
    const stats = fs.statSync(output);
    console.log(`   ✓ ${output} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
  console.log('');
}

const remainingFiles = pngFiles.filter(({ output }) => !fs.existsSync(output));

if (remainingFiles.length > 0) {
  console.log('⏳ 待生成的檔案：');
  remainingFiles.forEach(({ output, size }) => {
    console.log(`   ○ ${output} (${size})`);
  });
  console.log('');
}

// 檢查 manifest.json 是否已新增 icons
const manifestPath = 'public/manifest.json';
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.icons) {
    console.log('⚠️  提醒：需要在 public/manifest.json 中新增 icons 欄位：\n');
    console.log('  "icons": {');
    console.log('    "16": "icon-16.png",');
    console.log('    "48": "icon-48.png",');
    console.log('    "128": "icon-128.png"');
    console.log('  }\n');
  } else {
    console.log('✅ manifest.json 已包含 icons 欄位\n');
  }
}
