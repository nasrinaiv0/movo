import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import './App.css';
import AuthPanel from './components/AuthPanel';
import Icon, { NasrinMark } from './components/Icon';
import { Sheet, Toggle } from './components/ui';
import Home from './screens/Home';
import Wallet from './screens/Wallet';
import Transactions from './screens/Transactions';
import Profile, { EditProfile } from './screens/Profile';
import Settings, { Appearance, NotificationSettings, ThemeSheet } from './screens/Settings';
import Notifications, { NotificationDetail, buildNotifications } from './screens/Notifications';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { revealChange } from './lib/motion';
import SearchOverlay from './components/SearchOverlay';
import { getCurrentSession, listAccounts, listTransactions, createAccount, updateAccount, createTransaction, updateTransaction, deleteTransaction, signOut } from './lib/financeRepository';
import { demoAccounts, demoTransactions, demoNotifications } from './lib/demoData';
import { calculateAccountBalances, calculateExpenseCategoryTotals, calculateLedgerNet, calculateMonthlyStats, sumMoneyValues } from './lib/financeCalculations';
import { loadLocalTransactions, saveLocalTransactions, loadLocalAccounts, saveLocalAccounts, areSamplesEnabled, setSamplesEnabled, clearLocalFinanceData } from './lib/localFinanceStore';
import { parseCsvTransactions, transactionFingerprint } from './lib/csvImport';
import { money, shown, dayKey, monthKey, monthLabel, longDate, timeLabel, BUCKETS, bucketOf } from './lib/format';
import { ACCENTS } from './screens/Settings';
import NasrinAIChat from './components/NasrinAIChat';
import { TermsOfService, PrivacyPolicy } from './screens/Legal';
import HelpCenter from './screens/HelpCenter';
import { buildCsv } from './lib/csvExport';
import { clearCustomStickers } from './lib/stickers';

const PREF = 'movo.preferences.v3';
const OLD_PREF = 'movo.preferences.v2';
const categories = ['Groceries', 'Food & drinks', 'Transport', 'Shopping', 'Bills', 'Subscriptions', 'Health', 'Education', 'Entertainment', 'Other'];
const accountTypes = [{ value: 'bank', label: 'Bank account' }, { value: 'card', label: 'Credit / debit card' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'cash', label: 'Cash' }, { value: 'investment', label: 'Investment' }, { value: 'other', label: 'Other' }];
const ACCOUNT_CURRENCIES = {
  PHP: 'Philippine peso', USD: 'US dollar', EUR: 'Euro', GBP: 'British pound',
  SGD: 'Singapore dollar', JPY: 'Japanese yen', AUD: 'Australian dollar',
  CAD: 'Canadian dollar', NZD: 'New Zealand dollar', HKD: 'Hong Kong dollar',
  CNY: 'Chinese yuan', INR: 'Indian rupee', KRW: 'South Korean won',
  MYR: 'Malaysian ringgit', IDR: 'Indonesian rupiah', THB: 'Thai baht',
  AED: 'UAE dirham', SAR: 'Saudi riyal', CHF: 'Swiss franc',
};
/* Changing these fills the new look in from the tap point. */
const APPEARANCE_KEYS = new Set(['theme', 'accent', 'glass']);
const DEFAULTS = {
  theme: 'system', glass: true, clarity: 55, accent: 'blue', customColor: '#2f6bff', showBalance: true, compact: false, categoryColors: true, displayCurrency: 'PHP',
  notifications: true, push: true, email: true, inapp: true, catTransactions: true, catAccount: true, catAi: true, catPromo: false, catReports: true,
  biometrics: true, cloudSync: true, localStorage: false, autocat: true, profileName: '', phone: '', location: '', readIds: [], cardStyles: {},
};
const ROOT_FOR = { Home: 'Home', Notifications: 'Home', NotificationDetail: 'Home', NotificationSettings: 'Home', Wallet: 'Wallet', Transactions: 'Transactions', NasrinAI: 'NasrinAI', Profile: 'Profile', Settings: 'Profile', Appearance: 'Profile', EditProfile: 'Profile', HelpCenter: 'Profile', TermsOfService: 'Profile', PrivacyPolicy: 'Profile' };
const DEPTH = { Home: 0, Wallet: 0, NasrinAI: 0, Transactions: 0, Profile: 0, Notifications: 1, Settings: 1, EditProfile: 1, 'Sign in': 1, Appearance: 2, NotificationDetail: 2, NotificationSettings: 2 };
const ORDER = { Home: 0, Wallet: 1, NasrinAI: 2, Transactions: 3, Profile: 4 };
const NAV = [['Home', 'home', 'Home'], ['Wallet', 'wallet', 'Wallet'], ['NasrinAI', 'spark', 'NasrinAI'], ['Transactions', 'list', 'Transactions'], ['Profile', 'user', 'Profile']];
const today = () => new Date().toLocaleDateString('en-CA');

function readPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREF));
    if (stored) return { ...DEFAULTS, ...stored };
    const old = JSON.parse(localStorage.getItem(OLD_PREF)) || {};
    return { ...DEFAULTS, theme: old.dark ? 'dark' : DEFAULTS.theme, accent: old.accent === 'mono' ? 'slate' : (old.accent || DEFAULTS.accent), showBalance: old.showBalance !== false };
  } catch { return { ...DEFAULTS }; }
}
const hexToRgb = (hex) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '47,107,255'; };
const monthsBack = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const pctChange = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const normalize = (t, accounts) => {
  const account = accounts.find(a => a.id === t.account_id);
  const transferTarget = accounts.find(a => a.id === t.transfer_to_account_id);
  return {
    ...t,
    type: t.transaction_type || t.type,
    date: t.occurred_at || t.date,
    amount: Number(t.amount),
    currency: t.currency || account?.currency || 'PHP',
    accountName: account?.name || t.account || 'Manual entry',
    transferToAccountName: transferTarget?.name || (t.transfer_to_account_id ? 'Unknown account' : ''),
  };
};

