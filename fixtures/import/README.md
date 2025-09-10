# Import Fixtures

Place sample import files here for development and tests.

- toby.json
  - Toby v3 export sample
  - Expected shape: `{ "version": 3, "lists": [ { "title": string, "cards": [ { "title": string, "url": string, "customTitle"?: string, "customDescription"?: string } ] } ] }`

- bookmarks.html
  - Netscape Bookmarks HTML
  - Use top-level `<H3>` as category, nested `<H3>` (if any) as group (or default to "group")
  - `<A href>` links become cards; optional `<DD>` becomes description

- list.txt
  - First line: category name
  - Subsequent lines: URLs (one per line)

These files are not required at runtime; they are for local testing and parser development in M2.

