# Change: Update Settings Modal UI

## Why
The current settings modal lacks a cohesive visual design and consistent user experience across its different panels (Data, Cloud Sync, Templates). We have created a high-fidelity mockup (`mockups/settings-final.html`) that uses a sidebar navigation pattern, the Dracula theme, and standardized input controls to improve usability and visual polish.

## What Changes
- Refactor `SettingsModal.tsx` to use a Sidebar + Content layout (replacing the current simple list/tab structure).
- Apply the Dracula theme (`#282a36` bg, `#ff507a` accent) consistently.
- Unify the UI components for "Data Management", "Cloud Sync", and "Templates" to match the mockup.
- Update `TemplatesManager.tsx` to match the exact mockup styling (e.g., specific background colors, icons).
- Fix Import file input behavior (allow re-selection) and ensure UI refresh after import.
- **Scope Restriction**: All underlying core logic (e.g., sorting, storage operations) remains reverted to `f0a1eaf` to avoid regressions. Sorting issues are out of scope for this UI update.

## Impact
- Affected specs: `settings`
- Affected code: `src/app/ui/SettingsModal.tsx`, `src/app/templates/TemplatesManager.tsx`