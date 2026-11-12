// Invented sample records for the store screenshots: a fictional person, no real data, and no bank, merchant or card-network brands.
const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const A = { pay: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', sav: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002', wal: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003', trv: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004', cash: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005', crd: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006', inv: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000007' };
const accounts = [
  { id: A.pay, name: 'Payroll Account', account_type: 'bank', institution_name: '', currency: 'PHP', opening_balance: 38250, is_archived: false, display_order: 0 },
  { id: A.crd, name: 'Everyday Card', account_type: 'card', institution_name: '', currency: 'PHP', opening_balance: 28480.5, is_archived: false, display_order: 1 },
  { id: A.sav, name: 'Rainy Day Savings', account_type: 'bank', institution_name: '', currency: 'PHP', opening_balance: 64200, is_archived: false, display_order: 2 },
  { id: A.wal, name: 'Daily Wallet', account_type: 'e_wallet', institution_name: '', currency: 'PHP', opening_balance: 4860, is_archived: false, display_order: 3 },
  { id: A.trv, name: 'Travel Card', account_type: 'card', institution_name: '', currency: 'PHP', opening_balance: 9320, is_archived: false, display_order: 4 },
  { id: A.cash, name: 'Cash', account_type: 'cash', institution_name: '', currency: 'PHP', opening_balance: 3150, is_archived: false, display_order: 5 },
];
let n = 0;
const t = (merchant, category, amount, type, acct, iso) => ({ id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(++n).padStart(12, '0')}`, account_id: acct, transfer_to_account_id: null, transaction_type: type, amount, currency: 'PHP', merchant, category, note: null, occurred_at: iso, source: 'manual', external_reference: null, payment_reference: null, receipt_note: null, receipt_path: null, schedule_id: null });
const transactions = [
  // October
  t('Salary', 'income', 42000, 'income', A.pay, '2026-10-15T01:00:00Z'),
  t('Salary', 'income', 42000, 'income', A.pay, '2026-10-31T17:00:00Z'),
  t('Design project', 'income', 15500, 'income', A.wal, '2026-10-21T03:00:00Z'),
  t('Rent', 'housing:rent', 18000, 'expense', A.pay, '2026-10-02T02:00:00Z'),
  t('Electric bill', 'bills:electricity', 2640, 'expense', A.pay, '2026-10-09T02:00:00Z'),
  t('Water bill', 'bills:water', 610, 'expense', A.pay, '2026-10-11T02:00:00Z'),
  t('Weekly groceries', 'food:groceries', 3240, 'expense', A.crd, '2026-10-05T08:30:00Z'),
  t('Weekly groceries', 'food:groceries', 2875, 'expense', A.crd, '2026-10-19T08:30:00Z'),
  t('Ramen night', 'food:restaurants', 780, 'expense', A.crd, '2026-10-10T11:10:00Z'),
  t('Morning coffee', 'food:coffee_and_tea', 185, 'expense', A.wal, '2026-10-13T00:15:00Z'),
  t('Ride to work', 'transport:ride_hailing', 240, 'expense', A.wal, '2026-10-14T00:30:00Z'),
  t('Running shoes', 'shopping:shoes', 4290, 'expense', A.crd, '2026-10-24T09:00:00Z'),
  t('Pharmacy', 'health:medicine_and_pharmacy', 520, 'expense', A.cash, '2026-10-26T07:00:00Z'),
  t('To savings', 'transfer', 8000, 'transfer', A.pay, '2026-10-16T02:00:00Z'),
  // November
  t('Weekly groceries', 'food:groceries', 3080, 'expense', A.crd, '2026-11-02T08:20:00Z'),
  t('Morning coffee', 'food:coffee_and_tea', 185, 'expense', A.wal, '2026-11-03T00:10:00Z'),
  t('Ride to work', 'transport:ride_hailing', 220, 'expense', A.wal, '2026-11-03T00:35:00Z'),
  t('Lunch with team', 'food:restaurants', 640, 'expense', A.crd, '2026-11-04T04:20:00Z'),
  t('Phone plan', 'bills:mobile_phone', 999, 'expense', A.pay, '2026-11-05T03:00:00Z'),
  t('Morning coffee', 'food:coffee_and_tea', 165, 'expense', A.wal, '2026-11-05T00:20:00Z'),
  t('Bookstore', 'shopping', 1150, 'expense', A.crd, '2026-11-06T10:00:00Z'),
  t('Gym class', 'lifestyle:gym_membership', 450, 'expense', A.cash, '2026-11-06T11:30:00Z'),
  t('Ride home', 'transport:ride_hailing', 310, 'expense', A.wal, '2026-11-07T12:40:00Z'),
  t('Farmers market', 'food:groceries', 1260, 'expense', A.cash, '2026-11-08T01:30:00Z'),
  t('Brunch', 'food:restaurants', 920, 'expense', A.crd, '2026-11-08T03:30:00Z'),
  t('Electric bill', 'bills:electricity', 2480, 'expense', A.pay, '2026-11-09T02:00:00Z'),
  t('Design project', 'income', 9800, 'income', A.wal, '2026-11-09T06:00:00Z'),
  t('Weekly groceries', 'food:groceries', 2960, 'expense', A.crd, '2026-11-09T08:30:00Z'),
  t('Morning coffee', 'food:coffee_and_tea', 185, 'expense', A.wal, '2026-11-10T00:15:00Z'),
  t('Movie night', 'entertainment:movies', 760, 'expense', A.crd, '2026-11-10T12:00:00Z'),
  t('Ride to work', 'transport:ride_hailing', 235, 'expense', A.wal, '2026-11-11T00:30:00Z'),
  t('To savings', 'transfer', 6000, 'transfer', A.pay, '2026-11-11T02:00:00Z'),
  t('Lunch', 'food:restaurants', 285, 'expense', A.wal, '2026-11-11T04:30:00Z'),
  t('Morning coffee', 'food:coffee_and_tea', 175, 'expense', A.wal, '2026-11-12T00:10:00Z'),
];
transactions.filter(x => x.transaction_type === 'transfer').forEach(x => { x.transfer_to_account_id = A.sav; });
const prefsBase = {
  onboarded: true, planWelcomeSeen: true, tutorialSeen: true, legalAccepted: '2026-11-11', legalAcceptedAt: '2026-11-11T08:00:00.000Z',
  theme: 'light', briefing: false, nasrinPrivacyAccepted: true, profileName: 'Ana Reyes',
  accountStyles: {
    [A.crd]: { mask: '4821', chip: 'gold', contactless: true, cardKind: 'debit' },
    [A.trv]: { mask: '7093', chip: 'silver', contactless: true, cardKind: 'credit', creditLimit: 50000 },
    [A.pay]: { mask: '3651' }, [A.sav]: { mask: '1290' },
  },
  subscriptions: [
    { id: 'sub-music', status: 'active', color: '#e5484d', name: 'Music Plus', amount: 279, currency: 'PHP', cycle: 'monthly', start: '2026-11-16', category: 'Entertainment', accountId: A.crd },
    { id: 'sub-cloud', status: 'active', color: '#2f80ed', name: 'Cloud Storage', amount: 149, currency: 'PHP', cycle: 'monthly', start: '2026-11-18', category: 'Utilities', accountId: A.pay },
    { id: 'sub-gym', status: 'active', color: '#f08a1e', name: 'Gym Membership', amount: 1800, currency: 'PHP', cycle: 'monthly', start: '2026-11-21', category: 'Health', accountId: A.pay },
    { id: 'sub-news', status: 'active', color: '#334155', name: 'Daily News', amount: 199, currency: 'PHP', cycle: 'monthly', start: '2026-11-26', category: 'Entertainment', accountId: A.crd },
    { id: 'sub-stream', status: 'active', color: '#7c4dff', name: 'Movie Streaming', amount: 549, currency: 'PHP', cycle: 'monthly', start: '2026-11-28', category: 'Entertainment', accountId: A.crd },
  ],
  budgets: [
    { id: 'bud-food', category: 'food:restaurants', amount: 6000, currency: 'PHP' },
    { id: 'bud-groc', category: 'food:groceries', amount: 12000, currency: 'PHP' },
    { id: 'bud-transport', category: 'transport:ride_hailing', amount: 2500, currency: 'PHP' },
    { id: 'bud-shop', category: 'Shopping', amount: 4000, currency: 'PHP' },
  ],
  plans: [
    { id: 'plan-emergency', name: 'Emergency fund', target: 120000, saved: 78200, currency: 'PHP' },
    { id: 'plan-trip', name: 'Kyoto trip', target: 85000, saved: 31500, currency: 'PHP' },
  ],
  cardStyles: { [A.pay]: 'finish:gold', [A.crd]: 'finish:black', [A.sav]: 'finish:platinum', [A.wal]: 'finish:green', [A.trv]: 'finish:gradient' },
  streak: { count: 34, last: new Date().toLocaleDateString('en-CA'), best: 34 },
};
const budgetRows = [['food', 14000], ['transport', 2500], ['bills', 4500], ['entertainment', 1500], ['shopping', 4000]].map(([category, monthly_limit], i) => ({ id: `cccccccc-cccc-4ccc-8ccc-${String(i + 1).padStart(12, '0')}`, category, monthly_limit, currency: 'PHP', starts_on: '2026-11-01', is_active: true }));
module.exports = { OWNER, A, accounts, transactions, prefsBase, budgetRows };
