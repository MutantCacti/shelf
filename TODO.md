## Next Minor Version

Batch uploads properly so that small files don't wait for large files

Large file uploads could create the Item early and show a progress bar -- this change would be included in a full refactor to reimplement optimistic loading

Implement SSE for immediate refresh on other devices when you have shelf open on two screens at once (replaces manual reload on receiving device)

Make enter-to-rename not also download the file

Pasting into a preview should not paste on the main page

Make copy-paste preserve formatting as well as possible

Highlight hyperlinks and allow clicking them from the card

Highlight TODO in text items starting with TODO

Make /?token=<password> auto-open to that user so that you can share shelves as a single link

Redesign the colours

Add grouping with separate colours for visual identity
    when files are selected, replace upload button on transfer bar with a palette (LuPalette) and modal for 10 colour groups
    when files are selected, pressing number keys 1-0 should do this grouping into 10 colour groups

## Next Major Version

- 2.0 Mobile-forward and Accessibility redesign

- 3.0 Publishable Authentication and Security refactor
