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
import Menu from './screens/Menu';
import Subscriptions from './screens/Subscriptions';
import { BriefingSheet } from './components/Briefing';
import Walkthrough from './components/Walkthrough';
import LockScreen from './components/LockScreen';
import CardArt from './components/CardArt';
import AccountTile, { styleFor } from './components/AccountTile';
import LoggedBurst from './components/LoggedBurst';
import { useLayout } from './lib/layout';
import { markFresh } from './lib/freshRecords';
import { answerLocally } from './lib/localAnswer';
import { updateStreak, newlyEarned } from './lib/streak';
import { MovoMark } from './components/MovoLogo';
import { findDuplicate, refOf } from './lib/duplicates';
import { mergePreferences, unionById } from './lib/prefsMerge';
import { buildSystemNotices, isQuiet, deviceLabel, showSystemNotification } from './lib/alerts';
import { lockState } from './lib/appLock';
import { buildBriefing } from './lib/insights';
import { summarize as summarizeSubscriptions } from './lib/subscriptions';
import Settings, { Appearance, NotificationSettings, ThemeSheet } from './screens/Settings';
import Notifications, { NotificationDetail, buildNotifications } from './screens/Notifications';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { revealChange } from './lib/motion';
import { convert, loadRates, refreshRates, CURRENCIES, currencyName } from './lib/fx';
import { LANGUAGES, detectLanguage, setLanguage, loadLanguage, t as tr, rich } from './lib/i18n';
import { COUNTRIES, countryName, regionalLocale } from './lib/regions';
import SearchOverlay from './components/SearchOverlay';
import TransactionSheet from './components/TransactionSheet';
import AccountSheet from './components/AccountSheet';
import ScannerSheet from './components/ScannerSheet';
import { readLogLink, sameKey, isRepeat, matchAccount, newKey, linkTemplate, shortcutPrompt } from './lib/autoLog';
import { guessCategory } from './lib/ocr';
import { evaluate } from './lib/calc';
import { getCurrentSession, listAccounts, listTransactions, createAccount, updateAccount, createTransaction, updateTransaction, deleteTransaction, signOut, listBudgets, createBudget, updateBudget, removeBudget, deleteAllCloudData, loadPreferences, savePreferences } from './lib/financeRepository';
import { BudgetsSheet, budgetProgress } from './components/Budgets';
import { monthOverMonth } from './lib/trend';
import { scenerySrc, veilFor, loadSceneryPhoto, saveSceneryPhoto } from './lib/scenery';
import { loadLocalTransactions, saveLocalTransactions, loadLocalAccounts, saveLocalAccounts, clearLocalFinanceData } from './lib/localFinanceStore';
import { parseCsvTransactions, transactionFingerprint } from './lib/csvImport';
import { money, shown, dayKey, monthKey, monthLabel, longDate, timeLabelFull, BUCKETS, bucketOf, setFormatLocale, setBaseCurrency, formatDate } from './lib/format';
import { ACCENTS } from './screens/Settings';
import NasrinAIChat from './components/NasrinAIChat';
import { TermsOfService, PrivacyPolicy } from './screens/Legal';
import HelpCenter from './screens/HelpCenter';
import { buildCsv } from './lib/csvExport';
import { clearCustomStickers, getCustomStickers, replaceCustomStickers, subscribeCustomStickers } from './lib/stickers';

