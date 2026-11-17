# Settings feature names

The main Settings list and filtered results show each feature name, its icon and any existing switch or chevron. Settings search still matches the supporting text. Screen readers can read the descriptions and identify controls by their feature names.

- `src/screens/Settings.js` applies the title-only display to the main Settings list. Detail screens and dialogs retain their visible descriptions and instructions.
- `src/screens/Settings.test.js` verifies the default and filtered display, accessible labels and descriptions, and description-based search. The Node 26 typecheck, strict production build and full regression suite passed before commit. The Vercel sandbox also passed 12 Settings, transaction balance and icon consistency tests.
- This presentation change has no data, preference, migration, permissions, auth, sync or legal impact. Revert the implementation commit to restore the visible row descriptions.
- Chromium verified 33 rows, search, accessible descriptions, switch changes and navigation at 320, 430, 820 and 1440 px. The smallest viewport used dark mode and the largest text setting.
- Verify the pull request checks and preview deployment before release.
