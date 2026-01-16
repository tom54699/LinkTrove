# Change: Refactor Lazy Load Conflict Dialog

## Why
Currently, the build process emits a warning:
`.../conflictDetection.ts is dynamically imported by .../SettingsModal.tsx ... but also statically imported by .../ConflictDialog.tsx, dynamic import will not move module into another chunk.`

This mixed import strategy prevents proper code splitting, causing the `conflictDetection` logic to be bundled into the main chunk instead of being lazy-loaded only when needed. This increases the initial bundle size unnecessarily.

## What Changes
- Change the import of `ConflictDialog` in `SettingsModal.tsx` from static to dynamic (`React.lazy`).
- Wrap the usage of `ConflictDialog` in `React.Suspense` with a loading fallback.
- This ensures that both the dialog UI and the conflict detection logic are split into a separate chunk.

## Impact
- **Affected Specs**: `code-quality` (Architecture)
- **Affected Code**: `src/app/ui/SettingsModal.tsx`
- **Performance**: Reduced initial bundle size; improved load time for the Settings modal.
- **UX**: A brief loading indicator may appear when the conflict dialog is first opened.
