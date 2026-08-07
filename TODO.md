## v1.6 Changes

- Update README with a new image and just better introduction in general

- Do a full code comment and hygiene pass

- Do a pass of HelpPage to ensure text is readable (copyright currently really is not)

- Single clicking a selected item should deselect it again (disabled by 1.5's clear-select mechanics)

- Active bound item for shift+click range select should be cleared on deselection (BUG: select, deselect and shift+click still uses previously selected item as anchor)

- Swap shift+Enter and Enter in preview edit so shifted=newline and raw=submit

- BUG: Optimistic file uploads no longer correctly rolling back on failure. May need manual hash by client and check. 

## Next Major Versions

- 2.0 Mobile-forward and Accessibility redesign
full refactor to reimplement optimistic loading
Large file uploads need significant work 
- should be far more performant
- should create the Item early and show a progress bar

- 3.0 Publishable Authentication and Security refactor
