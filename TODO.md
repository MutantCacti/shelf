v1.5: Accessibility redesign 

v1.6: Mobile redesign: bottom bar, chat-app UX, pull-to-refresh

---

Batch uploads properly so that small files don't wait for large files

Large file uploads could create the Item early and show a progress bar -- this change would be included in a full refactor to reimplement optimistic loading

Implement SSE for immediate refresh on other devices when you have shelf open on two screens at once (replaces manual reload on receiving device)

Make selection persist across sessions

Make the preview modal (and perhaps all modals) draggable and resizable

Add special cases for text entries:
- Links should be highlighted as such and ideally openable directly from the TransferItem
- TODO: with or without a colon should be highlighted and maybe have a little complete button on hover? this could replace a delete button on hover which all items could have
