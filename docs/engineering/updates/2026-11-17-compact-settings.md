# Compact Settings

- Put Settings search in the header on tablet and desktop. Keep a full-width search row on phones and foldable layouts. Search matches group headings as well as individual preferences, and Clear search restores input focus.
- Flow complete settings groups down columns in source order. Use the available width for one column on phones, two on tablets, and up to three on desktop. Make the search results easy to scan and retain each setting's explanatory text.
- Apply the compact row treatment to Settings, Appearance and Notification Settings. Keep the navigation preview near Theme and accent controls. Reduce the height of background and glass previews, group notification preferences, and retain the existing 44 px row and switch hit areas.
- Preference keys, permission prompts, plan access, and destructive account and data confirmations use their existing handlers. The change introduces no new dependencies, stored data, or legal copy.

## Verification

- Compare the prior PR head and this change using isolated browser sessions. Check phone, tablet and desktop widths, largest text, right-to-left layout, search and clear, preference switches, theme and text controls, and Quiet Hours time fields.
- Before release, confirm touch targets and scrolling in iPhone and iPad Safari. For a separate review, check breakpoint fit and clipping, readable type, row padding and borders, dark mode, and keyboard focus without changing preference behavior.
