# Tasks: fix-drag-drop-flicker

## 1. Analysis
- [x] 1.1 Add diagnostic logs to trace drop flow timing
- [x] 1.2 Identify root cause of flicker (ghost cleanup timing)
- [x] 1.3 Analyze impact of proposed fix

## 2. Implementation
- [x] 2.1 Modify `handleDrop` in `CardGrid.tsx` to await `onDropExistingCard`
- [x] 2.2 Wrap cleanup in `try-finally` for error safety

## 3. Verification
- [x] 3.1 Test drag-drop operations - no flicker
- [x] 3.2 Verify ghost preview displays correctly
- [x] 3.3 Confirm error handling works (ghost cleans up on error)

## 4. Cleanup
- [x] 4.1 Remove diagnostic logs after verification
