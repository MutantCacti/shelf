## v1.6 Changes

- Update README with a new image and just better introduction in general

- Do a full code comment and hygiene pass

- Do a pass of HelpPage to ensure text is readable (copyright currently really is not)

- Single clicking a selected item should deselect it again (disabled by 1.5's clear-select mechanics)

- Active bound item for shift+click range select should be cleared on deselection (BUG: select, deselect and shift+click still uses previously selected item as anchor)

- Swap shift+Enter and Enter in preview edit so shifted=newline and raw=submit

- Hover should no longer tilt the item as this is just bad for pixels --- also the animation should be instant so that moving the mouse around quickly satisfyingly tracks its position

- Background change when a file is hovered over the upload field needs improvement (needs movement!!)

- File icons look chunky and unprofessional

- Replace Google Sans Code with something less extra (I like Fira Code)

- It looks weird that the logout and help buttons are floating to the left of the bar like that. Also the i circle icon isn't good

- We seriously need to brainstorm new names than shelf that we can actually get domains for

- BUG: Optimistic file uploads no longer correctly rolling back on failure. May need manual hash by client and check.

- BUG: Preview doesn't preload image or text content and therefore flashes from a small unstretched container to the full one that's properly sized for the content

## Next Major Versions

- 2.0 Mobile-forward and Accessibility redesign
full refactor to reimplement optimistic loading
Large file uploads need significant work 
- should be far more performant
- should create the Item early and show a progress bar

- 3.0 Publishable Authentication and Security refactor
