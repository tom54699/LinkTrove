# Change: Optimize Drag-and-Drop Hysteresis

## Why
Currently, the drag-and-drop reordering requires the user to drag a card almost completely to the edge of another card to trigger a swap. This feels sluggish and requires excessive mouse movement ("edge-based" trigger). Users prefer a "center-based" trigger where passing the midpoint of a card initiates the swap, which is standard behavior in many modern interfaces (e.g., Trello, Notion).

## What Changes
- Update the hysteresis logic in `CardGrid`'s `computeGhostIndex` function.
- Switch from edge-based detection (`rect.right`/`rect.left`) to center-based detection (`centerX`).
- Apply a small buffer around the center to prevent rapid flickering when hovering exactly at the midpoint.

## Impact
- **Affected Specs**: `drag-drop`
- **Affected Code**: `src/app/webpages/CardGrid.tsx`
- **User Experience**: Dragging items will feel more responsive and intuitive.
