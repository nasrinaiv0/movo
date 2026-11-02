# MOVO Transaction Categories & Auto-Categorization

**Status:** Product and implementation specification  
**Scope:** Transaction entry, categorization, reporting, budgeting, imports, receipt scans, and automated transaction logging.

## 1. Goals

- Make everyday transaction entry fast and understandable.
- Support detailed personal and business expense tracking without overwhelming the main UI.
- Use a consistent category taxonomy across manual entry, chat, receipt scanning, CSV imports, and supported automation sources.
- Keep accounting treatment separate from display categories so transfers, refunds, debt principal, and card settlements are not double-counted.
- Allow users to correct a category and retain that choice where appropriate.

## 2. Category hierarchy and transaction fields

Each transaction should support these distinct fields where applicable:

| Field | Meaning | Example |
|---|---|---|
| Transaction type / direction | Accounting treatment | Expense |
| Primary category | Broad grouping | Transportation |
| Subcategory | Specific purpose | Fuel / Gas |
| Merchant / counterparty | Who was paid or who paid the user | Shell |
| Account | Account/card/wallet involved | BDO Debit Card |
| Payment method / source | How the transaction was detected or paid | Card / Apple Pay |
| Date and time | Transaction occurrence time, where available | Local transaction time |
| Amount and currency | Signed or direction-aware monetary value | PHP 1,500.00 |
| Status | Lifecycle state | Pending / posted / reversed |
| Reference ID | Bank, receipt, invoice, or provider reference | Provider reference |
| Tags | Optional user context | Work, Family, Reimbursable |
| Categorization metadata | How confident the match is and why | User-confirmed / rule / AI |

Do not conflate the account that owns the funds with the automation source. For example, Apple Pay is a payment/detection source; the underlying card's bank account remains the account.

## 3. Primary expense categories and subcategories

### 3.1 Food & Dining
- Groceries
- Restaurants
- Fast Food
- Coffee & Tea
- Food Delivery
- Snacks & Desserts
- Bakery
- Alcohol & Beverages
- Convenience Stores
- Dining Out

### 3.2 Transportation
- Fuel / Gas
- Public Transportation
- Taxi
- Ride-Hailing
- Parking
- Toll Fees
- Car Maintenance
- Car Wash
- Vehicle Registration
- Car Insurance
- Motorcycle Expenses
- Bicycle Expenses
- Car Rental
- Airfare
- Train & Bus Tickets
- Ferry Tickets

### 3.3 Housing & Home
- Rent
- Mortgage
- Home Repairs
- Home Maintenance
- Furniture
- Home Appliances
- Home Supplies
- Cleaning Services
- Home Improvement
- Property Taxes
- Condo Association Fees
- Security Services

### 3.4 Bills & Utilities
- Electricity
- Water
- Internet
- Mobile Phone
- Landline
- Cable TV
- Streaming Services
- Gas Utility
- Waste Collection
- Association Dues
- Cloud Storage
- Software Subscriptions

### 3.5 Shopping & Personal Items
- Clothing
- Shoes
- Bags & Accessories
- Electronics
- Gadgets
- Household Items
- Beauty Products
- Personal Care
- Jewelry
- Online Shopping
- Gifts
- General Merchandise

### 3.6 Health & Medical
- Doctor Consultation
- Hospital
- Medicine & Pharmacy
- Laboratory Tests
- Dental Care
- Eye Care
- Health Insurance
- Medical Equipment
- Vitamins & Supplements
- Therapy
- Fitness & Wellness

### 3.7 Personal Care & Lifestyle
- Haircut & Barber
- Salon & Spa
- Skincare
- Cosmetics
- Massage
- Laundry
- Dry Cleaning
- Gym Membership
- Sports & Recreation
- Hobbies
- Personal Services

### 3.8 Entertainment & Recreation
- Movies
- Concerts
- Events & Tickets
- Gaming
- Video Games
- Music Subscriptions
- Streaming Entertainment
- Books
- Hobbies
- Amusement Parks
- Nightlife
- Sports Activities

