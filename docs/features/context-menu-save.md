# 右鍵保存（Context Menu Save）

## 概述
提供瀏覽器右鍵選單入口，讓使用者在任何頁面快速保存分頁/連結/選取文字至 LinkTrove。保存時在右鍵選單內直接選擇 Organization → Collection → Group，不彈出視窗。

## 使用流程
1. 使用者在頁面、連結或選取文字上右鍵
2. 點選「保存」入口（分頁/連結/選取文字）
3. 依序展開 Organization → Collection → Group
4. 點擊目標 Group 後立即保存，卡片追加到群組末端

## 資料流程
- Background 讀取 Organization / Collection / Group 清單
- 建立階層式右鍵選單
- 點擊 Group 直接呼叫 `addWebpageFromTab`，並固定 `beforeId=__END__`
- 會依卡片流程補抓頁面 meta（如模板欄位、站點資訊）

## 權限
- `contextMenus`
- 既有權限：`tabs`, `storage`

## 備註
- 選取文字不會寫入卡片描述
- 若 Collection 尚無群組，選單會顯示「沒有可用的群組」提示
- 若尚無任何 Organization，選單會提供「開啟 LinkTrove」入口
- 預設不會彈出對話框，避免打斷操作流程
