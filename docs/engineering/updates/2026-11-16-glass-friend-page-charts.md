# 2026-11-16 — Glass pop-ups, friend page, chat charts, Pro badges, header default, Aries shadow

## Owner request
"Do not use transparent for all popup panels, but keep the glass effect of ios to maintain liquid glass features. Make a separate page to view the profile of the friends that will show all shared data. Add shadow for the mascot to look realistic. Make the banner set to none as default and they can turn it on for free anytime. Improve the Chat replies that it always show graph presentation even offline for specific user requests. In profile badges, remove "Gold" and Platinum. just keep pro and pro+. Improve this: Do not use stipe style. Make it real mix that glows and has animations." (the System theme swatch).

## Changes
- **Pop-up panels (`App.css`, block "Pop-up panels keep Liquid Glass"):** with Liquid Glass on, every sheet is frosted glass, not see-through: a 72–92% fill that follows the clarity slider (`--glass-fill`), 30px blur with saturation, a light rim and an inner highlight. Light and dark have their own rim. With Reduce Transparency, sheets fall back to the solid pop-up surface.
- **Friend's page (`screens/FriendProfile.js`, new view `FriendProfile`):** tapping a friend in Friends opens their own page instead of a section inside the sheet. It has:
  - a profile header that says who shares what ("Shares a summary with you", "You share a summary");
  - everything the friend shared: month, date, income, expenses and net when shared, a savings ring, a category donut with percentages, and their note;
  - what you share, with the same preview-then-share controls;
  - Remove friend, Report to MOVO and Block user, each confirmed first.
  Back returns to the Friends list. Only the friend's display name and their shared snapshot are shown; no new data is shared and the API and database are unchanged.
- **Chat charts from the device (`lib/chatCharts.js`, `components/ChatChart.js`):** asking for a chart, graph, breakdown, trend, income vs expenses, or a budget chart answers at once with a chart. It is built from the records on this device, so it works offline, signed out and on any plan. Nothing is sent to NasrinAI. There are four kinds:
  - spending by category (donut, largest six plus Other);
  - spending over time (a bar per day of the week or month, or per month for "monthly" and "this year");
  - income vs expenses (paired bars for 6 or 12 months, with net);
  - monthly limits (meters, fullest first).
  Each chart has a one-line summary, which Listen reads aloud. Two new chat shortcuts, "Spending chart" and "Income vs expenses", draw them too. Hidden amounts stay hidden in the labels. Bars grow once with a calm ease-out, and do not animate under reduced motion.
- **Plan badges (`components/PlanBadge.js`):** they read "Pro" and "Pro+" only; the Gold and Platinum names are gone. A trial still shows "Free month" under the plan.
- **Home header default (`App.js`):** the header photo is None by default (`homeHero: 'plain'`). Anyone can turn on a free scenery at any time in Settings → Appearance → Home header. A one-time migration (`homeHeroDefaultNone`) moves the old automatic default to None. A header someone chose is kept.
- **System theme swatch (`App.css`, block "System theme swatch: a real day/night mix"):** the diagonal split is gone. The swatch is a blended night-to-day gradient with a soft glow. It drifts slowly (9s, ease-in-out, alternating) and is still under reduced motion.
- **Aries shadow (`lib/ariesArt.js`, `App.css` block "Aries casts a real shadow"):** a wide soft ground shadow plus darker contact shadows under the hooves, and a faint drop shadow from the figure, so Aries stands on the surface. Dark mode uses a deeper shadow.

## Translations
New strings are in `src/i18n/catalog/ui-2026-11-16-charts-friend-page.js` (11 languages, machine-assisted). They were rebuilt with `npm run i18n`.

## Tests
- `lib/chatCharts.test.js`: which messages ask for a chart; category shares; daily and monthly trends; income vs expenses; budget meters; summaries.
- `NasrinAIChat.test.js`: a chart request is drawn while offline and signed out, with no network call.
- `screens/FriendProfile.test.js`: the header status, the rich shared card, back to Friends, a confirmed remove, and the empty state.
- `PlanBadge.test.js`: "Pro" and "Pro+" labels.
- `App.test.js`: Home starts with no header photo; the old default migrates once; a chosen header is kept.

## Visual check
The mock-cloud build was checked at 430px (light) and 375px (dark):
- Home: the Aries shadow;
- the friend page: names and amounts no longer split mid-word at 375px;
- the chat charts;
- the Budgets & Plans pop-up: glass fill rgba(255,255,255,.72) in light and rgba(28,28,30,.72) in dark, both with blur(30px) saturate(1.8);
- the theme picker.
