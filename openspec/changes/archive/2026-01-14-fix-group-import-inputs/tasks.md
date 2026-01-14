## 1. Implementation
- [x] 1.1 Add hidden `<input type="file">` elements for HTML and Toby import to `src/app/groups/GroupsView.tsx` within the group loop.
- [x] 1.2 Ensure IDs match the expected format (`html-file-${g.id}` and `toby-file-${g.id}`).
- [x] 1.3 Wire `onChange` events to `handleHtmlImport` and `handleTobyFileSelect`.