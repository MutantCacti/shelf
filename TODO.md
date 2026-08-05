## Next Minor Version

~~Commit 1: "Fix double input enter/paste in preview"~~

- ~~Make enter-to-rename not also download the file~~

- ~~Pasting into a preview should not paste on the main page~~

~~Commit 2: "Consolidate hardcoded colours into index.css:@theme"~~

~~Commit 3: "Add colour groups that determine grid layout"~~

- ~~Add grouping with separate colours for visual identity~~
    - ~~when files are selected, replace upload button on transfer bar with a palette (LuPalette) and modal for 10 colour groups~~
    - ~~when files are selected, pressing number keys 1-0 should do this grouping into 10 colour groups~~

~~Commit 4: "Parallelise uploads and upload smallest-first"~~

- ~~Batch uploads properly so that small files don't wait for large files~~

~~Commit 5: "Add SSE ping for real time refresh"~~

- ~~Implement SSE for immediate refresh on other devices when you have shelf open on two screens at once (replaces manual reload on receiving device)~~

~~Commit 6: "Text formatting, highlight TODO and clickable links"~~

- ~~Make copy-paste preserve formatting as well as possible~~

- ~~Highlight hyperlinks and allow clicking them from the card~~

- ~~Highlight TODO in text items starting with TODO~~

~~Commit 7: "Colour palette redesign"~~

- ~~Redesign the colours~~

## Next Major Version

- 2.0 Mobile-forward and Accessibility redesign
full refactor to reimplement optimistic loading
Large file uploads need significant work 
- should be far more performant
- should create the Item early and show a progress bar

- 3.0 Publishable Authentication and Security refactor
