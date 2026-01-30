# Proposal: Fix MoveSelectedDialog Group Sync Issue

## Context
The `MoveSelectedDialog` allows users to batch move selected cards to a specific collection and group. However, the list of groups (subcategories) is not always up-to-date.

## Problem
The component uses `useEffect` to fetch groups only when the `selectedCategoryId` changes.
```typescript
React.useEffect(() => {
  // fetch groups...
}, [selectedCategoryId]);
```
If a user adds a new group in the sidebar while the dialog is closed (but mounted), and then reopens the dialog, the `selectedCategoryId` hasn't changed, so the effect doesn't re-run. The user sees a stale list of groups missing the newly created one.

## Solution
Update the dependency array of the `useEffect` hook to include the `isOpen` prop. This ensures that every time the dialog transitions from closed to open, the data is re-fetched, guaranteeing freshness.

```typescript
React.useEffect(() => {
  if (isOpen && selectedCategoryId) {
    // fetch groups...
  }
}, [selectedCategoryId, isOpen]);
```
