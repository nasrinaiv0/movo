# MOVO Country-Aware Bank & Institution Picker

**Date:** 2026-10-31  
**Status:** Implementation specification / Claude handoff. UI and runtime behavior are not yet verified.

## User request

In the Add Account form, replace the free-text **Bank / Institution** field in the expanded **More options** area with a searchable dropdown. Move it immediately after **Account Name**. The bank/institution options must follow the user's selected country. If the user changes country, the list updates to the appropriate country while preserving a safe way to enter an institution not in the catalog.

Reference: user-provided screenshots of the MOVO Add Account modal. The screenshots show Account Type, Account Name, Card Kind, and a More options section containing the existing free-text Bank / Institution input. The desired order is Account Name → Bank / Institution picker → remaining account fields (including Card Kind where the existing account-type flow places it). Do not move or reorder unrelated fields without checking the actual component.

## UX requirements

1. Replace the current free-text Bank / Institution field with a combobox/dropdown that includes:
   - Search input and clear affordance.
   - Keyboard navigation and accessible option announcements.
   - Loading, empty-results, no-match, and error states if catalog retrieval is asynchronous.
   - A clear selected value and a way to change it.
   - A "Not listed? Enter institution manually" option for local/cooperative/fintech providers not in the catalog.
2. Position this field immediately after Account Name, as requested.
3. The selected country controls which institutions are suggested. Changing country refreshes the list and clears or revalidates a selected institution that is not applicable to the new country. Never silently keep an invalid country-specific selection.
4. Country is the user's MOVO country/region preference already used by the app, if available. Inspect and reuse the canonical source of truth; do not create a conflicting second country setting. If the Add Account flow currently has no available country context, provide a country selector using the app's existing country component/settings and define its persistence behavior before implementing.
5. Do not infer country solely from IP, device locale, or currency. Currency and country are related but not interchangeable. Respect an explicit user-selected country.
6. The bank picker is optional unless existing business rules require otherwise. Users must still be able to add cash, generic cards, e-wallets, and other non-bank accounts without selecting a bank.
7. Account name remains user-editable and distinct from institution identity. Example: account name "Daily spending", institution "BDO Unibank".
8. Keep the current visual style and mobile sheet behavior. Ensure the menu is not clipped by the modal, keyboard, sticky bottom Add Account button, or safe areas. Use a portal/overlay strategy consistent with existing UI components.
9. If a saved account has a legacy free-text institution, display it faithfully even if it is absent from the new catalog; allow the user to keep it, edit it, or map it to a catalog entry without destructive migration.
10. No provider login, bank connection, balance verification, or transaction import is implied by selecting an institution.

## Catalog design

Use a maintained country-aware catalog adapter, not a hardcoded mega-list inside the form component. Each institution record should have a stable identifier and metadata such as:

```json
{
  "id": "ph-bdo-unibank",
  "countryCode": "PH",
  "displayName": "BDO Unibank",
  "aliases": ["BDO"],
  "kind": ["bank"],
  "officialWebsite": "https://www.bdo.com.ph/",
  "sourceUrl": "official institution or authoritative catalog source",
  "reviewStatus": "pending"
}
```

This is a schema illustration, not confirmation that the entry has been reviewed or that this exact record exists in the implementation. Verify all institution names, country availability, official URLs, and data reuse/licensing terms before shipping. Prefer authoritative sources and institution-maintained information. Record catalog source, review date, and provenance. Avoid inventing coverage or implying that the list is exhaustive.

### Initial country coverage

Begin with a deliberate launch scope and clearly show coverage. Suggested initial Philippines entries for validation include BDO Unibank, BPI, Metrobank, Land Bank of the Philippines, Philippine National Bank, UnionBank, Security Bank, China Banking Corporation (Chinabank), RCBC, and Development Bank of the Philippines. Include e-wallets such as GCash and Maya only if the field's category design intentionally supports non-bank institutions; otherwise place them under an appropriate account/provider type rather than mislabeling them as banks.

Then add country packs for other launch markets based on product priorities and verified data. Examples of likely institutions to research include:
- United States: Chase, Bank of America, Wells Fargo, Citibank, Capital One.
- United Kingdom: Barclays, HSBC UK, Lloyds, NatWest, Monzo, Starling Bank.
- Canada: RBC, TD Canada Trust, Scotiabank, BMO, CIBC.
- Australia: Commonwealth Bank, Westpac, NAB, ANZ.
- India: State Bank of India, HDFC Bank, ICICI Bank, Axis Bank.
- Singapore: DBS/POSB, OCBC, UOB.

These are research seeds, not an exhaustive or verified launch catalog. Confirm country-specific naming and eligibility before adding. Do not make the app depend on every country pack being available: manual entry must always remain available.

## Data compatibility and behavior

- Inspect the current account model, database schema, validation, forms, account edit flow, and any exports before choosing a persistence representation.
- Prefer storing a stable institution ID plus display-name snapshot and country code where compatible with the existing model. Do not force a schema migration if the current field can safely store a display name; decide after inspection.
- Preserve legacy values and avoid destructive data migrations.
- Country changes should not mutate an existing account's institution silently. Apply the new country filter to the selection UI; when editing an account, show a warning and require explicit confirmation before replacing/clearing a prior institution that does not match the selected country.
- Do not change balance calculations, transaction logic, savings classification, currency conversions, authentication, RLS, or unrelated account creation rules.
- Avoid sending personal banking data to a third-party catalog service. Prefer bundled reviewed data or a controlled first-party endpoint with a documented privacy rationale.

## Tests and acceptance criteria

- [ ] Field appears immediately after Account Name in Add Account.
- [ ] Search matches institution name and approved aliases, case-insensitively.
- [ ] Options filter correctly for selected country.
- [ ] Switching country refreshes options and handles a now-inapplicable selection explicitly.
- [ ] Manual institution entry works for missing institutions.
- [ ] Empty search and no-result states are understandable.
- [ ] Keyboard, screen-reader, focus, and touch interactions work.
- [ ] Picker is usable inside mobile modal/sheet and is not obscured by the sticky Add Account action or on-screen keyboard.
- [ ] Existing saved free-text institutions remain visible and editable.
- [ ] Non-bank account types can be created without choosing a bank.
- [ ] Add, edit, validation, and persistence tests pass; existing account and financial calculation tests remain green.
- [ ] No account balances or credentials are sent to a third-party institution directory.
- [ ] CI output and test evidence are recorded; do not claim production verification from documentation or unit tests alone.

## Implementation handoff

First inspect the real Add Account component and country preference source. Implement the smallest compatible change, reuse existing design-system combobox patterns, add a maintained catalog module and tests, and document catalog provenance. Do not merge or deploy until tests pass and mobile layout behavior has been checked. Keep this feature scoped; no production settings, secrets, account schema/RLS, or unrelated financial logic changes without a separately reviewed need.