const PREF = 'movo.preferences.v3';
const OLD_PREF = 'movo.preferences.v2';
const accountTypes = [{ value: 'bank', label: 'Bank account' }, { value: 'card', label: 'Credit / debit card' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'cash', label: 'Cash' }, { value: 'investment', label: 'Investment' }, { value: 'other', label: 'Other' }];
/* Changing these fills the new look in from the tap point. */
const APPEARANCE_KEYS = new Set(['theme', 'accent', 'glass']);
/** "Already logged: Saging · ₱20.00 on Oct 30." for a record that a new entry duplicates. */
/** Accent colour for text: on dark backgrounds a dark accent (e.g. slate) is lightened until it reads clearly. */
export function readableAccent(hex, dark) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return undefined;
  let [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
  const lum = () => [r, g, b].map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  if (!dark) return `#${m[1]}`;
  for (let i = 0; i < 12 && (lum() + 0.05) / (0.0116 + 0.05) < 6; i += 1) [r, g, b] = [r, g, b].map(v => Math.round(v + (255 - v) * 0.18));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
const dupText = (d) => tr('Already logged: {merchant} · {amount} on {date}.', { merchant: d.merchant, amount: money(d.amount, d.currency), date: formatDate(d.occurred_at, { month: 'short', day: 'numeric' }, 'md') });
const DEFAULTS = {
  theme: 'system', glass: true, clarity: 55, scenery: '', sceneryVisibility: 45, accent: 'blue', customColor: '#2f6bff', showBalance: true, compact: false, categoryColors: true,
  notifications: true, push: false, email: false, inapp: true, catTransactions: true, catAccount: true, catAi: true, catPromo: true, catReports: true,
  biometrics: true, cloudSync: true, localStorage: false, autocat: true, profileName: '', phone: '', location: '', readIds: [], notifSeenAt: '', subsSeen: '', quietOn: false, quietStart: '22:00', quietEnd: '07:00', pushed: [], devices: [], streak: null, cardStyles: {},
  accountStyles: {}, layouts: {}, budgets: [], plans: [], subscriptions: [], briefing: true, briefingDay: '', onboarded: false, mascot: '', autoLog: false, autoLogKey: '', language: '', currency: 'PHP', country: '',
};
const ROOT_FOR = { Home: 'Home', Notifications: 'Home', NotificationDetail: 'Home', NotificationSettings: 'Home', Wallet: 'Wallet', Transactions: 'Transactions', NasrinAI: 'NasrinAI', Menu: 'Menu', Profile: 'Menu', Subscriptions: 'Menu', Settings: 'Menu', Appearance: 'Menu', EditProfile: 'Menu', HelpCenter: 'Menu', TermsOfService: 'Menu', PrivacyPolicy: 'Menu' };
const DEPTH = { Home: 0, Wallet: 0, NasrinAI: 0, Transactions: 0, Menu: 0, Profile: 1, Subscriptions: 1, Notifications: 1, Settings: 1, EditProfile: 1, 'Sign in': 1, Appearance: 2, NotificationDetail: 2, NotificationSettings: 2 };
const ORDER = { Home: 0, Wallet: 1, NasrinAI: 2, Transactions: 3, Menu: 4 };
const NAV = [['Home', 'home', 'Home'], ['Wallet', 'wallet', 'Wallet'], ['NasrinAI', 'spark', 'NasrinAI'], ['Transactions', 'list', 'Transactions'], ['Menu', 'grid', 'Menu']];
const BLANK_ACCOUNT = { name: '', account_type: 'bank', institution_name: '', opening_balance: '', currency: '', mask: '', color: '', icon: '', chip: 'gold', contactless: true, cardKind: 'debit' };
const today = () => new Date().toLocaleDateString('en-CA');

function readPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREF));
    if (stored) return { ...DEFAULTS, onboarded: true, ...stored }; // people who already used MOVO skip the first-run tour
    const old = JSON.parse(localStorage.getItem(OLD_PREF)) || {};
    return { ...DEFAULTS, theme: old.dark ? 'dark' : DEFAULTS.theme, accent: old.accent === 'mono' ? 'slate' : (old.accent || DEFAULTS.accent), showBalance: old.showBalance !== false };
  } catch { return { ...DEFAULTS }; }
}
const hexToRgb = (hex) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '47,107,255'; };
const monthsBack = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
/* Each record keeps its original amount and currency; `amount` is converted to the home currency for totals. */
const normalize = (t, accounts, base, rates) => {
  const account = accounts.find(a => a.id === t.account_id);
  const transferTarget = accounts.find(a => a.id === t.transfer_to_account_id);
  const origCurrency = t.origCurrency || t.currency || account?.currency || 'PHP';
  const origAmount = Number(t.origAmount ?? t.amount);
  return {
    ...t,
    type: t.transaction_type || t.type,
    date: t.occurred_at || t.date,
    origAmount, origCurrency, currency: base,
    amount: convert(origAmount, origCurrency, base, rates),
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

function CountrySheet({ value, locale, onPick, onClose }) {
  const [q, setQ] = useState('');
  const list = COUNTRIES.map(row => ({ row, name: countryName(row[0], locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)).filter(c => !q || `${c.row[0]} ${c.name} ${countryName(c.row[0], 'en')}`.toLowerCase().includes(q.trim().toLowerCase()));
  return <Sheet title={tr('Country or region')} subtitle={tr('Sets the language, home currency and local date and number style. You can still change each one separately.')} onClose={onClose} label={tr('Country or region')} className="sheet-search">
    <label className="search-field"><Icon name="search" size={18} /><input aria-label={tr('Search countries')} placeholder={tr('Search countries')} value={q} onChange={e => setQ(e.target.value)} /></label>
    {!list.length && <p className="empty sheet-empty">{tr('No matches for “{q}”.', { q: q.trim() })}</p>}
    <div className="sheet-list">{list.map(({ row, name }) => <button type="button" key={row[0]} className={`sheet-card${value === row[0] ? ' selected' : ''}`} aria-pressed={value === row[0]} onClick={() => onPick(row)}><span className="currency-code">{row[0]}</span><span className="account-main"><strong>{name}</strong><small>{LANGUAGES.find(l => l.code === row[1])?.name} · {row[2]}</small></span>{value === row[0] && <Icon name="check" size={18} />}</button>)}</div>
  </Sheet>;
}

function CurrencySheet({ value, fx, locale, onPick, onClose }) {
  const [q, setQ] = useState('');
  const list = CURRENCIES.map(code => ({ code, name: currencyName(code, locale) })).filter(c => !q || `${c.code} ${c.name}`.toLowerCase().includes(q.trim().toLowerCase()));
  return <Sheet title={tr('Home currency')} subtitle={tr('Totals, budgets and charts are shown in this currency. Each account keeps its own currency.')} onClose={onClose} label={tr('Home currency')} className="sheet-search">
    <label className="search-field"><Icon name="search" size={18} /><input aria-label={tr('Search currencies')} placeholder={tr('Search currencies')} value={q} onChange={e => setQ(e.target.value)} /></label>
    {!list.length && <p className="empty sheet-empty">{tr('No matches for “{q}”.', { q: q.trim() })}</p>}
    <div className="sheet-list">{list.map(c => <button type="button" key={c.code} className={`sheet-card${value === c.code ? ' selected' : ''}`} aria-pressed={value === c.code} onClick={() => onPick(c.code)}><span className="currency-code">{c.code}</span><span className="account-main"><strong>{c.name}</strong><small>{money(1234.5, c.code)}</small></span>{value === c.code && <Icon name="check" size={18} />}</button>)}</div>
    <p className="fineprint">{fx.live ? tr('Exchange rates updated {date}. Conversions are estimates for tracking only.', { date: formatDate(fx.at, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }) : tr('Using approximate built-in exchange rates until live rates load. Conversions are estimates for tracking only.')}</p>
  </Sheet>;
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
  const [fx, setFx] = useState(loadRates);
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [cloudBudgets, setCloudBudgets] = useState([]);
  const [localAccounts, setLocalAccounts] = useState(loadLocalAccounts);
  const [rawTxs, setRawTxs] = useState(() => loadLocalTransactions());
  const [sceneryPhoto, setSceneryPhotoState] = useState(loadSceneryPhoto);
  const setSceneryPhoto = useCallback((url) => { if (!saveSceneryPhoto(url)) return false; setSceneryPhotoState(url); return true; }, []);
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
  const [pendingLog, setPendingLog] = useState(null);
  const [toast, setToast] = useState('');
  const [localPersistenceWarning, setLocalPersistenceWarning] = useState(false);
  const pendingLocalDataRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState(BLANK_ACCOUNT);
  const [form, setForm] = useState({ merchant: '', amount: '', transaction_type: 'expense', category: 'Groceries', account_id: '', transfer_to_account_id: '', occurred_at: today(), time: '', note: '' });
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
    const apply = () => setPrefs(cur => ({ ...cur, [key]: value }));
    if (APPEARANCE_KEYS.has(key)) revealChange(apply, flushSync); else apply();
  }, []);
  const lang = setLanguage(prefs.language || detectLanguage());
  const [, setI18nTick] = useState(0);
  useEffect(() => {
    let live = true;
    loadLanguage(lang.code).then(changed => { if (live && changed) setI18nTick(n => n + 1); }).catch(() => { /* offline: keep cached or English text */ });
    return () => { live = false; };
  }, [lang.code]);
  setFormatLocale(regionalLocale(lang, prefs.country));
  setBaseCurrency(/^[A-Z]{3}$/.test(prefs.currency || '') ? prefs.currency : 'PHP');
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return undefined;
    let live = true;
    refreshRates(fx).then(next => { if (live && next) setFx(next); }).catch(() => { /* offline: keep cached or built-in rates */ });
    return () => { live = false; };
  }, []);
  const show = prefs.showBalance !== false;
  const setShow = useCallback((v) => setPref('showBalance', !!v), [setPref]);
  useEffect(() => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }, [prefs]);
  const layout = useLayout();
  const [burst, setBurst] = useState(null);
  const celebrate = useCallback((label, badge) => setBurst({ id: Date.now(), label, badge }), []);
  const endBurst = useCallback(() => setBurst(null), []);
  const dupAck = useRef('');
  const notify = useCallback((msg) => { setToast(msg); window.clearTimeout(window.__movoToast); window.__movoToast = window.setTimeout(() => setToast(''), 2800); }, []);
  useEffect(() => {
    if (cloudMode) {
      if (!pendingLocalDataRef.current) setLocalPersistenceWarning(false);
      return;
    }
    const transactionsSaved = saveLocalTransactions(rawTxs, false);
    const accountsSaved = saveLocalAccounts(localAccounts);
    const saved = transactionsSaved && accountsSaved;
    if (saved) pendingLocalDataRef.current = null;
    else pendingLocalDataRef.current = { transactions: rawTxs, accounts: localAccounts };
    setLocalPersistenceWarning(!saved);
  }, [rawTxs, localAccounts, cloudMode]);
  const retryLocalPersistence = useCallback(() => {
    const pending = pendingLocalDataRef.current;
    if (cloudMode && !pending) {
      setLocalPersistenceWarning(false);
      return;
    }
    const transactionsSaved = saveLocalTransactions(pending?.transactions || rawTxs, false);
    const accountsSaved = saveLocalAccounts(pending?.accounts || localAccounts);
    const saved = transactionsSaved && accountsSaved;
    if (saved) pendingLocalDataRef.current = null;
    setLocalPersistenceWarning(!saved);
    notify(saved
      ? (pending ? 'Your local-only records were saved on this device. They are not synced to your cloud account.' : 'Local records saved on this device.')
      : 'Browser storage is still unavailable or full.');
  }, [rawTxs, localAccounts, cloudMode, notify]);

  const refreshCloud = useCallback(async (user) => {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const [a, t] = await Promise.all([listAccounts(), listTransactions()]);
      setCloudAccounts(a || []); setRawTxs(t || []); setCloudMode(true);
      listBudgets().then(b => setCloudBudgets(b || [])).catch(() => setCloudBudgets([]));
    } catch { setError(tr('Could not load cloud records. Check your connection and try again.')); setCloudMode(false); }
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
    setError(tr('Google sign-in could not be completed. Check the Google provider and redirect URL settings, then try again.'));
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
        setRawTxs(pending?.transactions || loadLocalTransactions());
        setLocalAccounts(pending?.accounts || loadLocalAccounts());
      }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  }, [refreshCloud]);

  /* ---------- derived data ---------- */
  const baseAccounts = cloudMode ? cloudAccounts : localAccounts;
  const base = /^[A-Z]{3}$/.test(prefs.currency || '') ? prefs.currency : 'PHP';
  const rates = fx.rates;
  const toBase = useCallback((value, from) => convert(value, from || 'PHP', base, rates), [base, rates]);
  const txs = useMemo(() => rawTxs.map(t => normalize(t, baseAccounts, base, rates)).filter(t => Number.isFinite(new Date(t.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date)), [rawTxs, baseAccounts, base, rates]);
  const accountsView = useMemo(() => baseAccounts.map(a => {
    const delta = txs.reduce((s, t) => {
      const own = convert(t.origAmount, t.origCurrency, a.currency || 'PHP', rates);
      if (t.account_id === a.id) return s + (t.type === 'income' ? own : -own);
      if (t.type === 'transfer' && t.transfer_to_account_id === a.id) return s + own;
      return s;
    }, 0);
    const st = prefs.accountStyles?.[a.id] || {};
    return { ...a, chip: st.chip || a.chip, contactless: st.contactless ?? a.contactless ?? (a.account_type === 'card'), cardKind: st.cardKind || a.cardKind, mask: a.mask || st.mask || '', brand: a.brand || 'blue', balance: (cloudMode ? Number(a.opening_balance || 0) : Number(a.balance)) + delta, currency: a.currency || 'PHP' };
  }), [baseAccounts, txs, cloudMode, prefs.accountStyles, rates]);
  const accountsByType = useMemo(() => ({ card: accountsView.filter(a => a.account_type === 'card'), bank: accountsView.filter(a => a.account_type === 'bank'), e_wallet: accountsView.filter(a => a.account_type === 'e_wallet') }), [accountsView]);
  const refDate = useMemo(() => (cloudMode || !txs.length ? new Date() : new Date(txs[0].date)), [cloudMode, txs]);
  const refMonth = monthKey(refDate);
  const activeMonth = month || refMonth;
  const months = useMemo(() => Array.from(new Set([refMonth, ...txs.map(t => monthKey(t.date))])).sort().reverse(), [txs, refMonth]);

  const statsFor = useCallback((key) => {
    const list = txs.filter(t => monthKey(t.date) === key);
    const sum = (type) => list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
    const [y, m] = key.split('-').map(Number); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const buckets = Array(12).fill(0);
    list.filter(t => t.type === 'expense').forEach(t => { const d = Number(dayKey(t.date).slice(8, 10)); buckets[Math.min(11, Math.floor(((d - 1) / days) * 12))] += t.amount; });
    const income = sum('income'); const expenses = sum('expense');
    return { income, expenses, transfers: sum('transfer'), transferCount: list.filter(t => t.type === 'transfer').length, incomeCount: list.filter(t => t.type === 'income').length, net: income - expenses, days, bars: buckets, count: list.length, list };
  }, [txs]);
  const breakdownFor = useCallback((key) => {
    const totals = {}; statsFor(key).list.filter(t => t.type === 'expense').forEach(t => { const b = bucketOf(t.category); totals[b] = (totals[b] || 0) + t.amount; });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return { total, data: BUCKETS.filter(b => totals[b.key]).map(b => ({ ...b, amount: totals[b.key], percent: Math.round((totals[b.key] / total) * 100) })) };
  }, [statsFor]);
  const homeMonth = useMemo(() => statsFor(refMonth), [statsFor, refMonth]);
  const monthStats = useMemo(() => statsFor(activeMonth), [statsFor, activeMonth]);
  const stats = useMemo(() => {
    const balance = accountsView.length ? accountsView.reduce((s, a) => s + toBase(a.balance, a.currency), 0) : txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    let running = balance - homeMonth.net; const daily = new Map();
    homeMonth.list.slice().reverse().forEach(t => { if (t.type !== 'transfer') { running += t.type === 'income' ? t.amount : -t.amount; daily.set(dayKey(t.date), running); } });
    let points = [balance - homeMonth.net, ...daily.values()];
    for (let pass = 0; pass < 3; pass += 1) points = points.map((v, i) => { const w = points.slice(Math.max(0, i - 1), i + 2); return w.reduce((s, x) => s + x, 0) / w.length; });
    return { balance, income: homeMonth.income, expenses: homeMonth.expenses, savings: homeMonth.net, trend: points.length > 1 ? points : [balance, balance] };
  }, [accountsView, txs, homeMonth, toBase]);
  const deltas = useMemo(() => monthOverMonth(txs, refDate, stats.balance), [txs, refDate, stats.balance]);
  const homeBreakdown = useMemo(() => breakdownFor(refMonth), [breakdownFor, refMonth]);
  const txBreakdown = useMemo(() => breakdownFor(activeMonth), [breakdownFor, activeMonth]);
  const monthTxs = useMemo(() => {
    const type = { Income: 'income', Expenses: 'expense', Transfers: 'transfer' }[txFilter];
    const q = search.trim().toLowerCase();
    return monthStats.list.filter(t => (!type || t.type === type) && (!q || [t.merchant, t.category, t.accountName, t.type].join(' ').toLowerCase().includes(q)));
  }, [monthStats, txFilter, search]);
  const recent = useMemo(() => txs.filter(t => t.type !== 'transfer').slice(0, 4), [txs]);
  const budgets = useMemo(() => (cloudMode ? cloudBudgets : (prefs.budgets || [])).map(b => ({ ...b, monthly_limit: toBase(Number(b.monthly_limit), b.currency || 'PHP'), currency: base })), [cloudMode, cloudBudgets, prefs.budgets, toBase, base]);
  const budgetList = useMemo(() => budgetProgress(budgets, homeMonth.list), [budgets, homeMonth]);
  /* ---------- subscriptions (saved on this device) and NasrinAI's daily briefing ---------- */
  const subscriptions = useMemo(() => (Array.isArray(prefs.subscriptions) ? prefs.subscriptions.filter(s => s && typeof s === 'object' && typeof s.name === 'string' && s.id) : []), [prefs.subscriptions]);
  const todayKey = dayKey(new Date());
  const subSummary = useMemo(() => summarizeSubscriptions(subscriptions, new Date(`${todayKey}T12:00:00`), toBase), [subscriptions, toBase, todayKey]);
  const plans = useMemo(() => (prefs.plans || []).map(p => ({ ...p, target: toBase(p.target, p.currency || 'PHP'), saved: toBase(p.saved, p.currency || 'PHP'), currency: base })), [prefs.plans, toBase, base]);
  const briefing = useMemo(() => buildBriefing({ txs, refDate, deltas, budgets: budgetList, plans, subs: subSummary }), [txs, refDate, deltas, budgetList, plans, subSummary]);
  const selectedCard = accountsByType.card.find(a => a.id === selectedCardId) || accountsByType.card[0];

  const deviceId = useMemo(() => { try { let id = localStorage.getItem('movo.device.v1'); if (!id) { id = window.crypto?.randomUUID?.() || String(Date.now()); localStorage.setItem('movo.device.v1', id); } return id; } catch { return 'this-device'; } }, []);
  const systemNotices = useMemo(() => buildSystemNotices({ txs, now: new Date(`${todayKey}T12:00:00`), subs: subSummary, budgets: budgetList, tips: briefing.tips, devices: prefs.devices, deviceId, fmt: (v, cur) => money(v, cur) }), [txs, todayKey, subSummary, budgetList, briefing.tips, prefs.devices, deviceId]);
  const allNotifications = useMemo(() => buildNotifications(txs, systemNotices), [txs, systemNotices]);
  const notifications = useMemo(() => {
    if (!prefs.notifications || !prefs.inapp) return [];
    return allNotifications.filter(n => {
      if (n.cat) return prefs[n.cat] !== false;
      if (n.kind === 'Transactions') return prefs.catTransactions;
      if (n.kind === 'Account') return prefs.catAccount;
      if (n.kind === 'System' && /nasrinai/i.test(n.title)) return prefs.catAi;
      if (n.kind === 'System' && /offer|promotion/i.test(n.title)) return prefs.catPromo;
      if (n.kind === 'System' && /summary|report/i.test(n.title)) return prefs.catReports;
      return true;
    });
  }, [allNotifications, prefs.notifications, prefs.inapp, prefs.catTransactions, prefs.catAccount, prefs.catAi, prefs.catPromo, prefs.catReports]);
  // The bell / Home dot means "something new since you last opened Notifications"; row dots clear when each is opened.
  const seenAt = Date.parse(prefs.notifSeenAt || '') || 0;
  const unread = notifications.some(n => !prefs.readIds.includes(n.id) && (Date.parse(n.at) || 0) > seenAt);
  useEffect(() => { if (view === 'Notifications') setPref('notifSeenAt', new Date().toISOString()); }, [view, notifications.length, setPref]);
  // The Subscriptions badge clears once the person has opened Subscriptions, until a different renewal comes due.
  const dueKey = subSummary.dueSoon.map(s => `${s.id}:${s.next}`).join(',');
  useEffect(() => { if (view === 'Subscriptions' && dueKey && prefs.subsSeen !== dueKey) setPref('subsSeen', dueKey); }, [view, dueKey, prefs.subsSeen, setPref]);
  const subsBadge = dueKey && prefs.subsSeen !== dueKey ? subSummary.dueSoon.length : 0;
  const activeNotification = notifications.find(n => n.id === activeNotificationId);
  const markAllRead = () => setPref('readIds', Array.from(new Set([...prefs.readIds, ...allNotifications.map(n => n.id)])));

  const metaName = session?.user?.user_metadata?.full_name;
  const email = session?.user?.email || tr('Local-only session');
  const defaultName = session?.user?.email ? session.user.email.split('@')[0] : tr('Friend');
  const name = prefs.profileName.trim() || metaName || defaultName;
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
  const openForm = (type = 'expense', accountId = '') => { setError(''); setForm(f => ({ ...f, transaction_type: type, account_id: accountId || f.account_id, occurred_at: today(), time: '' })); setSheet({ name: 'transaction', type }); };
  /* "Add amount" on a card or account: a transfer into it from another account, or a manual top-up (income). */
  const openTransferTo = (accountId) => { setError(''); setForm(f => ({ ...f, transaction_type: 'transfer', account_id: '', transfer_to_account_id: accountId, occurred_at: today(), time: '' })); setSheet({ name: 'transaction', type: 'transfer' }); };
  const openEditAccount = (account) => {
    setError('');
    setAccountForm({
      name: account.name || '', account_type: account.account_type || 'other',
      institution_name: account.institution_name || '', opening_balance: String(account.opening_balance ?? account.balance ?? 0),
      currency: account.currency || 'PHP', mask: prefs.accountStyles?.[account.id]?.mask || account.mask || '', color: prefs.accountStyles?.[account.id]?.color || '', icon: prefs.accountStyles?.[account.id]?.icon || '',
      chip: prefs.accountStyles?.[account.id]?.chip || 'gold', contactless: prefs.accountStyles?.[account.id]?.contactless ?? true, cardKind: prefs.accountStyles?.[account.id]?.cardKind || 'debit',
    });
    setSheet({ name: 'account', type: account.account_type, id: account.id });
  };
  const openEditTransaction = (t) => {
    setError('');
    setForm({
      merchant: t.merchant || '', amount: String(t.origAmount ?? t.amount ?? ''), transaction_type: t.type || t.transaction_type || 'expense',
      category: t.category || 'Other', account_id: t.account_id || '', transfer_to_account_id: t.transfer_to_account_id || '',
      occurred_at: new Date(t.date || t.occurred_at).toLocaleDateString('en-CA'), time: new Date(t.date || t.occurred_at).toTimeString().slice(0, 8), note: t.note || '',
    });
    setSheet({ name: 'transaction', id: t.id });
  };

  const saveTransaction = async (e) => {
    e.preventDefault(); setError('');
    const amount = Number(form.amount); const type = form.transaction_type;
    if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0 || amount >= 1e17) { setError(tr('Enter a description and a valid positive amount.')); return; }
    // Every record belongs to an account: nothing is logged until an account or card exists.
    if (!formAccounts.length) { setError(tr('Add an account or card in Wallet first, then log this transaction.')); return; }
    if (!form.account_id) { setError(tr('Choose an account before saving this transaction.')); return; }
    if (type === 'transfer' && (!form.account_id || !form.transfer_to_account_id || form.transfer_to_account_id === form.account_id)) { setError(tr('Choose two different accounts for a transfer.')); return; }
    const category = type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : form.category;
    // Time is recorded automatically (hour, minute, second) at the moment of saving unless one was set.
    const clock = /^\d{2}:\d{2}(:\d{2})?$/.test(form.time || '') ? (form.time.length === 5 ? `${form.time}:00` : form.time) : new Date().toTimeString().slice(0, 8);
    const stamp = new Date(`${form.occurred_at}T${clock}`);
    if (Number.isNaN(stamp.getTime())) { setError(tr('Enter a valid date and time.')); return; }
    const occurred_at = stamp.toISOString();
    const txCurrency = formAccounts.find(a => a.id === form.account_id)?.currency || base;
    const editingId = sheet?.name === 'transaction' ? sheet.id : null;
    // Duplicate guard (receipts, notifications, chat and manual entries): warn once, a second Save logs it anyway.
    const dup = editingId ? null : findDuplicate({ merchant: form.merchant, amount, type, date: occurred_at, account_id: form.account_id }, rawTxs);
    const sig = `${type}|${amount}|${form.merchant.trim().toLowerCase()}|${form.occurred_at}|${form.account_id}`;
    if (dup && dupAck.current !== sig) { dupAck.current = sig; setError(`${dupText(dup)} ${tr('Save again to log it anyway.')}`); return; }
    dupAck.current = '';
    setBusy(true);
    try {
      if (cloudMode) {
        const payload = { merchant: form.merchant.trim(), amount, currency: txCurrency, transaction_type: type, category, account_id: form.account_id, transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note };
        const row = editingId ? await updateTransaction(editingId, payload) : await createTransaction(payload, session.user.id);
        if (!editingId) markFresh(row.id);
        setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? row : x) : [row, ...cur]);
        notify(editingId ? 'Transaction updated in your MOVO account.' : 'Transaction saved to your MOVO account.');
        if (!editingId) celebrate();
      } else {
        const row = { id: editingId || window.crypto?.randomUUID?.() || String(Date.now()), merchant: form.merchant.trim().slice(0, 160), amount: Math.round(amount * 100) / 100, currency: txCurrency, transaction_type: type, category, account_id: form.account_id || 'local', transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note.slice(0, 1000), source: 'Manual' };
        if (!editingId) markFresh(row.id);
        setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? row : x) : [row, ...cur]);
        notify(editingId ? 'Transaction updated on this device.' : 'Saved on this device only.');
        if (!editingId) celebrate();
      }
      setForm({ ...form, merchant: '', amount: '', note: '', time: '', occurred_at: today() }); setSheet(null);
    } catch { setError(editingId ? 'Could not update this transaction. Check the details and try again.' : 'Could not save this transaction. Check the selected account and try again.'); }
    finally { setBusy(false); }
  };
  const handleCsvFile = (file) => {
    if (!file) return;
    setCsvFileName(file.name || 'transactions.csv');
    setCsvRows([]); setCsvErrors([]); setCsvImportSummary('');
    if (file.size > 5 * 1024 * 1024) { setCsvErrors([{ line: 1, message: tr('CSV file must be 5 MB or smaller.') }]); return; }
    if (!/\.csv$/i.test(file.name || '') && !['text/csv', 'application/vnd.ms-excel'].includes(file.type)) { setCsvErrors([{ line: 1, message: tr('Choose a CSV file.') }]); return; }
    setCsvRows([]); setCsvErrors([]); setCsvImportSummary('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseCsvTransactions(String(reader.result || ''));
        setCsvRows(result.transactions);
        setCsvErrors(result.errors);
        if (!result.transactions.length && !result.errors.length) setCsvErrors([{ line: 1, message: tr('No transactions were found in this file.') }]);
      } catch (err) {
        setCsvRows([]);
        setCsvErrors([{ line: 1, message: err?.message || 'Could not read this CSV file.' }]);
      }
    };
    reader.onerror = () => setCsvErrors([{ line: 1, message: tr('Could not read this file. Please try another CSV.') }]);
    reader.readAsText(file);
  };

  const confirmCsvImport = async () => {
    if (!csvRows.length) return;
    setBusy(true); setCsvImportSummary('');
    const created = []; const errors = [...csvErrors];
    const fingerprints = new Set(txs.map(t => transactionFingerprint(t)));
    try {
      for (let i = 0; i < csvRows.length; i += 1) {
        const row = csvRows[i];
        const matchingAccount = formAccounts.find(a => row.account_name && a.name.trim().toLowerCase() === row.account_name.trim().toLowerCase());
        const accountId = matchingAccount?.id || importAccountId || (!cloudMode && formAccounts.length === 0 ? 'local' : '');
        if (!accountId) { errors.push({ line: i + 2, message: tr('Choose a default account or match the account name for “{merchant}”.', { merchant: row.merchant }) }); continue; }
        const matchingDestination = formAccounts.find(a => row.to_account_name && a.name.trim().toLowerCase() === row.to_account_name.trim().toLowerCase());
        const destinationId = row.transaction_type === 'transfer' ? (matchingDestination?.id || '') : undefined;
        if (row.transaction_type === 'transfer' && (!destinationId || destinationId === accountId)) {
          errors.push({ line: i + 2, message: tr('Transfer “{merchant}” needs a different destination account that matches the CSV.', { merchant: row.merchant }) }); continue;
        }
        const fingerprint = transactionFingerprint({ ...row, account_id: accountId });
        if (fingerprints.has(fingerprint)) { errors.push({ line: i + 2, message: tr('Possible duplicate skipped: “{merchant}”.', { merchant: row.merchant }) }); continue; }
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
          errors.push({ line: i + 2, message: tr('Could not save “{merchant}”. It was not added.', { merchant: row.merchant }) });
        }
      }
      if (created.length) setRawTxs(cur => [...created, ...cur]);
      setCsvRows([]);
      setCsvErrors(errors);
      const summary = `Imported ${created.length} transaction(s). ${errors.length} row(s) skipped or need attention.`;
      setCsvImportSummary(summary);
      notify(summary);
    } finally { setBusy(false); }
  };

  const saveAccount = async (e) => {
    e.preventDefault(); setError('');
    const name = accountForm.name.trim();
    const openingBalance = evaluate(String(accountForm.opening_balance || '').replace(/-/g, '−'));
    const currency = /^[A-Z]{3}$/.test(accountForm.currency || '') ? accountForm.currency : base;
    const saveStyle = (id) => { const { color, icon, mask, chip, contactless, cardKind } = accountForm; setPref('accountStyles', { ...(prefs.accountStyles || {}), [id]: { color, icon, mask, ...(accountForm.account_type === 'card' ? { chip, contactless, cardKind } : {}) } }); };
    if (!name) { setError(tr('Enter an account name.')); return; }
    if (accountForm.mask && !/^\d{4}$/.test(accountForm.mask)) { setError(tr('Enter exactly 4 digits for the last 4 numbers, or leave it empty.')); return; }
    if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) >= 1e17) { setError(tr('Enter a valid opening balance.')); return; }
    if (!accountTypes.some(type => type.value === accountForm.account_type)) { setError(tr('Choose a valid account type.')); return; }
    const editingId = sheet?.name === 'account' ? sheet.id : null;
    setBusy(true);
    try {
      if (cloudMode && session?.user) {
        if (editingId) {
          const a = await updateAccount(editingId, { name, account_type: accountForm.account_type, institution_name: accountForm.institution_name, opening_balance: openingBalance });
          setCloudAccounts(cur => cur.map(item => item.id === editingId ? a : item)); saveStyle(editingId);
          notify(tr('Account updated in your MOVO account.'));
        } else {
          const a = await createAccount({ name, account_type: accountForm.account_type, institution_name: accountForm.institution_name, currency, opening_balance: openingBalance }, session.user.id);
          setCloudAccounts(cur => [...cur, a]); saveStyle(a.id);
          notify(tr('Account added to your signed-in MOVO account.'));
        }
      } else {
        const existing = localAccounts.find(a => a.id === editingId);
        const a = {
          ...(existing || {}),
          id: editingId || window.crypto?.randomUUID?.() || `local-account-${Date.now()}`,
          name: name.slice(0, 100),
          account_type: accountForm.account_type || sheet?.type || 'other',
          institution_name: accountForm.institution_name.trim().slice(0, 100),
          currency, opening_balance: Math.round(openingBalance * 100) / 100,
          balance: Math.round(openingBalance * 100) / 100, is_archived: existing?.is_archived || false, mask: accountForm.mask || existing?.mask || '', brand: existing?.brand || 'blue', source: 'Manual',
        };
        saveStyle(a.id);
        setLocalAccounts(cur => editingId ? cur.map(item => item.id === editingId ? a : item) : [...cur, a]);
        notify(editingId ? 'Account updated on this device.' : 'Account saved on this device only.');
      }
      setAccountForm(BLANK_ACCOUNT);
      setSheet(null);
    } catch { setError(editingId ? 'Could not update account. Please review the details and try again.' : 'Could not add account. Please review the details and try again.'); }
    finally { setBusy(false); }
  };
  const archiveAccount = async (account) => {
    if (!window.confirm(tr('Archive “{name}”? Its transaction history will remain available.', { name: account.name }))) return;
    try {
      if (cloudMode) {
        await updateAccount(account.id, { is_archived: true });
        setCloudAccounts(cur => cur.map(item => item.id === account.id ? { ...item, is_archived: true } : item));
      } else setLocalAccounts(cur => cur.map(item => item.id === account.id ? { ...item, is_archived: true } : item));
      setSheet(null); notify(tr('Account archived. Its transaction history was kept.'));
    } catch { notify(tr('Could not archive this account. Please try again.')); }
  };
  const removeTransaction = async (t) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try { if (cloudMode) await deleteTransaction(t.id); setRawTxs(cur => cur.filter(x => x.id !== t.id)); setSheet(null); notify(tr('Transaction deleted.')); }
    catch { notify(tr('Could not delete this transaction.')); }
  };
  const saveBudget = async ({ id, category, monthly_limit }) => {
    if (cloudMode && session?.user) {
      const row = id ? await updateBudget(id, { category, monthly_limit, currency: base }) : await createBudget({ category, monthly_limit, currency: base }, session.user.id);
      setCloudBudgets(cur => [...cur.filter(b => b.id !== row.id), row]);
    } else {
      const row = { id: id || window.crypto?.randomUUID?.() || `budget-${Date.now()}`, category, monthly_limit, currency: base };
      setPref('budgets', [...(prefs.budgets || []).filter(b => b.id !== row.id), row]);
    }
    notify(tr('Budget saved.'));
  };
  const deleteBudget = async (id) => {
    if (cloudMode) { await removeBudget(id); setCloudBudgets(cur => cur.filter(b => b.id !== id)); } else setPref('budgets', (prefs.budgets || []).filter(b => b.id !== id));
    notify(tr('Budget removed.'));
  };
  const savePlan = (plan) => { const row = { ...plan, currency: base, id: plan.id || window.crypto?.randomUUID?.() || `plan-${Date.now()}` }; setPref('plans', [...plans.filter(p => p.id !== row.id), row]); notify(tr('Plan saved.')); };
  const deletePlan = (id) => { setPref('plans', plans.filter(p => p.id !== id)); notify(tr('Plan removed.')); };
  const saveSubscription = (sub) => {
    const row = { ...sub, id: sub.id || window.crypto?.randomUUID?.() || `sub-${Date.now()}` };
    setPref('subscriptions', [...subscriptions.filter(x => x.id !== row.id), row]);
    notify(sub.id ? tr('Subscription updated.') : tr('{name} added to your subscriptions.', { name: row.name }));
  };
  const deleteSubscription = (id) => { setPref('subscriptions', subscriptions.filter(x => x.id !== id)); notify(tr('Subscription removed.')); };
  /* Opens the add-transaction sheet pre-filled with this renewal, converted to the home currency. */
  const logSubscription = (sub) => {
    const amount = Math.round(toBase(Number(sub.amount) || 0, sub.currency) * 100) / 100;
    setError('');
    setForm(f => ({ ...f, transaction_type: 'expense', merchant: sub.name, amount: String(amount), category: 'Subscriptions', occurred_at: today(), time: '', note: sub.currency && sub.currency !== base ? `${tr('Subscription')} · ${money(Number(sub.amount), sub.currency)}` : tr('Subscription') }));
    setSheet({ name: 'transaction', type: 'expense' });
  };
  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency', 'Account'], ...txs.map(t => [t.date, t.merchant, t.category, t.type, t.origAmount, t.origCurrency || 'PHP', t.accountName])];
    const csv = buildCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'movo-transactions.csv'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSheet(null); notify(tr('CSV export prepared.'));
  };
  const [clearText, setClearText] = useState('');
  const clearAll = async () => {
    if (clearText.trim().toUpperCase() !== 'DELETE') return;
    setBusy(true); setError('');
    try {
      if (cloudMode && session?.user) { await deleteAllCloudData(session.user.id); setCloudAccounts([]); setCloudBudgets([]); }
      const wipe = (store) => { try { Object.keys(store).filter(k => k.startsWith('movo.')).forEach(k => store.removeItem(k)); } catch { /* storage unavailable */ } };
      wipe(localStorage); wipe(sessionStorage); clearLocalFinanceData(); clearCustomStickers(); setSceneryPhotoState(''); pendingLocalDataRef.current = null; setLocalPersistenceWarning(false);
      setPrefs({ ...DEFAULTS }); setRawTxs([]); setLocalAccounts([]); setPendingLog(null); setSheet(null); setClearText('');
      notify(cloudMode ? tr('All MOVO data was deleted from this device and your account.') : tr('All MOVO data on this device was deleted.'));
    } catch { setError(tr('Some cloud data could not be deleted. Nothing on this device was removed; please try again.')); }
    finally { setBusy(false); }
  };
  /* ---------- automation links (Apple Pay / Google Pay / notifications) ---------- */
  const autoLogFor = useCallback(async (entry) => {
    const account = matchAccount(entry.card, accountsView.filter(a => !a.is_archived));
    if (!account) { notify(tr('Add an account or card in Wallet first, then log this transaction.')); return; }
    const payload = { merchant: entry.merchant, amount: entry.amount, transaction_type: 'expense', category: guessCategory(entry.merchant), account_id: account.id, occurred_at: entry.at || new Date().toISOString(), note: `${tr('Logged from {source}', { source: entry.source })}${entry.card ? ` · ${entry.card}` : ''}${entry.ref ? ` · Ref ${entry.ref}` : ''}` };
    const dup = findDuplicate({ ...payload, ref: entry.ref }, rawTxs);
    if (dup) { notify(`${dupText(dup)} ${tr('The {source} notification was not added twice.', { source: tr(entry.source) })}`); return; }
    try {
      if (cloudMode) { const row = await createTransaction({ ...payload, source: 'notification' }, session.user.id); markFresh(row.id); setRawTxs(cur => [row, ...cur]); }
      else { const row = { ...payload, id: window.crypto?.randomUUID?.() || `auto-${Date.now()}`, source: 'Automation' }; markFresh(row.id); setRawTxs(cur => [row, ...cur]); }
      notify(tr('Logged {amount} at {merchant} from {source}.', { amount: money(entry.amount), merchant: entry.merchant, source: tr(entry.source) }));
      celebrate();
    } catch { setPendingLog(entry); }
  }, [accountsView, cloudMode, session, notify, rawTxs, celebrate]);
  /* ---------- logging from the NasrinAI chat (parsed on this device; see lib/chatLog.js) ---------- */
  const logFromChat = useCallback(async (entries, force = false) => {
    const open = accountsView.filter(a => !a.is_archived);
    if (!open.length) throw new Error('account_required');
    const saved = []; const skipped = [];
    for (const e of entries) {
      const account = matchAccount(e.accountHint || '', open);
      if (!account) throw new Error('account_required');
      const currency = account?.currency || e.currency || base;
      const stamp = new Date(e.date); const now = new Date();
      stamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      const payload = { merchant: e.merchant, amount: e.amount, currency, transaction_type: e.type, category: e.category, account_id: account?.id || 'local', occurred_at: stamp.toISOString(), note: tr('Logged from NasrinAI chat') };
      const dup = force ? null : findDuplicate(payload, [...saved, ...rawTxs]);
      if (dup) { skipped.push({ ...payload, id: `dup-${skipped.length}-${dup.id}`, duplicateOf: dup, entry: e, accountName: account?.name || '' }); continue; }
      const row = cloudMode
        ? await createTransaction(payload, session.user.id)
        : { ...payload, id: window.crypto?.randomUUID?.() || `chat-${Date.now()}-${saved.length}`, source: 'Manual' };
      saved.push({ ...row, accountName: account?.name || '' });
    }
    if (saved.length) {
      saved.forEach(r => markFresh(r.id));
      setRawTxs(cur => [...saved, ...cur]);
      notify(saved.length === 1 ? tr('{name} added to your transactions.', { name: saved[0].merchant }) : tr('{n} transactions added.', { n: saved.length }));
      celebrate();
    } else if (skipped.length) notify(dupText(skipped[0].duplicateOf));
    return [...saved, ...skipped];
  }, [accountsView, cloudMode, session, base, notify, rawTxs, celebrate]);
  /* Chat shortcuts: one tap to log, scan or read a MOVO section; summaries are worked out on this device. */
  const chatSummary = (range) => {
    const label = range === 'today' ? tr('Today') : tr('This month');
    const list = txs.filter(t => (range === 'today' ? dayKey(t.date) === todayKey : monthKey(t.date) === monthKey(new Date())));
    if (!list.length) return range === 'today' ? tr('No records yet today.') : tr('No records yet this month.');
    const spent = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const earned = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const byCat = {}; list.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
    const [top, topAmount] = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || [];
    const lines = [tr('**{period}**: you spent {spent} and earned {earned} across {n} records.', { period: label, spent: shown(show, money(spent)), earned: shown(show, money(earned)), n: list.length })];
    if (top) lines.push(tr('Most went to {category} ({amount}).', { category: tr(top), amount: shown(show, money(topAmount)) }));
    return lines.join('\n\n');
  };
  const localAnswer = (q) => answerLocally(q, { txs, accounts: accountsView.map(a => ({ ...a, baseBalance: toBase ? toBase(a.balance, a.currency) : a.balance })), budgets: budgetList, upcoming: subSummary.upcoming || [], fmt: (v) => shown(show, money(v)) });
  const chatShortcuts = [
    { id: 'expense', icon: 'minus', label: 'Expense', run: () => openForm('expense') },
    { id: 'income', icon: 'plus', label: 'Income', run: () => openForm('income') },
    { id: 'transfer', icon: 'transfer', label: 'Transfer', run: () => openForm('transfer') },
    { id: 'scan', icon: 'scan', label: 'Scan receipt', run: () => setSheet({ name: 'scanner' }) },
    { id: 'today', icon: 'calendar', label: 'Today', say: () => chatSummary('today') },
    { id: 'month', icon: 'chart', label: 'This month', say: () => chatSummary('month') },
    { id: 'budgets', icon: 'target', label: 'Budgets', run: () => setSheet({ name: 'budgets', tab: 'budgets' }) },
    { id: 'renewals', icon: 'clock', label: 'Renewals', run: () => go('Subscriptions') },
    { id: 'activity', icon: 'list', label: 'Transactions', run: () => go('Transactions') },
    { id: 'accounts', icon: 'wallet', label: 'Accounts', run: () => go('Wallet') },
  ];
  const undoChatLog = useCallback(async (id) => {
    if (cloudMode) await deleteTransaction(id);
    setRawTxs(cur => cur.filter(x => x.id !== id));
    notify(tr('Transaction removed.'));
  }, [cloudMode, notify]);
  /* ---------- preferences follow the signed-in person across devices ----------
     On sign-in the account's saved preferences (card styles, layouts, theme, subscriptions, plans…) and custom
     sticker artwork are merged with what this device already has cached (nothing local is dropped), and the merged
     result is saved back; after that every change is saved back, debounced. If the cloud table
     is unavailable MOVO keeps working with this device's preferences only. */
  const prefsSync = useRef({ user: '', ready: false, timer: 0 });
  const [stickerTick, setStickerTick] = useState(0);
  useEffect(() => subscribeCustomStickers(() => setStickerTick(t => t + 1)), []);
  const userId = cloudMode ? session?.user?.id || '' : '';
  useEffect(() => {
    const sync = prefsSync.current;
    sync.user = userId; sync.ready = false;
    if (!userId) return undefined;
    let live = true;
    loadPreferences(userId).then(row => {
      if (!live) return;
      if (row?.prefs && typeof row.prefs === 'object' && !Array.isArray(row.prefs)) {
        setPrefs(cur => mergePreferences(DEFAULTS, cur, row.prefs));
        if (Array.isArray(row.stickers) && row.stickers.length) replaceCustomStickers(unionById(row.stickers, getCustomStickers(), 40));
      }
      sync.ready = true;
      setStickerTick(t => t + 1); // upload the merged copy (or this device's on a first sign-in)
    }).catch(() => { /* table unavailable: stay device-only */ });
    return () => { live = false; };
  }, [userId]);
  useEffect(() => {
    const sync = prefsSync.current;
    if (!sync.ready || !sync.user) return undefined;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(() => {
      // Newest stickers first, within the row's size limit; the scenery photo stays on its device.
      let size = 0;
      const stickers = getCustomStickers().filter(st => (size += (st.src || '').length + 200) < 3_800_000);
      const shared = { ...prefs };
      if ((shared.mascot || '').length > 120_000) delete shared.mascot;
      savePreferences(sync.user, shared, stickers).catch(() => { /* retried on the next change */ });
    }, 1500);
    return () => clearTimeout(sync.timer);
  }, [prefs, stickerTick]);

  /* ---------- alerts delivered by the browser (Push Notifications), held during quiet hours ---------- */
  useEffect(() => {
    if (!prefs.push || !prefs.notifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (prefs.quietOn && isQuiet(new Date(), prefs.quietStart, prefs.quietEnd)) return;
    const fresh = notifications.filter(n => n.kind !== 'Transactions' && !prefs.pushed.includes(n.id) && Date.now() - (Date.parse(n.at) || 0) < 2 * 86400000 && Date.parse(n.at) <= Date.now());
    if (!fresh.length) return;
    fresh.slice(0, 3).forEach(n => showSystemNotification(tr(n.title), tr(n.body, n.vars), n.id));
    setPref('pushed', [...fresh.map(n => n.id), ...prefs.pushed].slice(0, 200));
  }, [notifications, prefs.push, prefs.notifications, prefs.pushed, prefs.quietOn, prefs.quietStart, prefs.quietEnd, setPref]);

  /* ---------- sign-ins: each device adds itself once; other devices see it through preference sync ---------- */
  useEffect(() => {
    if (!cloudMode || !session?.user || !prefsSync.current.ready) return;
    if ((prefs.devices || []).some(d => d.id === deviceId)) return;
    setPref('devices', [...(prefs.devices || []), { id: deviceId, label: deviceLabel(), at: new Date().toISOString() }].slice(-10));
  }, [cloudMode, session, prefs.devices, deviceId, setPref, stickerTick]);

  /* ---------- app lock: on open, and again after MOVO has been in the background for a minute ---------- */
  const [locked, setLocked] = useState(() => lockState().enabled && process.env.NODE_ENV !== 'test');
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60000 && lockState().enabled) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const unlock = useCallback(() => setLocked(false), []);

  /* Fade out the loading screen from index.html once the app is ready; keep it at least ~0.9s so it never flashes. */
  useEffect(() => {
    if (!authReady) return undefined;
    const el = document.getElementById('movo-splash');
    if (!el) return undefined;
    const t = setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 400); }, Math.max(0, 900 - (window.performance?.now?.() || 0)));
    return () => clearTimeout(t);
  }, [authReady]);
  /* First-run tour: only for people with no saved preferences, on Home, and never in tests. */
  const showTour = authReady && !prefs.onboarded && view === 'Home' && !sheet && process.env.NODE_ENV !== 'test';
  // The daily briefing waits until tomorrow, so a new person is not shown two popups in a row.
  const finishTour = useCallback(() => setPrefs(cur => ({ ...cur, onboarded: true, briefingDay: todayKey })), [todayKey]);
  /* Usage streak: today counts once Movo is open; a new badge gets its own moment. */
  useEffect(() => {
    if (!authReady) return;
    let unlocked = null;
    setPrefs(cur => {
      const next = updateStreak(cur.streak, todayKey);
      if (next === cur.streak) return cur;
      unlocked = newlyEarned(cur.streak, next);
      return { ...cur, streak: next };
    });
    if (unlocked) { const badge = unlocked; setTimeout(() => celebrate(tr('Badge unlocked: {name}', { name: tr(badge.name) }), badge), 900); }
  }, [authReady, todayKey, celebrate]);
  const handledLink = useRef('');
  const recordsRef = useRef(rawTxs);
  recordsRef.current = rawTxs;
  useEffect(() => {
    if (!authReady || (session?.user && !cloudMode)) return undefined;
    const handle = () => {
      const hash = window.location.hash;
      const entry = readLogLink(hash);
      if (!entry || handledLink.current === hash) return;
      handledLink.current = hash;
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      if (entry.invalid) { notify(tr('That payment link had no valid amount, so nothing was logged.')); return; }
      if (isRepeat(entry)) return;
      const dup = findDuplicate({ merchant: entry.merchant, amount: entry.amount, type: 'expense', ref: entry.ref, date: entry.at || new Date().toISOString() }, recordsRef.current);
      if (dup) { notify(`${dupText(dup)} ${tr('The {source} notification was not added twice.', { source: tr(entry.source) })}`); return; }
      const trusted = sameKey(entry.key, prefs.autoLogKey);
      if (trusted && prefs.autoLog) autoLogFor(entry);
      else setPendingLog({ ...entry, trusted });
    };
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, [authReady, session, cloudMode, prefs.autoLog, prefs.autoLogKey, autoLogFor, notify]);
  /* NasrinAI's briefing opens once a day when the app starts (never over another sheet, and not in unit tests). */
  const briefingShown = useRef(false);
  useEffect(() => {
    if (!authReady || briefingShown.current || !prefs.onboarded || prefs.briefing === false || prefs.briefingDay === todayKey || process.env.NODE_ENV === 'test') return undefined;
    briefingShown.current = true;
    const timer = setTimeout(() => setSheet(cur => cur || { name: 'briefing' }), 700);
    return () => clearTimeout(timer);
  }, [authReady, prefs.onboarded, prefs.briefing, prefs.briefingDay, todayKey]);
  const reviewPending = () => {
    const e = pendingLog; setPendingLog(null); setError('');
    setForm(cur => ({ ...cur, transaction_type: 'expense', merchant: e.merchant, amount: String(e.amount), category: guessCategory(e.merchant), occurred_at: e.at ? new Date(e.at).toLocaleDateString('en-CA') : today(), time: e.at ? new Date(e.at).toTimeString().slice(0, 8) : '', note: `${tr('From {source}', { source: e.source })}${e.card ? ` · ${e.card}` : ''}${e.ref ? ` · Ref ${e.ref}` : ''}`, account_id: matchAccount(e.card, formAccounts)?.id || cur.account_id }));
    setSheet({ name: 'transaction', type: 'expense' });
  };

  const signOutNow = async () => {
    try {
      await signOut();
      const pending = pendingLocalDataRef.current;
      setSession(null);
      setCloudMode(false);
      setCloudAccounts([]);
      setRawTxs(pending?.transactions || loadLocalTransactions());
      setLocalAccounts(pending?.accounts || loadLocalAccounts());
      go('Home');
      notify(tr('Signed out securely.'));
    } catch { notify(tr('Could not sign out. Please try again.')); }
  };

  const c = {
    show, setShow, prefs, setPref, stats, deltas, txs, accountsView, accountsByType, refDate, user, unread, go, session, cloudMode, supabaseConfigured,
    breakdown: homeBreakdown, recent, openTx, notify, sheet, setSheet, signOutNow, exportCsv, openLegal, legalReturnView, notificationsEnabled: prefs.notifications && prefs.inapp, demoAlertsAvailable: false,
    walletFilter, setWalletFilter, selectedCard, setSelectedCardId, openForm, openTransferTo, openEditAccount,
    txFilter, setTxFilter, month: activeMonth, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, expanded, setExpanded, search, setSearch, openSearch: () => setSearchOpen(true),
    notifications, readIds: prefs.readIds, nFilter, setNFilter, markAllRead, openNotification, activeNotification, query, setQuery,
    sceneryPhoto, setSceneryPhoto,
    toBase, base, lang, country: prefs.country, openCountry: () => setSheet({ name: 'country' }), openLanguage: () => setSheet({ name: 'language' }), openCurrency: () => setSheet({ name: 'currency' }),
    budgetList, plans, openBudgets: (tab = 'budgets') => setSheet({ name: 'budgets', tab }),
    subscriptions, subSummary, subsBadge, saveSubscription, deleteSubscription, logSubscription, briefing, openBriefing: () => setSheet({ name: 'briefing' }), openScanner: () => setSheet({ name: 'scanner' }), openAutoLog: () => { if (!prefs.autoLogKey) setPref('autoLogKey', newKey()); setSheet({ name: 'autolog' }); },
  };
  c.txBreakdown = txBreakdown;
  const txScreen = { ...c, breakdown: txBreakdown };

  /* ---------- theme ---------- */
  const resolved = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme === 'dark' ? 'dark' : 'light';
  const tint = ['blue', 'purple', 'orange'].includes(prefs.theme) ? prefs.theme : '';
  const accentName = prefs.accent === 'custom' ? 'custom' : prefs.accent;
  const clarity = Math.min(100, Math.max(0, Number(prefs.clarity) || 0)) / 100; const dark = resolved === 'dark';
  const glassVars = prefs.glass ? { '--glass-blur': `${Math.round(34 - 30 * clarity)}px`, '--glass-fill': (dark ? 0.6 - 0.48 * clarity : 0.78 - 0.64 * clarity).toFixed(2), '--glass-sheet-fill': (dark ? 0.92 - 0.4 * clarity : 0.94 - 0.42 * clarity).toFixed(2), '--glass-edge': (0.16 + 0.18 * clarity).toFixed(2) } : {};
  const scenery = scenerySrc(prefs.scenery, sceneryPhoto);
  const accentHex = accentName === 'custom' ? prefs.customColor : (ACCENTS.find(([n]) => n === accentName)?.[1] || '#2f6bff');
  const rootStyle = { ...glassVars, '--accent-ink': readableAccent(accentHex, resolved === 'dark'), ...(scenery ? { '--scenery-veil': veilFor(prefs.sceneryVisibility) } : {}), ...(accentName === 'custom' ? { '--accent': prefs.customColor, '--accent-rgb': hexToRgb(prefs.customColor) } : {}) };
  const rootClass = `movo-app theme-${resolved}${tint ? ` tint-${tint}` : ''} accent-${accentName}${prefs.glass ? ' glass-on' : ''}${prefs.compact ? ' compact' : ''}${prefs.categoryColors ? '' : ' no-category-colors'}${scenery ? ' has-scenery' : ''} layout-${layout.mode}${layout.dual ? ' layout-dual' : ''}`;
  const activeTab = ROOT_FOR[view];
  const navIdx = NAV.findIndex(n => n[2] === activeTab);
  if (navIdx !== 2 && navIdx >= 0) lastTab.current = navIdx;
  const pillIdx = lastTab.current;

  if (!authReady) return <div className={rootClass} style={rootStyle}><div className="loading-screen"><span className="brand-mark">m</span><p>{tr('Preparing your secure MOVO space…')}</p></div></div>;
  const detailTx = sheet?.name === 'tx' ? txs.find(t => t.id === sheet.id) : null;
  const formAccounts = accountsView.filter(a => !a.is_archived);
  const accountChoice = sheet?.name === 'cardDetails' ? accountsView.find(a => a.id === sheet.id) || selectedCard : null;

  const screen = (() => {
    switch (view) {
      case 'Wallet': return <Wallet c={c} />;
      case 'Transactions': return <Transactions c={txScreen} />;
      case 'Profile': return <Profile c={c} />;
      case 'Menu': return <Menu c={c} />;
      case 'Subscriptions': return <Subscriptions c={c} />;
      case 'EditProfile': return <EditProfile c={c} />;
      case 'Settings': return <Settings c={c} />;
      case 'Appearance': return <Appearance c={c} />;
      case 'Notifications': return <Notifications c={c} />;
      case 'NotificationDetail': return <NotificationDetail c={c} />;
      case 'NotificationSettings': return <NotificationSettings c={c} />;
      case 'TermsOfService': return <TermsOfService c={c} />;
      case 'PrivacyPolicy': return <PrivacyPolicy c={c} />;
      case 'HelpCenter': return <HelpCenter c={c} />;
      case 'NasrinAI': return <NasrinAIChat session={session} cloudMode={cloudMode} onOpenLegal={openLegal} onSignIn={() => go('Sign in')} onLog={logFromChat} onUndoLog={undoChatLog} onViewLog={openTx} onLocalAnswer={localAnswer} shortcuts={chatShortcuts} show={show} />;
      case 'Sign in': return <AuthPanel onOpenLegal={openLegal} onAuthenticated={u => { setSession({ user: u }); go('Home'); refreshCloud(u); }} onContinueLocally={() => { go('Home'); notify(tr('Continuing in local-only mode.')); }} />;
      default: return <Home c={c} />;
    }
  })();

  return <div className={rootClass} style={rootStyle} dir={lang.dir} lang={lang.code}>
    {scenery && <div className="scenery" aria-hidden="true" style={{ backgroundImage: `url("${scenery}")` }} />}
    <div className="app-shell">
      <main className={`screen enter-${motion}${scrolled ? ' is-scrolled' : ''}`} key={view}>
        {localPersistenceWarning && <div className="app-alert storage-warning" role="alert">
          <span><strong>{cloudMode && pendingLocalDataRef.current ? tr('Local-only records were not saved before cloud sign-in.') : tr('Local changes may not be saved.')}</strong> {cloudMode && pendingLocalDataRef.current ? tr('These records are separate from your cloud account. Retry to preserve a local copy on this device; this does not sync them to the cloud.') : tr('Browser storage is unavailable or full. Important records may not survive a reload. Export a copy if possible, free browser storage, then retry. Local records stay on this device and are not cloud-synced.')}</span>
          <button type="button" className="retry-save" onClick={retryLocalPersistence}>{tr('Retry save')}</button>
        </div>}
        {error && !sheet && <div className="app-alert" role="alert">{error}<button type="button" aria-label={tr('Dismiss error')} onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        {screen}
      </main>

      <div className={`bottom-fade${view === 'NasrinAI' ? ' chat' : ''}`} aria-hidden="true" />
      {layout.mode === 'phone' ? <nav className="bottom-nav" aria-label={tr('Main navigation')}>
        <span className={`nav-pill${activeTab === 'NasrinAI' ? ' hidden' : ''}`} aria-hidden="true" style={{ '--idx': pillIdx }} />
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          return <button type="button" key={label} className={`nav-item${center ? ' nav-center' : ''}${active ? ' nav-active' : ''}`} onClick={() => go(target)} aria-current={active ? 'page' : undefined} aria-label={label} title={tr(label)}>
            <span className="nav-icon">{center ? <span className="orb"><NasrinMark size={24} /></span> : <Icon name={icon} size={24} strokeWidth={1.8} filled={active} />}</span>
            {target === 'Home' && unread && <i className="nav-badge" aria-label={tr('New activity')} />}
          </button>;
        })}
      </nav> : <nav className="side-nav" aria-label={tr('Main navigation')}>
        <span className="side-brand"><MovoMark size={30} /><span>Movo</span></span>
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          return <button type="button" key={label} className={`side-item${active ? ' active' : ''}`} onClick={() => go(target)} aria-current={active ? 'page' : undefined} title={tr(label)}>
            <span className="side-icon">{center ? <NasrinMark size={20} /> : <Icon name={icon} size={22} strokeWidth={1.8} filled={active} />}{target === 'Home' && unread && <i className="nav-badge" aria-label={tr('New activity')} />}</span>
            <span className="side-label">{tr(label)}</span>
          </button>;
        })}
        <span className="side-spacer" />
        <button type="button" className="side-item side-add" onClick={() => openForm('expense')} title={tr('Add transaction')}><span className="side-icon"><Icon name="plus" size={22} strokeWidth={2} /></span><span className="side-label">{tr('Add transaction')}</span></button>
        <button type="button" className={`side-item${view === 'Settings' ? ' active' : ''}`} onClick={() => go('Settings')} title={tr('Settings')}><span className="side-icon"><Icon name="gear" size={22} strokeWidth={1.8} /></span><span className="side-label">{tr('Settings')}</span></button>
      </nav>}

      {sheet?.name === 'transaction' && <TransactionSheet autoCategory={prefs.autocat !== false} currency={formAccounts.find(a => a.id === form.account_id)?.currency || base} form={form} setForm={setForm} editing={!!sheet.id} accounts={formAccounts} cloudMode={cloudMode} busy={busy} error={error} onSave={saveTransaction} onClose={() => { setSheet(null); setError(''); }} onScan={sheet.id ? undefined : () => setSheet({ name: 'scanner' })} />}
      {sheet?.name === 'scanner' && <ScannerSheet show={show} onClose={() => setSheet(null)} onLog={(f) => { const dup = findDuplicate({ merchant: f.merchant, amount: f.amount, type: 'expense', ref: f.ref, date: f.occurred_at ? `${f.occurred_at}T${f.time || '12:00:00'}` : new Date() }, rawTxs); setError(dup ? `${dupText(dup)} ${tr('Save again to log it anyway.')}` : ''); setForm(cur => ({ ...cur, transaction_type: 'expense', merchant: f.merchant, amount: f.amount, category: f.category, occurred_at: f.occurred_at || today(), time: f.time || '', note: f.note })); setSheet({ name: 'transaction', type: 'expense' }); }} />}

      {sheet?.name === 'account' && <AccountSheet base={base} country={prefs.country || 'PH'} form={accountForm} setForm={setAccountForm} editing={!!sheet.id} cloudMode={cloudMode} busy={busy} error={error} onSave={saveAccount} onClose={() => { setSheet(null); setError(''); setAccountForm(BLANK_ACCOUNT); }} />}

      {sheet?.name === 'actions' && <Sheet title={tr('Quick actions')} onClose={() => setSheet(null)}>
        <div className="sheet-menu">
          <button type="button" onClick={() => openForm('expense')}><Icon name="plus" size={20} />{tr('Add transaction')}</button>
          <button type="button" onClick={() => setSheet({ name: 'scanner' })}><Icon name="scan" size={20} />{tr('Scan receipt')}</button>
          <button type="button" onClick={() => setSheet({ name: 'account', type: 'bank' })}><Icon name="wallet" size={20} />{tr('Add account')}</button>
          <button type="button" onClick={() => { setCsvRows([]); setCsvErrors([]); setCsvImportSummary(''); setCsvFileName(''); setImportAccountId(''); setSheet({ name: 'importCsv' }); }}><Icon name="upload" size={20} />{tr('Import CSV')}</button>
          <button type="button" onClick={exportCsv}><Icon name="download" size={20} />{tr('Export CSV')}</button>
          <button type="button" onClick={() => setSheet({ name: 'themes' })}><Icon name="palette" size={20} />{tr('Choose theme')}</button>
        </div>
      </Sheet>}

      {sheet?.name === 'themes' && <ThemeSheet c={c} />}
      {sheet?.name === 'language' && <Sheet title={tr('Language')} subtitle={tr('Choose the language for MOVO on this device.')} onClose={() => setSheet(null)} label={tr('Language')}>
        <div className="sheet-list">{[{ code: '', name: tr('Automatic (device language)') }, ...LANGUAGES].map(l => <button type="button" key={l.code || 'auto'} lang={l.code || undefined} className={`sheet-card${(prefs.language || '') === l.code ? ' selected' : ''}`} aria-pressed={(prefs.language || '') === l.code} onClick={() => { setPref('language', l.code); setSheet(null); }}><span className="account-main"><strong>{l.name}</strong></span>{(prefs.language || '') === l.code && <Icon name="check" size={18} />}</button>)}</div>
      </Sheet>}
      {sheet?.name === 'country' && <CountrySheet value={prefs.country} locale={lang.locale} onPick={([code, language, currency]) => { setPrefs(cur => ({ ...cur, country: code, language, currency })); setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet?.name === 'currency' && <CurrencySheet value={base} fx={fx} locale={lang.locale} onPick={(code) => { setPref('currency', code); setSheet(null); }} onClose={() => setSheet(null)} />}
      {showTour && !locked && <Walkthrough onDone={finishTour} />}
      {locked && <LockScreen onUnlock={unlock} onForgot={() => {
        // Never unlock on "forgot": the only way past the lock is erasing this device's MOVO data (and the lock).
        if (!window.confirm(tr('Reset Movo on this device? This removes the lock and all Movo data stored here. Data saved to your account returns after you sign in.'))) return;
        const wipe = (store) => { try { Object.keys(store).filter(k => k.startsWith('movo.')).forEach(k => store.removeItem(k)); } catch { /* storage unavailable */ } };
        wipe(localStorage); wipe(sessionStorage); signOut().catch(() => {}).finally(() => window.location.reload());
      }} />}
      {sheet?.name === 'briefing' && <BriefingSheet briefing={briefing} show={show} name={user.firstName} onClose={() => { setPref('briefingDay', todayKey); setSheet(null); }} onAsk={() => { setPref('briefingDay', todayKey); setSheet(null); go('NasrinAI'); }} />}
      {sheet?.name === 'budgets' && <BudgetsSheet initialTab={sheet.tab} progress={budgetList} plans={plans} show={show} cloudMode={cloudMode} onSaveBudget={saveBudget} onDeleteBudget={deleteBudget} onSavePlan={savePlan} onDeletePlan={deletePlan} onClose={() => setSheet(null)} />}


      {sheet?.name === 'importCsv' && <Sheet title={tr('Import transactions')} subtitle={tr('CSV is parsed in this browser. Nothing is uploaded until you confirm the import.')} onClose={() => setSheet(null)} label={tr('Import transactions')}>
        <div className="sheet-form">
          <label>{tr('Choose CSV file')}<input type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (file) handleCsvFile(file); }} /></label>
          <p className="form-note">{tr('Required columns: Date, Description, Type, Amount. Optional: Currency, Category, Account, To Account, Note. Review the preview before importing.')}</p>
          {csvFileName && <p className="form-note">{tr('File: {name}', { name: csvFileName })}</p>}
          {formAccounts.length > 0 && <label>{tr('Default account (used when the CSV account name does not match)')}<select value={importAccountId} onChange={e => setImportAccountId(e.target.value)}><option value="">{tr('Choose account')}</option>{formAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {csvRows.length > 0 && <section className="card pad" aria-label={tr('CSV import preview')}><strong>{tr('Preview · {n} valid row(s)', { n: csvRows.length })}</strong>{csvRows.slice(0, 5).map((row, i) => <div className="detail-row" key={`${row.occurred_at}-${row.merchant}-${i}`}><span className="menu-main"><strong>{row.merchant}</strong><small>{tr(row.transaction_type[0].toUpperCase() + row.transaction_type.slice(1))} · {tr(row.category)} · {row.account_name || tr('default account')}</small></span><b>{money(row.amount, row.currency)}</b></div>)}{csvRows.length > 5 && <p className="form-note">{tr('Showing the first 5 rows. All valid rows will be processed.')}</p>}</section>}
          {csvImportSummary && <p className="form-note" role="status">{csvImportSummary}</p>}
          {csvErrors.length > 0 && <div className="form-error" role="alert"><strong>{tr('Rows needing attention')}</strong><ul>{csvErrors.slice(0, 8).map((item, i) => <li key={`${item.line}-${i}`}>{tr('Row {line}: {message}', { line: item.line, message: tr(item.message, item.vars) })}</li>)}</ul>{csvErrors.length > 8 && <p>{tr('And {n} more row(s).', { n: csvErrors.length - 8 })}</p>}</div>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSheet(null)}>{tr('Close')}</button><button type="button" className="primary-button" onClick={confirmCsvImport} disabled={busy || !csvRows.length}>{busy ? tr('Importing…') : tr('Import {n} transaction(s)', { n: csvRows.length })}</button></div>
        </div>
      </Sheet>}
      {sheet?.name === 'clear' && <Sheet title={tr('Clear all data?')} subtitle={cloudMode ? tr('Permanently deletes everything in your MOVO account (transactions, accounts, budgets and NasrinAI chats) and all MOVO data on this device. Your sign-in stays.') : tr('Permanently deletes all MOVO data on this device: transactions, accounts, budgets, plans, scans, mascot, card styles and preferences.')} onClose={() => { setSheet(null); setClearText(''); }} label={tr('Clear all data')}>
        <form className="sheet-form" onSubmit={e => { e.preventDefault(); clearAll(); }}>
          <p className="form-note">{tr('Export a CSV first if you want a copy. This cannot be undone.')}</p>
          <label>{tr('Type DELETE to confirm')}<input aria-label={tr('Type DELETE to confirm')} autoComplete="off" value={clearText} onChange={e => setClearText(e.target.value)} placeholder={tr('DELETE')} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setClearText(''); }}>{tr('Cancel')}</button><button type="submit" className="danger-button" disabled={busy || clearText.trim().toUpperCase() !== 'DELETE'}>{busy ? tr('Deleting…') : tr('Clear all data')}</button></div>
        </form>
      </Sheet>}

      {accountChoice && <Sheet title={accountChoice.name} subtitle={accountTypes.find(t => t.value === accountChoice.account_type)?.label} onClose={() => setSheet(null)} label={tr('Account details')}>
        <div className="detail-card-view">{accountChoice.account_type === 'card' ? <CardArt a={accountChoice} show={show} styleId={prefs.cardStyles?.[accountChoice.id] || ''} holder={user?.name} /> : <AccountTile a={accountChoice} show={show} style={styleFor(accountChoice, prefs.accountStyles)} size="preview" />}</div>
        <dl className="detail-list"><div><dt>{tr('Institution')}</dt><dd>{accountChoice.institution_name || tr('Personal account')}</dd></div><div><dt>{tr('Number')}</dt><dd>{accountChoice.mask ? `•••• ${accountChoice.mask}` : '—'}</dd></div><div><dt>{tr('Balance')}</dt><dd>{shown(show, money(accountChoice.balance, accountChoice.currency))}</dd></div></dl>
        <div className="sheet-actions">{(cloudMode || localAccounts.some(account => account.id === accountChoice.id)) && <><button type="button" className="secondary-button" onClick={() => openEditAccount(accountChoice)}><Icon name="edit" size={16} /> {tr('Edit account')}</button><button type="button" className="danger-button" onClick={() => archiveAccount(accountChoice)}><Icon name="archive" size={16} /> {tr('Archive account')}</button></>}<button type="button" className="primary-button" onClick={() => openForm('expense', accountChoice.id)}>{tr('Add transaction')}</button></div>
      </Sheet>}

      {detailTx && <Sheet title={detailTx.merchant} subtitle={`${longDate(detailTx.date)}, ${timeLabelFull(detailTx.date)}`} onClose={() => setSheet(null)} label={tr('Transaction details')}>
        <dl className="detail-list"><div><dt>{tr('Amount')}</dt><dd>{shown(show, money(detailTx.origAmount, detailTx.origCurrency))}{detailTx.origCurrency !== base && <small className="fx-note">≈ {shown(show, money(detailTx.amount, base))}</small>}</dd></div><div><dt>{tr('Type')}</dt><dd>{tr(detailTx.type[0].toUpperCase() + detailTx.type.slice(1))}</dd></div><div><dt>{tr('Category')}</dt><dd>{tr(detailTx.category || tr('Other'))}</dd></div><div><dt>{tr('Account')}</dt><dd>{detailTx.accountName}</dd></div>{detailTx.note && <div><dt>{tr('Note')}</dt><dd>{detailTx.note}</dd></div>}<div><dt>{tr('Date & time')}</dt><dd>{longDate(detailTx.date)}, {timeLabelFull(detailTx.date)}</dd></div>{refOf(detailTx) && <div><dt>{tr('Reference ID')}</dt><dd className="ref-id">{refOf(detailTx)}</dd></div>}</dl>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => openEditTransaction(detailTx)}><Icon name="edit" size={16} /> {tr('Edit')}</button><button type="button" className="danger-button" aria-label={tr('Delete {name}', { name: detailTx.merchant })} onClick={() => removeTransaction(detailTx)}><Icon name="trash" size={16} /> {tr('Delete')}</button></div>
      </Sheet>}

      {pendingLog && <div className="log-prompt" role="alertdialog" aria-label={tr('Log this payment?')}>
        <span className="log-prompt-icon"><Icon name="card" size={18} /></span>
        <span className="menu-main"><strong>{tr(pendingLog.source)}: {shown(show, money(pendingLog.amount))}</strong><small>{pendingLog.merchant}{pendingLog.trusted ? '' : ` · ${tr('from a link, please confirm')}`}</small></span>
        <button type="button" className="secondary-button" onClick={() => setPendingLog(null)} aria-label={tr('Dismiss payment')}>{tr('Skip')}</button>
        <button type="button" className="primary-button" onClick={reviewPending}>{tr('Log')}</button>
      </div>}
      {sheet?.name === 'autolog' && <Sheet title={tr('Automatic logging')} subtitle={tr('Log Apple Pay and Google Pay payments from your phone\'s automations.')} onClose={() => setSheet(null)} label={tr('Automatic logging')}>
        <div className="card menu-card"><div className="menu-row"><span className="menu-icon bare"><Icon name="refresh" size={20} /></span><span className="menu-main"><strong>{tr('Log without asking')}</strong><small>{prefs.autoLog ? tr('Payments are added instantly.') : tr('MOVO asks you to confirm each payment.')}</small></span><Toggle checked={prefs.autoLog} onChange={v => setPref('autoLog', v)} label={tr('Log without asking')} /></div></div>
        <section className="card shortcut-quick" aria-label={tr('Set up with one prompt')}>
          <strong><Icon name="spark" size={16} strokeWidth={2.2} /> {tr('Set up with one prompt (iPhone)')}</strong>
          <ol className="setup-steps">
            <li>{rich('Open {shortcuts} → {automation} → {plus} → {transaction}. Pick your cards, choose {run}, then tap {create}.', { shortcuts: <em>Shortcuts</em>, automation: <em>Automation</em>, plus: <em>+</em>, transaction: <em>Transaction</em>, run: <em>Run Immediately</em>, create: <em>Create New Shortcut</em> })}</li>
            <li>{rich('Paste the prompt into {describe} and send it.', { describe: <em>Describe a shortcut</em> })}</li>
            <li>{tr('Check that it opens your Movo link with Amount, Merchant and Card, then tap Done.')}</li>
          </ol>
          <button type="button" className="primary-button" onClick={() => { navigator.clipboard?.writeText(shortcutPrompt(window.location.origin, prefs.autoLogKey)).then(() => notify(tr('Prompt copied. Paste it into Shortcuts.')), () => notify(tr('Could not copy. Select the link below instead.'))); }}><Icon name="doc" size={16} /> {tr('Copy prompt for Shortcuts')}</button>
          <small>{tr('Describing a shortcut needs Apple Intelligence. If you do not see it, follow the manual steps below.')}</small>
        </section>
        <details className="setup-manual">
          <summary>{tr('Set it up manually instead')}</summary>
          <ol className="setup-steps">
            <li><strong>{tr('iPhone (Apple Pay):')}</strong> {rich('Open {shortcuts} → Automation → New → {transaction}. Pick your cards, choose {run}, then add {open} with the link below. Replace AMOUNT, MERCHANT and CARD with the Shortcut Input variables.', { shortcuts: <em>Shortcuts</em>, transaction: <em>Transaction</em>, run: <em>Run Immediately</em>, open: <em>Open URLs</em> })}</li>
            <li><strong>{tr('Android (Google Pay / bank alerts):')}</strong> {rich('In an automation app such as MacroDroid or Tasker, trigger on a Google Wallet or bank notification and open the link below with {src}, filling in the amount and merchant from the notification.', { src: <em>src=googlepay</em> })}</li>
            <li>{rich('To record the bank reference number and time, add {ref} or {text} with the full notification text, and {date} if the payment happened earlier.', { ref: <em>&amp;ref=REF</em>, text: <em>&amp;text=</em>, date: <em>&amp;date=</em> })}</li>
          <li>{tr('Keep this link private. It contains a key unique to this device; links without it always ask first.')}</li>
          </ol>
        </details>
        <div className="setup-link"><code>{linkTemplate(window.location.origin, prefs.autoLogKey || '…')}</code></div>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setPref('autoLogKey', newKey()); notify(tr('New link created. Update your automations; the old link now asks first.')); }}>{tr('Reset key')}</button><button type="button" className="primary-button" onClick={() => { navigator.clipboard?.writeText(linkTemplate(window.location.origin, prefs.autoLogKey)).then(() => notify(tr('Link copied.')), () => notify(tr('Copy failed. Select the link and copy it manually.'))); }}>{tr('Copy link')}</button></div>
      </Sheet>}
      {searchOpen && <SearchOverlay txs={txs} show={show} refDate={refDate} onOpen={openTx} onClose={() => setSearchOpen(false)} />}
      <LoggedBurst id={burst?.id} label={burst?.label} badge={burst?.badge} onDone={endBurst} />
      {toast && <div className={`toast${busy ? ' raised' : ''}${view === 'NasrinAI' ? ' over-composer' : ''}`} role="status" aria-live="polite">{toast}</div>}
      {busy && <div className="sync-indicator" role="status"><span className="spinner" /> {tr('Syncing securely…')}</div>}
    </div>
  </div>;
}
export default App;
