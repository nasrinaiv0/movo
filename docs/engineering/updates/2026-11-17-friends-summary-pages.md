# Friends pages and sharing settings

## Plan before implementation

- Start from current MOVO main, including the existing Friends and Aries work. Add Friends and Summary screens to the existing Menu navigation and device back stack. Keep the QR deep-link flow.
- Render only sections each friend approved. The owner previews their selected sections and replaces or revokes one connection’s snapshot at a time. Preserve existing shared totals, notes and spending percentages. Store only selected aggregates in the existing service-only snapshot table.
- Use the same financial calculations as Home where possible. Weekly money flow shows net movement, while spending shows category percentages. Savings, financial planning and plan progress use current data. The month selector continues to work for the historical income, expense, cash flow and spending sections.
- Verify the recipient projection, zero and omitted values, share replacement, account isolation, back navigation and narrow mobile layout. Update the privacy disclosure and record results before publishing the PR.

## Implementation and release

- Friends opens from Menu or Profile. Selecting a connection pushes a read-only Summary screen to the existing navigation stack. The private pages are excluded from transition screenshot caching.
- Seven independently selectable cards are saved as a dated snapshot per connection. Income and expenses are independent. Money Flow shows net movement per seven-day bucket from the selected month; it carries no separate incoming or outgoing totals. Savings and financial planning show a dated current snapshot, budgets show current coverage and plan progress, and spending shows broad percentages for the selected month.
- Updates replace the previous snapshot and only the verified owner can retrieve their saved sharing selections. Revoking deletes the share using the existing database routine. Existing snapshots remain readable. No schema migration is needed for the existing JSONB snapshot field.
- The privacy notice includes the expanded sharing options. An app rollback can leave the database schema in place. Older app builds can still read legacy snapshots and handle their invites. An older build displays the note and month of a newer-format snapshot, when present, until it is updated.
- The focused regression suite covers routes, privacy projection and snapshots, and the full suite and mobile widths are rechecked before rollout. The SQL replacement regression runs through the existing finance tenant-isolation workflow.

## Summary visual refinement

- Use a single overview card for the financial totals, a clear month and update date, and consistent detail cards for cash flow, planning, budgets and spending. Preserve independently approved figures, real zero values and legacy snapshots.
- Give sharing its own readable selection and preview steps with a matching renderer. Keep the exact recipient and approval action visible on the preview.
- Verify the existing privacy and approval flow, keyboard controls, and mobile layout in light and dark mode. Record evidence before pushing the change to PR #314.


## Responsive Summary redesign

- Plan recorded before editing: use a Movo-style accent overview for approved totals, a visible tracking note, and consistent reading order for compact chart and planning cards. Associate each dated current-value section with its snapshot date and keep historical totals tied to the selected month.
- Make the share action clear, keep approve and edit reachable in the preview, and give loading, empty and error states the same visual rhythm. Keep the recipient preview on the same rendering component.
- Scope: `FriendFinanceSummary.js`, its existing regression suite and Summary styles. The API, migration, stored snapshot and disclosure are unaffected. Revert the layout commit to roll back.

- The share dialog now mounts above the animated screen stack, which keeps its preview title and actions clear of the app header and navigation. Both preview actions stay visible while the recipient view scrolls. The cash-flow rows share one zero baseline and retain labeled amounts without hover.
- Isolated Chromium verified the complete flow at 390 px light and 320 px dark, plus 1220 px desktop, 320 px with 130% text and large signed amounts, the empty state, and Arabic right-to-left rendering. Test accounts and financial values were invented. Jest passed 241 suites and 1,496 tests, including the dated-section regression.
- Before rollout, verify the hosted preview with two signed-in test accounts and spot-check the sheet on physical iOS and Android. This is a presentation change with no new data, permission or legal policy requirements.