function useSystemDark() {
  const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [dark, setDark] = useState(!!query?.matches);
  useEffect(() => {
    if (!query?.addEventListener) return undefined;
    const fn = (e) => setDark(e.matches); query.addEventListener('change', fn); return () => query.removeEventListener('change', fn);
  }, [query]);
  return dark;
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [cloudMode, setCloudMode] = useState(false);
  const [view, setView] = useState('Home');
  const viewRef = useRef('Home');
  const [motion, setMotion] = useState('fade');
  const [scrolled, setScrolled] = useState(false);
  const lastTab = useRef(0);
  const [legalReturnView, setLegalReturnView] = useState('Profile');
  const [prefs, setPrefs] = useState(readPrefs);
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [localAccounts, setLocalAccounts] = useState(loadLocalAccounts);
  const [rawTxs, setRawTxs] = useState(() => loadLocalTransactions(demoTransactions));
  const [samplesOn, setSamplesOn] = useState(areSamplesEnabled);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [txFilter, setTxFilter] = useState('All');
  const [sortKey, setSortKey] = useState('Date');
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState('');
  const [walletFilter, setWalletFilter] = useState('All');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [nFilter, setNFilter] = useState('All');
  const [activeNotificationId, setActiveNotificationId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [localPersistenceWarning, setLocalPersistenceWarning] = useState(false);
  const pendingLocalDataRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', account_type: 'bank', institution_name: '', opening_balance: '0', currency: 'PHP' });
  const [form, setForm] = useState({ merchant: '', amount: '', transaction_type: 'expense', category: 'Groceries', account_id: '', transfer_to_account_id: '', occurred_at: today(), note: '' });
  const [csvRows, setCsvRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importAccountId, setImportAccountId] = useState('');
  const [csvImportSummary, setCsvImportSummary] = useState('');
  const systemDark = useSystemDark();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const setPref = useCallback((key, value) => {
    const apply = () => {
      setPrefs(cur => ({ ...cur, [key]: value }));
      if (key === 'displayCurrency') {
        setMonth('');
        setSelectedCardId('');
      }
    };
    if (APPEARANCE_KEYS.has(key)) revealChange(apply, flushSync); else apply();
  }, []);
  const show = prefs.showBalance !== false;
  const setShow = useCallback((v) => setPref('showBalance', !!v), [setPref]);
  useEffect(() => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }, [prefs]);
  const notify = useCallback((msg) => { setToast(msg); window.clearTimeout(window.__movoToast); window.__movoToast = window.setTimeout(() => setToast(''), 2800); }, []);
  useEffect(() => {
    const samplesSaved = setSamplesEnabled(samplesOn);
    if (cloudMode) {
      if (!pendingLocalDataRef.current) setLocalPersistenceWarning(false);
      return;
    }
    const transactionsSaved = saveLocalTransactions(rawTxs, false);
    const accountsSaved = saveLocalAccounts(localAccounts);
    const saved = transactionsSaved && accountsSaved && samplesSaved;
    if (saved) pendingLocalDataRef.current = null;
    else pendingLocalDataRef.current = { transactions: rawTxs, accounts: localAccounts, samplesOn };
    setLocalPersistenceWarning(!saved);
  }, [rawTxs, localAccounts, samplesOn, cloudMode]);
  const retryLocalPersistence = useCallback(() => {
    const pending = pendingLocalDataRef.current;
    if (cloudMode && !pending) {
      setLocalPersistenceWarning(false);
      return;
    }
    const transactionsSaved = saveLocalTransactions(pending?.transactions || rawTxs, false);
    const accountsSaved = saveLocalAccounts(pending?.accounts || localAccounts);
    const samplesSaved = setSamplesEnabled(pending ? pending.samplesOn : samplesOn);
    const saved = transactionsSaved && accountsSaved && samplesSaved;
    if (saved) pendingLocalDataRef.current = null;
    setLocalPersistenceWarning(!saved);
    notify(saved
      ? (pending ? 'Your local-only records were saved on this device. They are not synced to your cloud account.' : 'Local records saved on this device.')
      : 'Browser storage is still unavailable or full.');
  }, [rawTxs, localAccounts, samplesOn, cloudMode, notify]);

  const refreshCloud = useCallback(async (user) => {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const [a, t] = await Promise.all([listAccounts(), listTransactions()]);
      setCloudAccounts(a || []); setRawTxs(t || []); setCloudMode(true);
    } catch { setError('Could not load cloud records. Check your connection and try again.'); setCloudMode(false); }
    finally { setBusy(false); setAuthReady(true); }
  }, []);
  useEffect(() => {
    if (sheet?.name === 'account' && sheet.type) setAccountForm(current => current.account_type === sheet.type ? current : { ...current, account_type: sheet.type });
    if (sheet?.name === 'transaction' && sheet.type) setForm(current => current.transaction_type === sheet.type ? current : { ...current, transaction_type: sheet.type });
  }, [sheet?.name, sheet?.type]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = hashParams.get('error') || hashParams.get('error_code')
      || searchParams.get('error') || searchParams.get('error_code');
    if (!oauthError) return;
    setView('Sign in');
    setError('Google sign-in could not be completed. Check the Google provider and redirect URL settings, then try again.');
    const url = new URL(window.location.href);
    ['error', 'error_code', 'error_description'].forEach((key) => url.searchParams.delete(key));
    url.hash = '';
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!supabaseConfigured || !supabase) { setAuthReady(true); return undefined; }
    getCurrentSession().then(s => { if (!mounted) return; setSession(s); setAuthReady(true); if (s?.user) refreshCloud(s.user); }).catch(() => { if (mounted) setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return; setSession(s);
      if (s?.user) refreshCloud(s.user); else {
        const pending = pendingLocalDataRef.current;
        setCloudMode(false);
        setCloudAccounts([]);
        setRawTxs(pending?.transactions || loadLocalTransactions(demoTransactions));
        setLocalAccounts(pending?.accounts || loadLocalAccounts());
        setSamplesOn(pending ? pending.samplesOn : areSamplesEnabled());
      }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  }, [refreshCloud]);

  // Keep cloud-backed finance views fresh across tabs/devices while relying on
  // Supabase RLS and user-scoped subscriptions for data isolation.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!cloudMode || !userId || !supabase) return undefined;
    let syncTimer;
    const sync = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => refreshCloud(session.user), 150);
    };
    const channel = supabase.channel(`movo-finance-sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_accounts', filter: `user_id=eq.${userId}` }, sync)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, sync)
      .subscribe();
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      supabase.removeChannel(channel);
    };
  }, [cloudMode, session?.user?.id, refreshCloud]);

  // Local-only records are also refreshed in another tab without sending them
  // to the cloud or merging them into the signed-in user's account.
  useEffect(() => {
    if (cloudMode) return undefined;
    const onStorage = (event) => {
      if (event.key && !['movo.local.transactions.v1', 'movo.local.accounts.v1', 'movo.samples.enabled.v1'].includes(event.key)) return;
      const enabled = areSamplesEnabled();
      setSamplesOn(enabled);
      setRawTxs(loadLocalTransactions(demoTransactions, enabled));
      setLocalAccounts(loadLocalAccounts());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cloudMode]);

  /* ---------- derived data ---------- */
  const baseAccounts = cloudMode ? cloudAccounts : [...(samplesOn ? demoAccounts : []), ...localAccounts];
  const txs = useMemo(() => rawTxs.map(t => normalize(t, baseAccounts)).filter(t => Number.isFinite(new Date(t.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date)), [rawTxs, baseAccounts]);
  const accountsView = useMemo(() => calculateAccountBalances(
    baseAccounts.map(a => ({ ...a, mask: a.mask || '', brand: a.brand || 'blue' })),
    txs,
  ), [baseAccounts, txs]);
  const accountsByType = useMemo(() => ({ card: accountsView.filter(a => a.account_type === 'card'), bank: accountsView.filter(a => a.account_type === 'bank'), e_wallet: accountsView.filter(a => a.account_type === 'e_wallet') }), [accountsView]);
  const displayCurrency = /^[A-Z]{3}$/.test(prefs.displayCurrency || '') ? prefs.displayCurrency : 'PHP';
  const currencyTxs = useMemo(() => txs.filter(t => (t.currency || 'PHP') === displayCurrency), [txs, displayCurrency]);
  const currencyAccountsView = useMemo(() => accountsView.filter(a => (a.currency || 'PHP') === displayCurrency), [accountsView, displayCurrency]);
  const displayAccountsByType = useMemo(() => ({
    card: currencyAccountsView.filter(a => a.account_type === 'card'),
    bank: currencyAccountsView.filter(a => a.account_type === 'bank'),
    e_wallet: currencyAccountsView.filter(a => a.account_type === 'e_wallet'),
  }), [currencyAccountsView]);
  const availableCurrencies = useMemo(() => Array.from(new Set([
    'PHP', displayCurrency,
    ...baseAccounts.map(a => a.currency || 'PHP'),
    ...txs.map(t => t.currency || 'PHP'),
  ].filter(currency => /^[A-Z]{3}$/.test(currency)))).sort(), [baseAccounts, txs, displayCurrency]);
  // Month-to-date summaries and greetings use the actual current date, not the most recent transaction date.
  const refDate = useMemo(() => new Date(), [txs]);
  const refMonth = monthKey(refDate);
  const activeMonth = month || refMonth;
  const months = useMemo(() => Array.from(new Set([refMonth, ...currencyTxs.map(t => monthKey(t.date))])).sort().reverse(), [currencyTxs, refMonth]);

  const statsFor = useCallback((key) => calculateMonthlyStats(currencyTxs, key, displayCurrency), [currencyTxs, displayCurrency]);
  const breakdownFor = useCallback((key) => {
    const totals = calculateExpenseCategoryTotals(statsFor(key).list, bucketOf);
    const total = sumMoneyValues(Object.values(totals));
    return { total, data: BUCKETS.filter(b => totals[b.key]).map(b => ({ ...b, amount: totals[b.key], percent: Math.round((totals[b.key] / total) * 100) })) };
  }, [statsFor]);
  const homeMonth = useMemo(() => statsFor(refMonth), [statsFor, refMonth]);
  const monthStats = useMemo(() => statsFor(activeMonth), [statsFor, activeMonth]);
  const stats = useMemo(() => {
    const balance = currencyAccountsView.length
      ? sumMoneyValues(currencyAccountsView.map(a => a.balance))
      : calculateLedgerNet(currencyTxs, displayCurrency);
    let running = balance - homeMonth.net; const daily = new Map();
    homeMonth.list.slice().reverse().forEach(t => { if (t.type !== 'transfer') { running += t.type === 'income' ? t.amount : -t.amount; daily.set(dayKey(t.date), running); } });
    let points = [balance - homeMonth.net, ...daily.values()];
    for (let pass = 0; pass < 3; pass += 1) points = points.map((v, i) => { const w = points.slice(Math.max(0, i - 1), i + 2); return w.reduce((s, x) => s + x, 0) / w.length; });
    return { currency: displayCurrency, balance, income: homeMonth.income, expenses: homeMonth.expenses, transfers: homeMonth.transfers, savings: homeMonth.net, trend: points.length > 1 ? points : [balance, balance] };
  }, [currencyAccountsView, currencyTxs, displayCurrency, homeMonth]);
  const deltas = useMemo(() => {
    const prev = statsFor(monthsBack(refMonth, 1));
    return { balance: pctChange(stats.balance, stats.balance - homeMonth.net), income: pctChange(homeMonth.income, prev.income), expenses: pctChange(homeMonth.expenses, prev.expenses), savings: pctChange(homeMonth.net, prev.net), spent: pctChange(homeMonth.expenses, prev.expenses), transfers: pctChange(homeMonth.transfers, prev.transfers) };
  }, [statsFor, refMonth, stats.balance, homeMonth]);
  const homeBreakdown = useMemo(() => breakdownFor(refMonth), [breakdownFor, refMonth]);
  const txBreakdown = useMemo(() => breakdownFor(activeMonth), [breakdownFor, activeMonth]);
  const monthTxs = useMemo(() => {
    const type = { Income: 'income', Expenses: 'expense', Transfers: 'transfer' }[txFilter];
    const q = search.trim().toLowerCase();
    return monthStats.list.filter(t => (!type || t.type === type) && (!q || [t.merchant, t.category, t.accountName, t.type].join(' ').toLowerCase().includes(q)));
  }, [monthStats, txFilter, search]);
  const recent = useMemo(() => currencyTxs.filter(t => t.type !== 'transfer').slice(0, 4), [currencyTxs]);
  const selectedCard = displayAccountsByType.card.find(a => a.id === selectedCardId) || displayAccountsByType.card[0];

  const allNotifications = useMemo(() => buildNotifications(txs, cloudMode || !samplesOn ? [] : demoNotifications), [txs, cloudMode, samplesOn]);
  const notifications = useMemo(() => {
    if (!prefs.notifications || !prefs.inapp) return [];
    return allNotifications.filter(n => {
      if (n.kind === 'Transactions') return prefs.catTransactions;
      if (n.kind === 'Account') return prefs.catAccount;
      if (n.kind === 'System' && /nasrinai/i.test(n.title)) return prefs.catAi;
      if (n.kind === 'System' && /offer|promotion/i.test(n.title)) return prefs.catPromo;
      if (n.kind === 'System' && /summary|report/i.test(n.title)) return prefs.catReports;
      return true;
    });
  }, [allNotifications, prefs.notifications, prefs.inapp, prefs.catTransactions, prefs.catAccount, prefs.catAi, prefs.catPromo, prefs.catReports]);
  const unread = notifications.some(n => !prefs.readIds.includes(n.id));
  const activeNotification = notifications.find(n => n.id === activeNotificationId);
  const markAllRead = () => setPref('readIds', Array.from(new Set([...prefs.readIds, ...allNotifications.map(n => n.id)])));

  const metaName = session?.user?.user_metadata?.full_name;
  const email = session?.user?.email || (samplesOn ? 'nasrin@nasrinai.com' : 'Local-only session');
  const name = prefs.profileName.trim() || metaName || (session?.user?.email ? session.user.email.split('@')[0] : 'Nasrin Abubakar');
  const user = { name, email, firstName: name.split(' ')[0], initial: name.slice(0, 1).toUpperCase() };

  /* ---------- actions ---------- */
  const go = useCallback((next, params = {}) => {
    if (params.filter) setTxFilter(params.filter);
    const prev = viewRef.current; const dPrev = DEPTH[prev] ?? 0; const dNext = DEPTH[next] ?? 0;
    setMotion(dNext > dPrev ? 'push' : dNext < dPrev ? 'pop' : (ORDER[next] ?? 0) > (ORDER[prev] ?? 0) ? 'tab-right' : (ORDER[next] ?? 0) < (ORDER[prev] ?? 0) ? 'tab-left' : 'fade');
    viewRef.current = next;
    setSheet(null); setError(''); setView(next);
    if (next !== 'Settings') setQuery('');
    try { window.scrollTo?.(0, 0); } catch { /* jsdom */ }
  }, []);
  const openLegal = useCallback((next) => {
    if (!['TermsOfService', 'PrivacyPolicy'].includes(view)) setLegalReturnView(view);
    go(next);
  }, [view, go]);
  const openNotification = (n) => { setActiveNotificationId(n.id); setPref('readIds', Array.from(new Set([...prefs.readIds, n.id]))); go('NotificationDetail'); };
  const openTx = (t) => setSheet({ name: 'tx', id: t.id });
  const openForm = (type = 'expense', accountId = '') => { setError(''); setForm(f => ({ ...f, transaction_type: type, account_id: accountId || f.account_id })); setSheet({ name: 'transaction', type }); };
  const openEditAccount = (account) => {
    setError('');
    setAccountForm({
      name: account.name || '', account_type: account.account_type || 'other',
      institution_name: account.institution_name || '', opening_balance: String(account.opening_balance ?? account.balance ?? 0),
      currency: account.currency || 'PHP',
    });
    setSheet({ name: 'account', type: account.account_type, id: account.id });
  };
  const openEditTransaction = (t) => {
    setError('');
    setForm({
      merchant: t.merchant || '', amount: String(t.amount ?? ''), transaction_type: t.type || t.transaction_type || 'expense',
      category: t.category || 'Other', account_id: t.account_id || '', transfer_to_account_id: t.transfer_to_account_id || '',
      occurred_at: dayKey(t.date || t.occurred_at), note: t.note || '',
    });
    setSheet({ name: 'transaction', id: t.id });
  };

  const saveTransaction = async (e) => {
    e.preventDefault(); setError('');
    const amount = Number(form.amount); const type = form.transaction_type;
    if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0 || amount >= 1e17) { setError('Enter a description and a valid positive amount.'); return; }
    const sourceAccount = formAccounts.find(account => account.id === form.account_id);
    const destinationAccount = formAccounts.find(account => account.id === form.transfer_to_account_id);
    if ((cloudMode || formAccounts.length > 0) && !sourceAccount) { setError('Choose an available account before saving this transaction.'); return; }
    if (type === 'transfer' && (!sourceAccount || !destinationAccount || form.transfer_to_account_id === form.account_id)) {
      setError('Transfers require two existing, different accounts. Create or select both accounts first.');
      return;
    }
    const currency = sourceAccount?.currency || 'PHP';
    if (type === 'transfer' && sourceAccount && destinationAccount && (sourceAccount.currency || 'PHP') !== (destinationAccount.currency || 'PHP')) {
      setError('Transfers between different currencies are not supported yet. Use same-currency accounts; currency conversion is not performed.');
      return;
    }
    const category = type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : form.category;
    const occurred_at = new Date(`${form.occurred_at}T12:00:00`).toISOString();
    setBusy(true);
    const editingId = sheet?.name === 'transaction' ? sheet.id : null;
    try {
      if (cloudMode) {
        const payload = { merchant: form.merchant.trim(), amount, currency, transaction_type: type, category, account_id: form.account_id, transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note };
        const row = editingId ? await updateTransaction(editingId, payload) : await createTransaction(payload, session.user.id);
        setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? row : x) : [row, ...cur]);
        notify(editingId ? 'Transaction updated in your MOVO account.' : 'Transaction saved to your MOVO account.');
      } else {
        const row = { id: editingId || window.crypto?.randomUUID?.() || String(Date.now()), merchant: form.merchant.trim().slice(0, 160), amount: Math.round(amount * 100) / 100, currency, transaction_type: type, category, account_id: sourceAccount?.id || 'local', transfer_to_account_id: type === 'transfer' ? destinationAccount.id : undefined, occurred_at, note: form.note.slice(0, 1000), source: 'Manual' };
        setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? row : x) : [row, ...cur]);
        notify(editingId ? 'Transaction updated on this device.' : 'Saved on this device only.');
      }
      if (currency !== displayCurrency) setPref('displayCurrency', currency);
      setForm({ ...form, merchant: '', amount: '', note: '' }); setSheet(null);
    } catch { setError(editingId ? 'Could not update this transaction. Check the details and try again.' : 'Could not save this transaction. Check the selected account and try again.'); }
    finally { setBusy(false); }
  };
  const handleCsvFile = (file) => {
    if (!file) return;
    setCsvFileName(file.name || 'transactions.csv');
    setCsvRows([]); setCsvErrors([]); setCsvImportSummary('');
    if (file.size > 5 * 1024 * 1024) { setCsvErrors([{ line: 1, message: 'CSV file must be 5 MB or smaller.' }]); return; }
    if (!/\.csv$/i.test(file.name || '') && !['text/csv', 'application/vnd.ms-excel'].includes(file.type)) { setCsvErrors([{ line: 1, message: 'Choose a CSV file.' }]); return; }
    setCsvRows([]); setCsvErrors([]); setCsvImportSummary('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseCsvTransactions(String(reader.result || ''));
        setCsvRows(result.transactions);
        setCsvErrors(result.errors);
        if (!result.transactions.length && !result.errors.length) setCsvErrors([{ line: 1, message: 'No transactions were found in this file.' }]);
      } catch (err) {
        setCsvRows([]);
        setCsvErrors([{ line: 1, message: err?.message || 'Could not read this CSV file.' }]);
      }
    };
    reader.onerror = () => setCsvErrors([{ line: 1, message: 'Could not read this file. Please try another CSV.' }]);
    reader.readAsText(file);
  };

  const confirmCsvImport = async () => {
    if (!csvRows.length) return;
    setBusy(true); setCsvImportSummary('');
    const created = []; const errors = [...csvErrors];
    const fingerprints = new Set(txs.filter(t => cloudMode || t.source !== 'Sample').map(t => transactionFingerprint(t)));
    try {
      for (let i = 0; i < csvRows.length; i += 1) {
        const row = csvRows[i];
        const matchingAccount = formAccounts.find(a => row.account_name && a.name.trim().toLowerCase() === row.account_name.trim().toLowerCase());
        const accountId = matchingAccount?.id || importAccountId || (!cloudMode && formAccounts.length === 0 ? 'local' : '');
        if (!accountId) { errors.push({ line: i + 2, message: `Choose a default account or match the account name for “${row.merchant}”.` }); continue; }
        const sourceAccount = formAccounts.find(a => a.id === accountId);
        if (sourceAccount && (row.currency || 'PHP') !== (sourceAccount.currency || 'PHP')) {
          errors.push({ line: i + 2, message: `Currency mismatch for “${row.merchant}”: choose an account denominated in ${row.currency || 'PHP'}.` }); continue;
        }
        const matchingDestination = formAccounts.find(a => row.to_account_name && a.name.trim().toLowerCase() === row.to_account_name.trim().toLowerCase());
        const destinationId = row.transaction_type === 'transfer' ? (matchingDestination?.id || '') : undefined;
        if (row.transaction_type === 'transfer' && sourceAccount && matchingDestination && (sourceAccount.currency || 'PHP') !== (matchingDestination.currency || 'PHP')) {
          errors.push({ line: i + 2, message: `Transfer “${row.merchant}” uses different currencies. MOVO does not convert currencies.` }); continue;
        }
        if (row.transaction_type === 'transfer' && (!destinationId || destinationId === accountId)) {
          errors.push({ line: i + 2, message: `Transfer “${row.merchant}” needs a different destination account that matches the CSV.` }); continue;
        }
        const fingerprint = transactionFingerprint({ ...row, account_id: accountId });
        if (fingerprints.has(fingerprint)) { errors.push({ line: i + 2, message: `Possible duplicate skipped: “${row.merchant}”.` }); continue; }
        try {
          if (cloudMode) {
            const saved = await createTransaction({
              merchant: row.merchant, amount: row.amount, transaction_type: row.transaction_type, category: row.category,
              account_id: accountId, transfer_to_account_id: destinationId, currency: row.currency,
              occurred_at: row.occurred_at, note: row.note, source: 'csv_import', external_reference: fingerprint,
            }, session.user.id);
            created.push(saved);
          } else {
            created.push({
              id: window.crypto?.randomUUID?.() || `csv-${Date.now()}-${i}`,
              merchant: row.merchant, amount: row.amount, transaction_type: row.transaction_type, category: row.category,
              account_id: accountId, transfer_to_account_id: destinationId, currency: row.currency,
              occurred_at: row.occurred_at, note: row.note, source: 'CSV Import', external_reference: fingerprint,
            });
          }
          fingerprints.add(fingerprint);
        } catch {
          errors.push({ line: i + 2, message: `Could not save “${row.merchant}”. It was not added.` });
        }
      }
      if (created.length) setRawTxs(cur => [...created, ...cur]);
      const importedCurrencies = Array.from(new Set(created.map(row => row.currency || 'PHP')));
      if (importedCurrencies.length === 1 && importedCurrencies[0] !== displayCurrency) setPref('displayCurrency', importedCurrencies[0]);
      setCsvRows([]);
      setCsvErrors(errors);
      const currencyNote = importedCurrencies.length > 1 ? ' Imported records remain separated by currency; change Display Currency in Settings to review each currency.' : '';
      const summary = `Imported ${created.length} transaction(s).${currencyNote} ${errors.length} row(s) skipped or need attention.`;
      setCsvImportSummary(summary);
      notify(summary);
    } finally { setBusy(false); }
  };

  const saveAccount = async (e) => {
    e.preventDefault(); setError('');
    const name = accountForm.name.trim();
    const openingBalance = Number(accountForm.opening_balance || 0);
    if (!name) { setError('Enter an account name.'); return; }
    if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) >= 1e17) { setError('Enter a valid opening balance.'); return; }
    if (!accountTypes.some(type => type.value === accountForm.account_type)) { setError('Choose a valid account type.'); return; }
    if (!/^[A-Z]{3}$/.test(accountForm.currency || '')) { setError('Choose a valid account currency.'); return; }
    const editingId = sheet?.name === 'account' ? sheet.id : null;
    const previousCurrency = editingId ? (accountsView.find(account => account.id === editingId)?.currency || 'PHP') : null;
    if (editingId && previousCurrency !== accountForm.currency) {
      setError('Account currency is fixed when the account is created. Create a new account in the other currency instead.');
      return;
    }
    setBusy(true);
    try {
      if (cloudMode && session?.user) {
        if (editingId) {
          const a = await updateAccount(editingId, { ...accountForm, opening_balance: openingBalance });
          setCloudAccounts(cur => cur.map(item => item.id === editingId ? a : item));
          notify('Account updated in your MOVO account.');
        } else {
          const a = await createAccount({ ...accountForm, opening_balance: openingBalance }, session.user.id);
          setCloudAccounts(cur => [...cur, a]);
          notify('Account added to your signed-in MOVO account.');
        }
      } else {
        const existing = localAccounts.find(a => a.id === editingId);
        const a = {
          ...(existing || {}),
          id: editingId || window.crypto?.randomUUID?.() || `local-account-${Date.now()}`,
          name: name.slice(0, 100),
          account_type: accountForm.account_type || sheet?.type || 'other',
          institution_name: accountForm.institution_name.trim().slice(0, 100),
          currency: accountForm.currency || existing?.currency || 'PHP', opening_balance: Math.round(openingBalance * 100) / 100,
          balance: Math.round(openingBalance * 100) / 100, is_archived: existing?.is_archived || false, mask: existing?.mask || '', brand: existing?.brand || 'blue', source: 'Manual',
        };
        setLocalAccounts(cur => editingId ? cur.map(item => item.id === editingId ? a : item) : [...cur, a]);
        notify(editingId ? 'Account updated on this device.' : 'Account saved on this device only.');
      }
      if ((!editingId || previousCurrency !== accountForm.currency) && accountForm.currency !== displayCurrency) setPref('displayCurrency', accountForm.currency);
      setAccountForm({ name: '', account_type: 'bank', institution_name: '', opening_balance: '0', currency: 'PHP' });
      setSheet(null);
    } catch { setError(editingId ? 'Could not update account. Please review the details and try again.' : 'Could not add account. Please review the details and try again.'); }
    finally { setBusy(false); }
  };
  const archiveAccount = async (account) => {
    if (!window.confirm(`Archive “${account.name}”? Its transaction history will remain available.`)) return;
    try {
      if (cloudMode) {
        await updateAccount(account.id, { is_archived: true });
        setCloudAccounts(cur => cur.map(item => item.id === account.id ? { ...item, is_archived: true } : item));
      } else setLocalAccounts(cur => cur.map(item => item.id === account.id ? { ...item, is_archived: true } : item));
      setSheet(null); notify('Account archived. Its transaction history was kept.');
    } catch { notify('Could not archive this account. Please try again.'); }
  };
  const removeTransaction = async (t) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try { if (cloudMode) await deleteTransaction(t.id); setRawTxs(cur => cur.filter(x => x.id !== t.id)); setSheet(null); notify('Transaction deleted.'); }
    catch { notify('Could not delete this transaction.'); }
  };
  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency', 'Account'], ...txs.map(t => [t.date, t.merchant, t.category, t.type, t.amount, t.currency || 'PHP', t.accountName])];
    const csv = buildCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'movo-transactions.csv'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSheet(null); notify('CSV export prepared.');
  };
  const clearSamples = () => { setRawTxs(cur => cur.filter(t => t.source !== 'Sample')); setSamplesOn(false); setSheet(null); notify('Sample records removed. Your manually entered records are kept.'); };
  const clearLocal = () => {
    pendingLocalDataRef.current = null;
    let preferencesCleared = true;
    try { localStorage.removeItem(PREF); localStorage.removeItem(OLD_PREF); } catch { preferencesCleared = false; }
    const recordsCleared = clearLocalFinanceData();
    const stickersCleared = clearCustomStickers();
    const allLocalDataCleared = preferencesCleared && recordsCleared && stickersCleared;
    setPrefs({ ...DEFAULTS });
    setRawTxs(cloudMode ? rawTxs : []);
    setLocalAccounts([]);
    setSamplesOn(false);
    setLocalPersistenceWarning(!preferencesCleared || !recordsCleared);
    setSheet(null);
    if (allLocalDataCleared) {
      setError('');
      notify('Local transactions, accounts, custom stickers and preferences cleared. Cloud records are unchanged.');
    } else {
      setError('MOVO could not confirm that all local data was cleared. Custom sticker images or local records may remain. Check browser storage and clear this site’s data manually if needed.');
    }
  };
  const signOutNow = async () => {
    try {
      await signOut();
      const pending = pendingLocalDataRef.current;
      setSession(null);
      setCloudMode(false);
      setCloudAccounts([]);
      setRawTxs(pending?.transactions || loadLocalTransactions(demoTransactions));
      setLocalAccounts(pending?.accounts || loadLocalAccounts());
      setSamplesOn(pending ? pending.samplesOn : areSamplesEnabled());
      go('Home');
      notify('Signed out securely.');
    } catch { notify('Could not sign out. Please try again.'); }
  };

  const c = {
    show, setShow, prefs, setPref, stats, deltas, txs: currencyTxs, accountsView, displayAccountsView: currencyAccountsView, accountsByType: displayAccountsByType, displayCurrency, availableCurrencies, refDate, user, unread, go, session, cloudMode, supabaseConfigured,
    breakdown: homeBreakdown, recent, openTx, notify, sheet, setSheet, signOutNow, exportCsv, openLegal, legalReturnView, notificationsEnabled: prefs.notifications && prefs.inapp, demoAlertsAvailable: !cloudMode && samplesOn,
    walletFilter, setWalletFilter, selectedCard, setSelectedCardId, openForm,
    txFilter, setTxFilter, month: activeMonth, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, expanded, setExpanded, search, setSearch, openSearch: () => setSearchOpen(true),
    notifications, readIds: prefs.readIds, nFilter, setNFilter, markAllRead, openNotification, activeNotification, query, setQuery,
  };
  c.txBreakdown = txBreakdown;
  const txScreen = { ...c, breakdown: txBreakdown };

  /* ---------- theme ---------- */
  const resolved = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme === 'dark' ? 'dark' : 'light';
  const tint = ['blue', 'purple', 'orange'].includes(prefs.theme) ? prefs.theme : '';
  const accentName = prefs.accent === 'custom' ? 'custom' : prefs.accent;
  const clarity = Math.min(100, Math.max(0, Number(prefs.clarity) || 0)) / 100; const dark = resolved === 'dark';
  const glassVars = prefs.glass ? { '--glass-blur': `${Math.round(34 - 30 * clarity)}px`, '--glass-fill': (dark ? 0.6 - 0.48 * clarity : 0.78 - 0.64 * clarity).toFixed(2), '--glass-sheet-fill': (dark ? 0.92 - 0.4 * clarity : 0.94 - 0.42 * clarity).toFixed(2), '--glass-edge': (0.16 + 0.18 * clarity).toFixed(2) } : {};
  const rootStyle = { ...glassVars, ...(accentName === 'custom' ? { '--accent': prefs.customColor, '--accent-rgb': hexToRgb(prefs.customColor) } : {}) };
  const rootClass = `movo-app theme-${resolved}${tint ? ` tint-${tint}` : ''} accent-${accentName}${prefs.glass ? ' glass-on' : ''}${prefs.compact ? ' compact' : ''}${prefs.categoryColors ? '' : ' no-category-colors'}`;
  const activeTab = ROOT_FOR[view];
  const navIdx = NAV.findIndex(n => n[2] === activeTab);
  if (navIdx !== 2 && navIdx >= 0) lastTab.current = navIdx;
  const pillIdx = lastTab.current;

  if (!authReady) return <div className={rootClass} style={rootStyle}><div className="loading-screen"><span className="brand-mark">m</span><p>Preparing your secure MOVO space…</p></div></div>;
  const detailTx = sheet?.name === 'tx' ? txs.find(t => t.id === sheet.id) : null;
  const formAccounts = accountsView.filter(a => !a.is_archived);
  const accountChoice = sheet?.name === 'cardDetails' ? accountsView.find(a => a.id === sheet.id) || selectedCard : null;
  const accountCurrencyLocked = Boolean(sheet?.name === 'account' && sheet.id);

  const screen = (() => {
    switch (view) {
      case 'Wallet': return <Wallet c={c} />;
      case 'Transactions': return <Transactions c={txScreen} />;
      case 'Profile': return <Profile c={c} />;
      case 'EditProfile': return <EditProfile c={c} />;
      case 'Settings': return <Settings c={c} />;
      case 'Appearance': return <Appearance c={c} />;
      case 'Notifications': return <Notifications c={c} />;
      case 'NotificationDetail': return <NotificationDetail c={c} />;
      case 'NotificationSettings': return <NotificationSettings c={c} />;
      case 'TermsOfService': return <TermsOfService c={c} />;
      case 'PrivacyPolicy': return <PrivacyPolicy c={c} />;
      case 'HelpCenter': return <HelpCenter c={c} />;
      case 'NasrinAI': return <NasrinAIChat session={session} cloudMode={cloudMode} onOpenLegal={openLegal} onSignIn={() => go('Sign in')} />;
      case 'Sign in': return <AuthPanel onOpenLegal={openLegal} onAuthenticated={u => { setSession({ user: u }); go('Home'); refreshCloud(u); }} onContinueLocally={() => { go('Home'); notify('Continuing in local-only mode.'); }} />;
      default: return <Home c={c} />;
    }
  })();

  return <div className={rootClass} style={rootStyle}>
    <div className="app-shell">
      <main className={`screen enter-${motion}${scrolled ? ' is-scrolled' : ''}`} key={view}>
        {localPersistenceWarning && <div className="app-alert storage-warning" role="alert">
          <span><strong>{cloudMode && pendingLocalDataRef.current ? 'Local-only records were not saved before cloud sign-in.' : 'Local changes may not be saved.'}</strong> {cloudMode && pendingLocalDataRef.current ? 'These records are separate from your cloud account. Retry to preserve a local copy on this device; this does not sync them to the cloud.' : 'Browser storage is unavailable or full. Important records may not survive a reload. Export a copy if possible, free browser storage, then retry. Local records stay on this device and are not cloud-synced.'}</span>
          <button type="button" className="retry-save" onClick={retryLocalPersistence}>Retry save</button>
        </div>}
        {error && !sheet && <div className="app-alert" role="alert">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        {screen}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <span className={`nav-pill${activeTab === 'NasrinAI' ? ' hidden' : ''}`} aria-hidden="true" style={{ '--idx': pillIdx }} />
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          return <button type="button" key={label} className={`nav-item${center ? ' nav-center' : ''}${active ? ' nav-active' : ''}`} onClick={() => go(target)} aria-current={active ? 'page' : undefined} aria-label={label} title={label}>
            <span className="nav-icon">{center ? <span className="orb"><NasrinMark size={24} /></span> : <Icon name={icon} size={24} strokeWidth={1.8} filled={active} />}</span>
          </button>;
        })}
      </nav>

      {sheet?.name === 'transaction' && <Sheet title={sheet.id ? 'Edit transaction' : 'Add transaction'} subtitle={sheet.id ? 'Changes update this record.' : cloudMode ? 'Saved to your signed-in MOVO account.' : 'Saved on this device only; sign in to use cloud storage.'} onClose={() => { setSheet(null); setError(''); }} label={sheet.id ? 'Edit transaction' : 'Add transaction'}>
        <form className="sheet-form" onSubmit={saveTransaction}>
          <div className="seg-control" role="group" aria-label="Transaction type">{['expense', 'income', 'transfer'].map(t => <button type="button" key={t} className={form.transaction_type === t ? 'selected' : ''} aria-pressed={form.transaction_type === t} onClick={() => setForm({ ...form, transaction_type: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
          <label>Description<input autoFocus required maxLength={160} value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Grocery shopping" /></label>
          <div className="form-grid"><label>Amount ({formAccounts.find(account => account.id === form.account_id)?.currency || 'PHP'})<input required type="number" min="0.01" max="999999999999" step="0.01" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
            <label>Date<input required type="date" value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} /></label></div>
          {form.transaction_type === 'expense' && <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(x => <option key={x}>{x}</option>)}</select></label>}
          {(cloudMode || formAccounts.length > 0) && <label>{form.transaction_type === 'transfer' ? 'From account' : 'Account'}<select required={cloudMode} value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}><option value="">Choose account</option>{formAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {form.transaction_type === 'transfer' && formAccounts.length > 0 && <label>To account<select value={form.transfer_to_account_id} onChange={e => setForm({ ...form, transfer_to_account_id: e.target.value })}><option value="">Choose account</option>{formAccounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          <label>Note (optional)<textarea rows="2" maxLength="1000" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Add a note" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setError(''); }}>Cancel</button><button type="submit" className="primary-button" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : sheet.id ? 'Save changes' : 'Save transaction'}</button></div>
        </form>
      </Sheet>}

      {sheet?.name === 'account' && <Sheet title={sheet.id ? 'Edit account' : 'Add account'} subtitle={sheet.id ? 'Update the name, type, institution or opening balance.' : 'Track a card, bank account or e-wallet.'} onClose={() => { setSheet(null); setError(''); }} label={sheet.id ? 'Edit account' : 'Add account'}>
        <form className="sheet-form" onSubmit={saveAccount}>
          <label>Account name<input required maxLength="100" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. Everyday account" /></label>
          <label>Account type<select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })}>{accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label>Bank / institution (optional)<input maxLength="100" value={accountForm.institution_name} onChange={e => setAccountForm({ ...accountForm, institution_name: e.target.value })} placeholder="Institution name" /></label>
          <label>Account currency<select aria-label="Account currency" aria-describedby={accountCurrencyLocked ? 'account-currency-lock-note' : undefined} value={accountForm.currency || 'PHP'} disabled={accountCurrencyLocked} onChange={e => setAccountForm({ ...accountForm, currency: e.target.value })}>
            {Array.from(new Set([...Object.keys(ACCOUNT_CURRENCIES), ...availableCurrencies, accountForm.currency || 'PHP'])).sort().map(currency => <option key={currency} value={currency}>{ACCOUNT_CURRENCIES[currency] ? `${ACCOUNT_CURRENCIES[currency]} (${currency})` : currency}</option>)}
          </select></label>
          {accountCurrencyLocked && <p id="account-currency-lock-note" className="form-note">Account currency is fixed when this account is created. Create a new account in the other currency instead.</p>}
          <label>Opening balance ({accountForm.currency || 'PHP'})<input type="number" step="0.01" max="999999999999" value={accountForm.opening_balance} onChange={e => setAccountForm({ ...accountForm, opening_balance: e.target.value })} /></label>
          {!cloudMode && <p className="form-note">This account will be stored only on this device. Sign in to enable cloud sync.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setError(''); }}>Cancel</button><button className="primary-button" type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : sheet.id ? 'Save changes' : 'Add account'}</button></div>
        </form>
      </Sheet>}

      {sheet?.name === 'actions' && <Sheet title="Quick actions" onClose={() => setSheet(null)}>
        <div className="sheet-menu">
          <button type="button" onClick={() => openForm('expense')}><Icon name="plus" size={20} />Add transaction</button>
          <button type="button" onClick={() => setSheet({ name: 'account', type: 'bank' })}><Icon name="wallet" size={20} />Add account</button>
          <button type="button" onClick={() => { setCsvRows([]); setCsvErrors([]); setCsvImportSummary(''); setCsvFileName(''); setImportAccountId(''); setSheet({ name: 'importCsv' }); }}><Icon name="upload" size={20} />Import CSV</button>
          <button type="button" onClick={exportCsv}><Icon name="download" size={20} />Export CSV</button>
          <button type="button" onClick={() => setSheet({ name: 'themes' })}><Icon name="palette" size={20} />Choose theme</button>
          {!cloudMode && samplesOn && <button type="button" onClick={clearSamples}><Icon name="trash" size={20} />Remove sample data</button>}
        </div>
      </Sheet>}

      {sheet?.name === 'themes' && <ThemeSheet c={c} />}


      {sheet?.name === 'importCsv' && <Sheet title="Import transactions" subtitle="CSV is parsed in this browser. Nothing is uploaded until you confirm the import." onClose={() => setSheet(null)} label="Import transactions">
        <div className="sheet-form">
          <label>Choose CSV file<input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (file) handleCsvFile(file); }} /></label>
          <p id="csv-import-guidance" className="form-note">Required columns: Date, Description, Type, Amount. Optional: Currency, Category, Account, To Account, Note. Review the preview before importing.</p>
          {csvFileName && <p className="form-note">File: {csvFileName}</p>}
          {formAccounts.length > 0 && <label>Default account (used when the CSV account name does not match)<select value={importAccountId} onChange={e => setImportAccountId(e.target.value)}><option value="">Choose account</option>{formAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {csvRows.length > 0 && <section className="card pad" aria-label="CSV import preview"><strong>Preview · {csvRows.length} valid row(s)</strong>{csvRows.slice(0, 5).map((row, i) => <div className="detail-row" key={`${row.occurred_at}-${row.merchant}-${i}`}><span className="menu-main"><strong>{row.merchant}</strong><small>{row.transaction_type} · {row.category} · {row.account_name || 'default account'}</small></span><b>{money(row.amount, row.currency)}</b></div>)}{csvRows.length > 5 && <p className="form-note">Showing the first 5 rows. All valid rows will be processed.</p>}</section>}
          {csvImportSummary && <p className="form-note" role="status">{csvImportSummary}</p>}
          {csvErrors.length > 0 && <div className="form-error" role="alert"><strong>Rows needing attention</strong><ul>{csvErrors.slice(0, 8).map((item, i) => <li key={`${item.line}-${i}`}>Row {item.line}: {item.message}</li>)}</ul>{csvErrors.length > 8 && <p>And {csvErrors.length - 8} more row(s).</p>}</div>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Close</button><button type="button" className="primary-button" onClick={confirmCsvImport} disabled={busy || !csvRows.length} aria-describedby="csv-import-guidance" aria-busy={busy}>{busy ? 'Importing…' : `Import ${csvRows.length} transaction(s)`}</button></div>
        </div>
      </Sheet>}
      {sheet?.name === 'clear' && <Sheet title="Clear local data?" subtitle="Resets browser preferences to defaults and removes local financial records, accounts, and custom sticker artwork. Cloud records are not affected." onClose={() => setSheet(null)}>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Cancel</button><button type="button" className="danger-button" onClick={clearLocal}>Clear data</button></div>
      </Sheet>}

      {accountChoice && <Sheet title={accountChoice.name} subtitle={accountTypes.find(t => t.value === accountChoice.account_type)?.label} onClose={() => setSheet(null)} label="Account details">
        <dl className="detail-list"><div><dt>Institution</dt><dd>{accountChoice.institution_name || 'Personal account'}</dd></div><div><dt>Number</dt><dd>{accountChoice.mask ? `•••• ${accountChoice.mask}` : '—'}</dd></div><div><dt>Balance</dt><dd>{shown(show, money(accountChoice.balance, accountChoice.currency), accountChoice.currency || 'PHP')}</dd></div></dl>
        <div className="sheet-actions">{(cloudMode || localAccounts.some(account => account.id === accountChoice.id)) && <><button type="button" className="secondary-button" onClick={() => openEditAccount(accountChoice)}><Icon name="edit" size={16} /> Edit account</button><button type="button" className="danger-button" onClick={() => archiveAccount(accountChoice)}><Icon name="archive" size={16} /> Archive account</button></>}<button type="button" className="primary-button" onClick={() => openForm('expense', accountChoice.id)}>Add transaction</button></div>
      </Sheet>}

      {detailTx && <Sheet title={detailTx.merchant} subtitle={`${longDate(detailTx.date)}, ${timeLabel(detailTx.date)}`} onClose={() => setSheet(null)} label="Transaction details">
        <dl className="detail-list"><div><dt>Amount</dt><dd>{shown(show, money(detailTx.amount, detailTx.currency), detailTx.currency || 'PHP')}</dd></div><div><dt>Type</dt><dd>{detailTx.type}</dd></div><div><dt>Category</dt><dd>{detailTx.category || 'Other'}</dd></div><div><dt>Account</dt><dd>{detailTx.accountName}</dd></div>{detailTx.note && <div><dt>Note</dt><dd>{detailTx.note}</dd></div>}{detailTx.source === 'Sample' && <div><dt>Source</dt><dd>Sample record</dd></div>}</dl>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => openEditTransaction(detailTx)}><Icon name="edit" size={16} /> Edit</button><button type="button" className="danger-button" aria-label={`Delete ${detailTx.merchant}`} onClick={() => removeTransaction(detailTx)}><Icon name="trash" size={16} /> Delete</button></div>
      </Sheet>}

      {searchOpen && <SearchOverlay txs={txs} show={show} refDate={refDate} onOpen={openTx} onClose={() => setSearchOpen(false)} />}
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      {busy && <div className="sync-indicator" role="status"><span className="spinner" /> Syncing securely…</div>}
    </div>
  </div>;
}
export default App;
