# Proposal: Support Native Browser Tab Groups in Sidebar (Narrow Cards Design)

## 1. Background
The sidebar needed a refresh to better reflect the "card-based" nature of LinkTrove while integrating native browser features.
The previous list-based design lacked visual hierarchy for Tab Groups and drag-and-drop affordance.

**Critical Constraint:** LinkTrove has its own concept of "Groups" (Collections). To avoid confusion, browser-level groups must be strictly named **`NativeTabGroup`** in the codebase.

## 2. Objective
1.  **Backend:** Capture and stream Native Tab Group data (title, color, ID) from `chrome.tabGroups`.
2.  **Frontend Data:** Store this data in `OpenTabsProvider`.
3.  **UI:** Implement "Narrow Collapsible Cards" design.
    - Tabs appear as individual cards (darker background, border).
    - Windows and Groups are collapsible sections.
    - Visual indicators (dots) replace traditional arrows.

## 3. Implementation Details

### 3.1 Data Structures (`src/app/tabs/types.ts`)
```typescript
export interface NativeTabGroup {
  id: number;
  windowId: number;
  title?: string;
  color: string; // 'grey' | 'blue' | ...
  collapsed?: boolean;
}

export interface TabItemData {
  // ...
  nativeGroupId?: number;
}
```

### 3.2 UI Design (`TabsPanel.tsx`)
- **Layout**: Flexbox column.
- **Header**: Single unified header handled by `FourColumnLayout` to support rotation animation.
- **Window Level**:
  - Indicator: Dynamic colored ring (Hollow = Collapsed, Filled = Expanded).
  - Colors cycle through: Pink, Blue, Purple, Emerald, Orange.
- **Group Level**:
  - Indicator: Colored dot (Browser group color).
  - Left Border: Colored vertical line when expanded.
- **Tab Level (Card)**:
  - Background: `#44475a` (Default), `#505467` (Hover).
  - Border: `rgba(255,255,255,0.05)`.
  - Content: Circular favicon + Title (No URL).
  - Interaction: Hover translate-x effect.

### 3.3 Layout & Animation (`FourColumnLayout.tsx`)
- **Sidebar Width**: 300px (Expanded) <-> 50px (Collapsed).
- **Header Animation**:
  - Expanded: "OPEN TABS" horizontal.
  - Collapsed: "Open Tabs" vertical (rotated -90deg).
  - Implementation: Single absolute element with `transform-origin` animation.
- **Collapsed Cues**:
  - Displays colored dots corresponding to the first 5 open windows.

## 4. Verification
- [x] **Native Groups**: Create a group in Chrome -> Sidebar updates immediately.
- [x] **Drag & Drop**: Dragging a tab card feels like moving an object.
- [x] **Collapse**: Clicking Window/Group header toggles visibility.
- [x] **Animation**: Sidebar collapse/expand transitions smoothly.
- [x] **Theme**: Colors match the Dracula-based dark theme (`var(--panel)`).

## 5. Security & Permissions
- Added `"tabGroups"` to `manifest.json`.
- Filtered out `chrome://` and extension pages from the list.