### 3.9 Travel & Accommodation
- Hotels
- Resorts
- Vacation Rentals
- Flights
- Travel Packages
- Travel Insurance
- Local Tours
- International Tours
- Travel Documents
- Visa Fees
- Luggage
- Travel Supplies

### 3.10 Education & Learning
- Tuition Fees
- School Supplies
- Books & References
- Online Courses
- Training
- Certifications
- School Transportation
- Examination Fees
- Educational Software
- Seminars & Workshops

### 3.11 Family & Children
- Childcare
- Baby Supplies
- Children's Clothing
- School Expenses
- Toys
- Allowance
- Family Support
- Elderly Care
- Family Activities
- Child Health Expenses

### 3.12 Pets
- Pet Food
- Veterinary Care
- Pet Medicine
- Grooming
- Pet Supplies
- Pet Insurance
- Pet Boarding
- Pet Training
- Pet Accessories

### 3.13 Financial Expenses
- Bank Fees
- ATM Withdrawal Fees
- Credit Card Interest
- Loan Interest
- Loan Fees
- Annual Card Fees
- Foreign Transaction Fees
- Currency Conversion Fees
- Investment Fees
- Financial Advisory Fees
- Late Payment Fees
- Overdraft Fees

### 3.14 Debt Payments
- Credit Card Payment
- Personal Loan Payment
- Home Loan Payment
- Car Loan Payment
- Student Loan Payment
- Business Loan Payment
- Buy Now, Pay Later
- Installment Payments
- Other Debt Payments

### 3.15 Insurance
- Health Insurance
- Life Insurance
- Car Insurance
- Home Insurance
- Travel Insurance
- Accident Insurance
- Property Insurance
- Business Insurance
- Other Insurance

### 3.16 Work & Professional Expenses
- Office Supplies
- Work Equipment
- Software & Tools
- Internet for Work
- Transportation for Work
- Business Meals
- Professional Memberships
- Work Clothing
- Coworking Space
- Professional Services
- Advertising
- Training & Certifications

### 3.17 Business Expenses
- Rent & Office Space
- Employee Salaries
- Contractor Payments
- Marketing & Advertising
- Business Utilities
- Inventory & Supplies
- Equipment
- Shipping & Delivery
- Payment Processing Fees
- Business Travel
- Accounting Services
- Legal Services
- Taxes & Licenses
- Business Insurance

### 3.18 Gifts & Donations
- Birthday Gifts
- Holiday Gifts
- Wedding Gifts
- Charitable Donations
- Religious Donations
- Community Support
- Fundraising
- Personal Contributions

### 3.19 Government & Legal
- Income Tax
- Property Tax
- Local Government Fees
- Permits & Licenses
- Passport Fees
- Legal Fees
- Document Processing
- Registration Fees
- Government Contributions

### 3.20 Cash & ATM
- ATM Withdrawal
- Cash Advance
- Cash Purchase
- Cash Deposit Fees
- Cash Handling Fees

### 3.21 Digital Services & Technology
- Mobile Applications
- AI Subscriptions
- Website Hosting
- Domains
- Cloud Computing
- Digital Products
- Online Storage
- Gaming Subscriptions
- VPN Services
- Digital Memberships
- API Usage
- Web Services

### 3.22 Miscellaneous
- Uncategorized Expense
- One-Time Expense
- Unexpected Expense
- Other Personal Expense
- Other Household Expense
- Other Business Expense

## 4. Non-expense transaction types

These are transaction types or accounting classifications, not additional expense categories. They must remain distinct from expenses in reports.

