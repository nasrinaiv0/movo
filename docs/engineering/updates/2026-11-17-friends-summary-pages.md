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
