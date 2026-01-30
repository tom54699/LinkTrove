# Spec: Selection Toolbar UI

## 1. Visual Style

### Container
-   **Shape**: Pill-shaped (`rounded-full`) to differentiate from content cards.
-   **Background**: Translucent dark/light theme adaptive material.
    -   Dark Mode: `bg-slate-800/90` or `bg-[var(--panel)]/90` with `backdrop-blur-md`.
    -   Border: Subtle `border-slate-700/50`.
    -   Shadow: Deep shadow `shadow-2xl` + `shadow-black/50` to lift it off the canvas.
-   **Placement**: Fixed at `bottom-8` (approx 32px from bottom), centered `left-1/2 -translate-x-1/2`.
-   **Z-Index**: High (`z-50`) to float above all cards.

### Content Layout
-   **Left**: Selection Count (e.g., "3 selected").
    -   Style: Bold number, muted label text.
    -   Separator: Vertical divider after count.
-   **Center**: Action Buttons (Row).
    -   **Move**: Folder/Arrow icon + Label (optional or tooltip).
    -   **Open**: External Link icon + Label.
    -   **Delete**: Trash icon + Label (Red hover).
-   **Right**: Close/Clear Selection button (Cross icon).

## 2. Interactions

### Entry/Exit
-   **Trigger**: Appears when `selectedCount > 0`. Disappears when `selectedCount === 0`.
-   **Animation**:
    -   **Entry**: Slide up from `translate-y-[150%]` to `translate-y-0`. Opacity `0` to `1`.
    -   **Exit**: Slide down.
    -   **Duration**: ~300ms cubic-bezier.

### Buttons
-   **Hover**:
    -   Standard: `bg-slate-700/50` (lighten).
    -   Delete: `bg-red-500/20` text-red-400.
-   **Active/Click**: Scale down slightly (0.95) for tactile feel.

## 3. Icons
Use inline SVGs (Heroicons/Lucide style) for consistent lightweight rendering.
-   **Move**: Folder with arrow or simpler "Move" arrow.
-   **Open**: Box with arrow pointing out.
-   **Delete**: Trash can.
-   **Close**: X mark.

## 4. Accessibility
-   **Role**: `toolbar` or `region` with `aria-label="Selection Actions"`.
-   **Focus**: Buttons must be keyboard focusable.
-   **Contrast**: Ensure text/icon contrast meets WCAG AA.
