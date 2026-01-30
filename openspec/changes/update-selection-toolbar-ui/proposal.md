# Proposal: Modern Selection Toolbar UI

The current selection toolbar (batch operations bar) is functional but visually outdated and rigid. It appears as a fixed, dark rectangular box at the bottom of the screen.

This proposal aims to redesign the toolbar into a modern, floating "Dynamic Island" style interaction element.

## Key Changes

1.  **Visual Redesign**:
    -   **Shape**: Change from rectangular to pill-shaped (rounded-full/2xl).
    -   **Material**: Adopt a "Glassmorphism" aesthetic with backdrop blur and subtle translucency, fitting modern OS aesthetics (macOS/iOS/Windows 11).
    -   **Position**: Float above the bottom edge with a slide-up entry animation.
    -   **Typography**: Use clearer, slightly larger font for the count.

2.  **Interaction Improvements**:
    -   **Animations**: Smooth entry (`translate-y`) and exit animations.
    -   **Feedback**: Clearer hover states for buttons.
    -   **Icons**: Add vector icons to action buttons (Move, Open, Delete) for faster visual recognition.

3.  **Component Structure**:
    -   Refactor the toolbar into a separate sub-component or keep it cleanly isolated within `CardGrid.tsx` but with updated styles.

## Design References

-   **Style**: "Dimensional Layering" & "Glassmorphism".
-   **Reference**: Apple's "Dynamic Island" or iOS selection toolbars; Gmail's bulk action bar.

## Impact

-   **Files**: `src/app/webpages/CardGrid.tsx`
-   **Risk**: Low (UI only change).
