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

Commit 1: "Fix preview modal text-duplicate bug and position under zoom"

- BUG: VISUAL ONLY, TEXT ITEMS ONLY -- in the preview modal, entering to edit text, doing anything (edit or no edit) and confirming (ctrl+Enter or confirm button) visually duplicates the text in the preview. This is frontend only --- exiting the preview shows the text is unchanged.

- Zooming in and out on the browser should update preview modal to maintain position above the item

Commit 2: "Make colour-group tint stronger and background only + tint selection borders"

- Change the green group colour

- Bump group-colour opacity to 30%

- Colour tint should not apply to text, images or svg icons in file items, only the background (and the fade at the bottom)

- Make preview modal border also receive tint

- .glow-wrap.active should take the group colour and not just accent all the time

- Previewed (inline, see api/routes/transfers.py) media should escape the tint --- images, documents, anything that renders.

Commit 3: "Reduce groups from 10 to 9 and refine group colours for accessibility"

- Reduce groups from 10 to 9 (remove 9, the beige) and make 0 keybind reset to 9 instead of doing 10 (this makes the popover 5x2 instead of 6,5)

- Make sure all colour group colours meet accessibility criteria at 30% with text colours (TODO highlight, links)

- ~~HelpPage help should say 0 for clear group and 1-9 for set group~~

Commit 4: "Make palette less blue and add special link colour"

- Slate ground is *slightly* too saturated, should be less visibly blue

- Add a new theme variable for link colour and make it a blue that's visible on every group

Commit 5: "Make TextItems render newlines"

- TextItems should no longer ignore newlines to wrap and contain as much text as possible --- newlines should be in there too.

Commit 6: "Replace TransferBar icon vertical offset with scale-up"

- TransferBar icons should no longer offset vertically on hover. Make them scale like the colours in the palette popover and apply this everywhere (logout, help, upload/download/palette, delete)

Commit 7: "Update desktop selection model to standard file manager model"

- Shift + click to select in range, ctrl + click to select individual; make normal left click deselect current selected

## Next Major Version

- 2.0 Mobile-forward and Accessibility redesign
full refactor to reimplement optimistic loading
Large file uploads need significant work 
- should be far more performant
- should create the Item early and show a progress bar

- 3.0 Publishable Authentication and Security refactor