| Type | Examples | Accounting/reporting rule |
|---|---|---|
| Income | Salary, freelance income, business income, commissions, bonuses, interest earned | Count as income when recognized/posted |
| Internal transfer | Own-account transfer, bank-to-bank transfer, card-to-wallet transfer | Changes account balances; not income or expense |
| Debt received | Loan proceeds, borrowed money | Liability financing; not income |
| Debt repayment | Principal and interest components | Split principal from interest when details are available |
| Receivable collection | Money lent and returned | Principal returned is not income; separately identify interest if any |
| Reimbursement | Work or shared expense reimbursement | Link to original expense when possible; avoid treating reimbursement as ordinary income by default |
| Refund / reversal | Returned purchase, canceled transaction, reversed charge | Link to original transaction and reverse or adjust it; avoid recording as unrelated income |
| Savings allocation | Emergency fund, goal-based savings | Transfer/reservation, not spending by itself |
| Investment | Stocks, bonds, mutual funds, ETFs, other investments | Treat purchase/sale and realized income according to investment accounting rules; avoid treating an account transfer as consumption |
| Tax | Income tax, business tax, withholding tax | Categorize by tax purpose and applicable accounting treatment |
| Donation | Charity, community support, other contributions | Expense only when money or goods are actually donated |

## 5. Clean top-level categories for the main transaction screen

Use a compact set of 12 visible choices for quick entry:

1. Food & Dining
2. Transportation
3. Housing & Home
4. Bills & Utilities
5. Shopping
6. Health & Medical
7. Personal Care
8. Entertainment
9. Travel
10. Education
11. Financial & Debt
12. Other

The detailed taxonomy remains available in the subcategory picker and Manage Categories. Income and Transfers should remain separate transaction directions/tabs rather than being mixed into the expense picker.

## 6. Philippines-localized options

Where relevant to the user's locale, support these as searchable subcategories or merchant aliases. Do not require them for every user and do not hard-code a merchant as a category when the transaction semantics are unclear.

| Category | Local examples |
|---|---|
| Transportation | Jeepney, bus, tricycle, MRT/LRT, Grab, taxi, habal-habal |
| Digital payments | GCash, Maya, digital-wallet fees |
| Government contributions | SSS, PhilHealth, Pag-IBIG |
| Bills | Meralco, water district, prepaid load, postpaid plans |
| Shopping | Shopee, Lazada, TikTok Shop |
| Food | Carinderia, sari-sari store, palengke, food delivery |
| Banking | InstaPay, PESONet, bank transfer fees, ATM fees |
| Housing | Rent, condominium dues, applicable local fees |
| Education | Tuition, school contributions, review centers |
| Family | Remittances, family allowance, household support |

Merchant names such as Grab, Jollibee, Meralco, Netflix, Shell, Shopee, or Lazada are matching signals, not immutable categories. The same merchant may sell multiple types of goods or services.

## 7. Auto-categorization requirements

Categorization should use the available combination of:
- Merchant and normalized merchant alias
- Transaction description and bank notification text
- Amount, currency, and transaction direction
- Account type and account/card relationship
- Payment method and automation source
- Reference IDs and links to previously recorded transactions
- User-selected category history, where appropriate

Suggested examples:
- A clear ride-hailing fare → Transportation / Ride-Hailing
- A clear restaurant purchase → Food & Dining / Restaurants or Fast Food
- A utility bill → Bills & Utilities / relevant utility
- A recognized recurring streaming charge → Entertainment / Streaming Entertainment
- A fuel-station purchase → Transportation / Fuel / Gas only when transaction context supports fuel
- A bank transfer → determine whether it is internal, external, a purchase, a loan, or another transfer before categorizing
- A credit-card settlement → debt settlement or transfer according to the account model, never a second copy of the original purchases

### Confidence and review
- High-confidence, unambiguous matches may be categorized automatically.
- Ambiguous or low-confidence matches should use Uncategorized / Needs review instead of pretending certainty.
- The user must be able to change category and subcategory.
- Store categorization provenance (e.g. user-selected, deterministic rule, AI suggestion) if supported by the data model.
- Do not expose internal confidence scores as if they were financial facts.
- User corrections should take precedence over weak merchant-name guesses.

## 8. Accounting, deduplication, and automation safeguards

