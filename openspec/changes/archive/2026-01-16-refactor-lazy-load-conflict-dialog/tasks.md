## 1. Implementation
- [x] 1.1 Update `src/app/ui/SettingsModal.tsx` to use `React.lazy` for importing `ConflictDialog`.
- [x] 1.2 Wrap `ConflictDialog` usage with `React.Suspense` and a simple fallback.
- [x] 1.3 Verify build passes without `dynamic import will not move module` warning (`npm run build`).
- [ ] 1.4 Manual verification: Trigger a conflict flow in Settings -> Cloud Sync to ensure dialog still opens correctly. (PENDING: Build verified, manual UI test skipped)
