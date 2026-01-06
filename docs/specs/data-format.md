# 資料格式（Export / Import JSON）

本檔說明 LinkTrove 匯出/匯入 JSON 的結構與相容策略。

## 結構概覽

- organizations: OrganizationData[]
- categories: CategoryData[]（含 `organizationId`）
- subcategories: SubcategoryData[]
- webpages: WebpageData[]
- templates: TemplateData[]
- orders:
  - subcategories: Record<groupId, string[]>（每個 group 內卡片的順序）
- settings（可選）
  - selectedOrganizationId?: string
  - selectedCategoryId?: string

## 型別說明

- OrganizationData
  - id: `o_...`
  - name: string
  - color?: string
  - order: number
- CategoryData
  - id: `c_...`
  - name: string
  - color: string
  - order: number
  - organizationId: string（指向 organizations.id）
- SubcategoryData
  - id: `g_...`
  - categoryId: string（指向 categories.id）
  - name: string
  - order: number
  - createdAt/updatedAt: number (epoch ms)
- WebpageData
  - id: `w_...`
  - title/url/favicon/note
  - category: string（指向 categories.id）
  - subcategoryId: string（指向 subcategories.id）
  - createdAt/updatedAt: ISO string

## 相容策略

- 若匯入 JSON 缺少 `organizations`：
  - 會自動建立預設 `o_default`（Personal），並為所有 categories 補上 `organizationId = o_default`。
- 若 category 缺少 `organizationId` 欄位：
  - 匯入時自動補為 `o_default`。
- 每個 group（subcategory）內卡片順序：
  - 儲存在 `orders.subcategories[<groupId>]`；匯入時會恢復該順序。

## Toby 匯入

- v3（lists/cards）：
  - lists → 新集合的多個群組；cards → 該群組內的卡片。
- v4（organizations/groups/lists）：
  - organizations → 依序建立；groups → 轉為 collections；lists → 轉為 groups；cards → 轉為 cards。
  - 若僅有 `groups`（無 organizations）：視為單一 organization 路徑，預設建立 Imported org。

## IndexedDB（DB v3）

- 新增 `organizations` store（keyPath: `id`，index: `order`）
- `categories` 增加索引：
  - `by_organizationId`
  - `by_organizationId_order`
- `webpages` 增加複合索引：`category_subcategory`

