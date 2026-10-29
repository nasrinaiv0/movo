/**
 * Sample data shown until the user signs in. Every record is flagged `source: 'Sample'`
 * so it can be removed. Balances are plain numbers, not verified bank balances.
 */
export const demoAccounts = [
  { id: 'demo-metrobank-card', name: 'Metrobank', account_type: 'card', institution_name: 'Visa', mask: '1234', balance: 27500, currency: 'PHP', brand: 'blue' },
  { id: 'demo-bpi-card', name: 'BPI', account_type: 'card', institution_name: 'Mastercard', mask: '5678', balance: 20750, currency: 'PHP', brand: 'red' },
  { id: 'demo-metrobank-savings', name: 'Metrobank Savings', account_type: 'bank', institution_name: 'Metrobank', mask: '1234', balance: 25000, currency: 'PHP', brand: 'blue' },
  { id: 'demo-bpi-savings', name: 'BPI Savings', account_type: 'bank', institution_name: 'BPI', mask: '5678', balance: 20350, currency: 'PHP', brand: 'red' },
  { id: 'demo-gotyme', name: 'GoTyme Bank', account_type: 'bank', institution_name: 'GoTyme', mask: '9012', balance: 12450, currency: 'PHP', brand: 'teal' },
  { id: 'demo-rcbc', name: 'RCBC', account_type: 'bank', institution_name: 'RCBC', mask: '3456', balance: 8000, currency: 'PHP', brand: 'indigo' },
  { id: 'demo-gcash', name: 'GCash', account_type: 'e_wallet', institution_name: 'GCash', mask: '', balance: 14400, currency: 'PHP', brand: 'blue' },
];

const tx = (id, merchant, category, amount, type, account, iso, extra = {}) => ({
  id: `demo-${id}`, merchant, category, amount, transaction_type: type, account_id: account, occurred_at: iso, source: 'Sample', ...extra,
});
const MB = 'demo-metrobank-card'; const BPI = 'demo-bpi-card'; const GC = 'demo-gcash'; const SAV = 'demo-metrobank-savings'; const BPS = 'demo-bpi-savings'; const GT = 'demo-gotyme';

export const demoTransactions = [
  tx(1, 'SM Supermarket', 'Groceries', 1250, 'expense', MB, '2026-10-28T10:24:00+08:00'),
  tx(2, 'Grab', 'Transport', 320, 'expense', MB, '2026-10-28T08:12:00+08:00', { method: 'Apple Pay' }),
  tx(3, 'Salary', 'Income', 50000, 'income', SAV, '2026-10-26T09:00:00+08:00', { method: 'Bank Transfer' }),
  tx(4, 'Netflix', 'Subscriptions', 549, 'expense', MB, '2026-10-25T16:20:00+08:00'),
  tx(5, 'Starbucks', 'Food & drinks', 249, 'expense', MB, '2026-10-25T11:45:00+08:00'),
  tx(6, 'Shell', 'Transport', 2500, 'expense', MB, '2026-10-24T17:10:00+08:00'),
  tx(7, 'Received from Juan', 'Income', 5000, 'income', GC, '2026-10-24T09:20:00+08:00'),
  tx(8, 'Received from Client', 'Income', 15000, 'income', SAV, '2026-10-25T15:20:00+08:00'),
  tx(9, 'Freelance project', 'Income', 15000, 'income', SAV, '2026-10-12T11:00:00+08:00'),
  tx(10, 'Puregold', 'Groceries', 4200, 'expense', MB, '2026-10-20T18:30:00+08:00'),
  tx(11, 'Landers', 'Groceries', 3800, 'expense', MB, '2026-10-14T13:05:00+08:00'),
  tx(12, 'Jollibee', 'Food & drinks', 1972, 'expense', GC, '2026-10-09T12:40:00+08:00'),
  tx(13, 'Mang Inasal', 'Food & drinks', 389, 'expense', GC, '2026-10-05T12:10:00+08:00'),
  tx(14, 'Uniqlo', 'Shopping', 3290, 'expense', MB, '2026-10-18T16:00:00+08:00'),
  tx(15, 'Lazada', 'Shopping', 2830, 'expense', BPI, '2026-10-11T21:15:00+08:00'),
  tx(16, 'Miniso', 'Shopping', 1500, 'expense', MB, '2026-10-03T15:30:00+08:00'),
  tx(17, 'Meralco', 'Bills', 3200, 'expense', SAV, '2026-10-15T10:00:00+08:00'),
  tx(18, 'PLDT', 'Bills', 1999, 'expense', SAV, '2026-10-07T10:00:00+08:00'),
  tx(19, 'Globe', 'Bills', 1032, 'expense', GC, '2026-10-12T09:30:00+08:00'),
  tx(20, 'Grab', 'Transport', 1260, 'expense', MB, '2026-10-17T07:50:00+08:00', { method: 'Apple Pay' }),
  tx(21, 'Angkas', 'Transport', 1000, 'expense', GC, '2026-10-08T08:20:00+08:00'),
  tx(22, 'Mercury Drug', 'Health', 1860, 'expense', MB, '2026-10-19T14:25:00+08:00'),
  tx(23, 'Cinema', 'Entertainment', 1150, 'expense', MB, '2026-10-16T20:00:00+08:00'),
  tx(24, 'Tuition', 'Education', 6000, 'expense', SAV, '2026-10-01T09:00:00+08:00'),
  tx(25, 'Gift', 'Other', 2000, 'expense', GC, '2026-10-13T17:00:00+08:00'),
  tx(26, 'Transfer to BPI', 'Transfer', 2000, 'transfer', GT, '2026-10-27T11:15:00+08:00', { transfer_to_account_id: BPS }),
  tx(27, 'Transfer to Metrobank', 'Transfer', 1500, 'transfer', BPS, '2026-10-26T18:45:00+08:00', { transfer_to_account_id: SAV }),
  tx(28, 'Transfer to Savings', 'Transfer', 3000, 'transfer', GT, '2026-10-25T10:10:00+08:00', { transfer_to_account_id: SAV }),
  tx(29, 'Transfer to GoTyme', 'Transfer', 6000, 'transfer', SAV, '2026-10-18T09:00:00+08:00', { transfer_to_account_id: GT }),
  tx(30, 'Transfer to GCash', 'Transfer', 4000, 'transfer', SAV, '2026-10-10T09:00:00+08:00', { transfer_to_account_id: GC }),
  tx(31, 'Transfer to BPI', 'Transfer', 1700, 'transfer', GT, '2026-10-04T09:00:00+08:00', { transfer_to_account_id: BPS }),
];

/** Sample comparison figures; real accounts get real month-over-month maths. */
export const demoDeltas = { balance: 12, income: 8, expenses: 5, savings: 12, spent: 5, transfers: 12 };

export const demoNotifications = [
  { id: 'n-login', kind: 'Account', icon: 'bell', tone: 'orange', title: 'New Login', body: 'A new login from iPhone was detected', at: '2026-10-28T08:42:00+08:00' },
  { id: 'n-ai', kind: 'System', icon: 'spark', tone: 'violet', title: 'NasrinAI Update', body: 'New feature available: Video Generation', at: '2026-10-28T07:30:00+08:00' },
  { id: 'n-summary', kind: 'System', icon: 'chart', tone: 'teal', title: 'Monthly Summary Ready', body: 'Your October financial summary is ready', at: '2026-10-26T08:00:00+08:00' },
  { id: 'n-offer', kind: 'System', icon: 'gift', tone: 'violet', title: 'Special Offer', body: 'Get 3 months of NasrinAI Max', at: '2026-10-26T07:00:00+08:00' },
];
