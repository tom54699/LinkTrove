## 1. Spec Updates
- [x] 補充 templates 規格：書籍模板快速建立的 8 個固定欄位
- [x] 補充 bookmark-management 規格：卡片翻面顯示新增/最後編輯時間（i18n）與觸發方式
- [x] 補充 templates 規格：書籍模板固定欄位鎖定（不可新增/刪除/修改/調整選項）
- [x] 補充 templates 規格：移除工具模板預設與欄位預設值設定

## 2. Implementation
- [x] 還原書籍模板快速建立欄位（8 欄）
- [x] WebpageCardData 加入 createdAt/updatedAt 並在卡片背面顯示唯讀時間
- [x] 將卡片「移動」圖示改為翻面觸發並移除原移動功能
- [x] 新增 i18n key（card_created_at_label / card_updated_at_label / card_time_toggle）並更新各語系 messages.json
- [x] 書籍模板固定欄位鎖定（不可新增/刪除/修改/調整選項）
- [x] 移除工具模板快速建立預設
- [x] 移除模板欄位預設值 UI 與新增邏輯

## 3. Tests & Docs
- [x] 更新 TobyLikeCard/WebpageCard 相關測試以適配翻面與新欄位顯示
- [ ] 視需要更新相關文件（若有 UI 說明）
