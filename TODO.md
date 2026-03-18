v1.4: Accessibility redesign 

v1.5: Mobile redesign: bottom bar, chat-app UX, pull-to-refresh

---

Batch uploads properly so that small files don't wait for large files

Large file uploads could create the Item early and show a progress bar -- this change would be included in a full refactor to reimplement optimistic loading