## 1. Implementation
- [ ] 1.1 Update `CategoriesProvider` to persist `selectedCategoryId` using a key that includes the `organizationId` (e.g., `selectedCategoryId:${orgId}`).
- [ ] 1.2 Update `CategoriesProvider` initialization logic to try restoring from the organization-specific key first.
- [ ] 1.3 Maintain fallback to the global `selectedCategoryId` or the first available category if no specific history exists.
- [ ] 1.4 Update `setCurrentCategory` to save to both the specific key and the global key (for legacy compatibility/other uses).