1. **Credit-card settlement is not a second purchase.** If card purchases were already logged, paying the card balance must not inflate expense totals again.
2. **ATM withdrawals are transfers to cash by default.** Record cash purchases as expenses when spent; do not count both withdrawal and cash purchase as spending.
3. **Own-account transfers are not income or expense.** Transfers may update the tracked account balances but must not inflate income, expense, or net activity totals.
4. **Loan principal is not interest expense.** Split components when known; if not known, preserve the payment as a debt payment and avoid inventing a split.
5. **Refunds and reversals should reference the original transaction** when possible and adjust the relevant category/period according to the reporting policy.
6. **Receivable principal returned is not income.** Track interest separately if applicable.
7. **Savings transfers are not expenses.** A savings goal reservation must not be confused with a new asset or an actual cash movement.
8. **One real transaction should produce one canonical ledger record.** Apple Pay, Google Pay, bank notifications, Siri/Android voice, chat, manual entry, and receipt scans can all observe the same transaction.
9. Use a stable provider transaction/reference ID when available. Otherwise use a normalized deduplication fingerprint incorporating direction, amount, currency, date/time tolerance, merchant, account, and reference details where available.
10. Reuse MOVO's existing duplicate-guard behavior and CSV import fingerprinting; do not introduce a competing deduplication rule that conflicts with existing behavior.
11. When duplicate evidence is uncertain, warn the user or route the item for review rather than silently discarding a potentially legitimate transaction.
12. Keep payment/detection source separate from the account and category. Apple Pay is not itself the underlying bank account.
13. Pending, posted, failed, reversed, and refunded states must not be counted as though they were all finalized expenses.
14. Category labels and subcategories should be stable identifiers in storage, with display labels separated where the current schema supports it. Avoid using translated labels as database keys.

## 9. Reporting and budgeting rules

- Expense breakdowns should group by primary category and optionally subcategory.
- Totals must be based on eligible posted ledger entries and the application's documented treatment of pending/reversed/refunded entries.
- Transfers should not inflate income, expenses, or net activity.
- Savings balances and monthly net cash flow are different measures.
- Category budgets should compare eligible expenses against the chosen period and category, excluding internal transfers and duplicate settlements.
- Support filtering by date range, account, category, subcategory, merchant, transaction source, tags, and status where available.
- Preserve the transaction's original currency and convert only when a defined exchange-rate source and timestamp are available. Do not present an unverified conversion as exact.
- Business and personal expenses may share the taxonomy but should be separable with tags or an explicit profile/bookkeeping scope.

## 10. Acceptance checklist

- [ ] The main expense picker shows the 12 compact categories.
- [ ] Users can select a subcategory or keep a transaction as Uncategorized / Needs review.
- [ ] Income and transfers remain separate from expenses.
- [ ] Manual entry, chat logging, receipt scanning, CSV import, and automation paths use consistent categorization rules.
- [ ] Users can edit category and subcategory.
- [ ] Internal transfers do not affect income/expense totals.
- [ ] Credit-card settlements do not duplicate purchase expenses.
- [ ] ATM withdrawals are not counted as expenses until spending is recorded, unless explicitly classified as a cash advance or fee.
- [ ] Loan principal and interest are not silently conflated when a split is available.
- [ ] Refunds/reversals are linked to original records when possible.
- [ ] Duplicate safeguards cover overlapping automation sources and preserve a user override path where appropriate.
- [ ] Philippine localized terms are supported without making the taxonomy Philippines-only.
- [ ] Tests cover category mapping, accounting treatment, source overlap, and duplicate prevention.

## 11. Implementation note

This document defines the target taxonomy and behavior; it does **not** claim that every listed category, rule, integration, or acceptance item is already implemented. Before changing code or database constraints, inspect the current category constants, transaction schema, reports, import/chat/receipt paths, automation handlers, and tests. Prefer a backward-compatible migration and add regression tests before replacing existing category IDs or persisted values.
