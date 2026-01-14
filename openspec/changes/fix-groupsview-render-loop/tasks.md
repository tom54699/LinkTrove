# Tasks: Fix GroupsView Render Loop

## Implementation
- [ ] Modify `src/app/groups/GroupsView.tsx`: Remove `groups` from the `useEffect` dependency array that calls `load()`.

## Verification
- [ ] Run `npm run build` to ensure no build errors.
- [ ] Verify runtime behavior (no infinite loop).
