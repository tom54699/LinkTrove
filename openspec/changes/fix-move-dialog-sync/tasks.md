# Implementation Tasks

- [x] **1.1 Fix Data Fetching Dependency**
    - File: `src/app/webpages/MoveSelectedDialog.tsx`
    - Add `isOpen` to the dependency array of the `useEffect` hook responsible for loading subcategories.
    - Ensure data fetching only occurs when `isOpen` is true to avoid unnecessary background calls.
