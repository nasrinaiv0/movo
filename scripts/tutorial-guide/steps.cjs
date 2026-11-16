// The guided tour, in order. `title` and `text` must match TOUR_STEPS in src/components/FeatureTour.js (a test checks
// this); they are also what the narrator says. `image` names the screenshot. `focus` (CSS selectors, or @names
// resolved in capture.cjs) or `group` (Settings group titles) says what stays sharp while the rest of the screenshot
// is blurred. Neither means the whole screen stays sharp.
const STEPS = [
  { id: 'welcome', image: 'home-top', title: 'Welcome to MOVO', text: 'Your money, in one calm place. This short tour shows you around.' },
  { id: 'balance', image: 'home-top', focus: ['.balance-card', '.stat-grid'], title: 'Your balance at a glance', text: 'Home shows your total balance, with this month’s income, expenses and savings.' },
  { id: 'planning', image: 'home-planning', focus: ['.fp-home'], title: 'Know where you stand', text: 'Net worth, bills due, loans and goals sit together in Financial planning.' },
  { id: 'flow', image: 'home-flow', focus: ['.flow-card'], title: 'See where it goes', text: 'Money Flow charts what came in and what went out, by day, week, month or year.' },
  { id: 'budgets', image: 'home-budgets', focus: ['.budget-card'], title: 'Budgets and goals', text: 'Set monthly budgets and savings goals, and watch your progress.' },
  { id: 'wallet', image: 'wallet-cards', focus: ['.card-pile'], title: 'Your cards in Wallet', text: 'Add your banks, cards, e-wallets and cash. You enter the balances. MOVO never connects to your bank.' },
  { id: 'accounts', image: 'wallet-accounts', focus: ['.wallet-card-grid'], title: 'Accounts and store cards', text: 'Every account has its own card. Keep loyalty and membership cards here too, with their points.' },
  { id: 'add', image: 'add', focus: ['[role="dialog"]'], title: 'Log in seconds', text: 'Tap plus, enter the amount and pick a category. You can add a receipt too.' },
  { id: 'scan', image: 'scan', focus: ['.scan-thumb', '.scan-ai-summary'], title: 'Scan receipts with AI', text: 'With your permission, AI reads the store, total and items from a photo. Check them, choose the account and log it. Included in Pro.' },
  { id: 'chat', image: 'chat', focus: ['@chat'], title: 'Or tell NasrinAI', text: 'Type “Mang Inasal 250” and it is logged for you. Ask about your spending any time.' },
  { id: 'automation', image: 'autolog', focus: ['.al-status', '.al-modes'], title: 'Automatic logging', text: 'Phone automations can log your Apple Pay and Google Pay payments, bank app messages and voice entries. Included in Pro+.' },
  { id: 'transactions', image: 'transactions', focus: ['@rows'], title: 'Every record in one list', text: 'Search and filter your transactions. Each row shows the balance after it.' },
  { id: 'subscriptions', image: 'subscriptions', focus: ['.sub-list'], title: 'Never miss a renewal', text: 'Track your subscriptions and see what renews next.' },
  { id: 'menu', image: 'menu', focus: ['@menu'], title: 'More tools in Menu', text: 'Cashback, scheduled payments, exchange rates, crypto and stock watchlists, spending limits and your archive.' },
  { id: 'appearance', image: 'settings-appearance', group: ['Appearance'], title: 'Make it yours', text: 'Choose a theme, text size, language and home currency in Settings.' },
  { id: 'security', image: 'settings-security', group: ['Security & Privacy'], title: 'Your data stays yours', text: 'Lock the app with a passcode. Clear your data or delete your account any time.' },
  { id: 'sync', image: 'settings-sync', group: ['Data & Sync'], title: 'Sync across devices', text: 'Cloud Sync keeps your records up to date on every device you sign in to.' },
  { id: 'logos', image: 'subscriptions', focus: ['@notice'], title: 'About logos', text: 'Bank and brand logos only help you recognise your accounts. MOVO is not affiliated with them, and never moves your money.' },
  { id: 'pro', image: 'pro', focus: ['[role="dialog"]'], title: 'Your first month of Pro is free', text: 'Cloud Sync, insights and full NasrinAI. No payment needed.' },
  { id: 'done', image: 'home-top', title: 'You’re all set', text: 'Replay this tour any time from Settings.' },
];
// How the narrator should say product names (the captions keep the real spelling).
const SAY = [[/MOVO/g, 'Mowvo'], [/NasrinAI/g, 'Nasrin AI'], [/Mang Inasal 250/g, 'Mahng Inasahl two fifty'], [/“|”/g, ''], [/’/g, "'"], [/e-wallets/g, 'e wallets'], [/Pro\+/g, 'Pro plus']];
const narration = step => SAY.reduce((s, [a, b]) => s.replace(a, b), `${step.title}. ${step.text}`);
module.exports = { STEPS, narration };
if (require.main === module) console.log(JSON.stringify(STEPS.map(s => ({ id: s.id, say: narration(s) }))));
