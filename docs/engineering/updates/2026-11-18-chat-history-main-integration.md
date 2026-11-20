# Chat history integration

- Reconcile PR #321 with main `5edd47d` and the exact candidate for PR #322. Preserve the existing chat history, idle timer, device-smoothness changes and compact Security & Privacy guide.
- Regenerate the affected locale files from the combined chat-history and financial-planning catalogs. Verify the chat entries and the device automation filter in the generated dictionaries.
- Merge the guide PR first. Before merging the chat PR, confirm the current main is contained in the tested integration tree or yields exactly the tested tree, and check the exact-head GitHub workflows and Vercel preview.
- Roll back the chat change independently if required by removing the chat feature commit and regenerating locales from remaining catalogs.
