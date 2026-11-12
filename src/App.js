import { recoverHybridWorkspace, persistHybridLocalRows, persistHybridLocalImport } from './lib/hybridWorkspaceRecovery';
import { listOwnerSyncOperations, acknowledgeReconciledWorkspace, approveHybridOperations } from './lib/hybridLocalStore';
import FinanceBackupSheet from './components/FinanceBackupSheet';
import { prepareFinanceBackupRestore } from './lib/financeBackupRestore';
import { planPreferenceRestore } from './lib/backupPreferences';
import { putLocalAttachment, getLocalAttachment, clearLocalAttachments } from './lib/localAttachments';
import { PlanProvider } from './lib/PlanContext';
import { usePlanEntitlement } from './lib/usePlanEntitlement';
import { canUseFeatureInMode, effectiveAccessPlan, effectivePlan } from './lib/planAccess';
import { loggedAt } from './lib/loggedAt';
import { closeTopBackLayer, createScreenTrail, hasBackLayer, listenForDeviceBack } from './lib/backNavigation';
import { startEdgeSwipeBack } from './lib/edgeSwipeBack';
import { appIconById, appIconUnlocked } from './lib/appIcons';
import { setNativeAppIcon } from './lib/native';
import PlanOffer from './components/PlanOffer';
import { activateNativeReferral } from './lib/referrals';
import { UsageSheet } from './screens/Settings';
import './components/Plans.css';
import { applyCardPayments } from './lib/creditCard';
import { buildIndexedBalances } from './lib/indexedBalance';
import { clearHybridOwner } from './lib/hybridLocalStore';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccountOptions } from './components/AccountPicker';
import { flushSync } from 'react-dom';
import './App.css';
import AuthPanel from './components/AuthPanel';
import Icon, { NasrinMark } from './components/Icon';
import { Sheet } from './components/ui';
import ReconnectSyncPrompt from './components/ReconnectSyncPrompt';
import Home from './screens/Home';
import Wallet from './screens/Wallet';
import ScheduledDuePrompt from './components/ScheduledDuePrompt';
import Transactions from './screens/Transactions';
import Profile, { EditProfile } from './screens/Profile';
import Menu from './screens/Menu';
import Subscriptions from './screens/Subscriptions';
import { BriefingSheet } from './components/Briefing';
import Walkthrough from './components/Walkthrough';
import SetupAgreement from './components/SetupAgreement';
import CloudPlanNotice from './components/CloudPlanNotice';
import { LEGAL_VERSION, hasAcceptedLegal } from './lib/legalVersion';
import LockScreen from './components/LockScreen';
import CardArt from './components/CardArt';
import AccountTile from './components/AccountTile';
import LoggedBurst from './components/LoggedBurst';
import { useLayout } from './lib/layout';
import { markFresh } from './lib/freshRecords';
import { answerLocally } from './lib/localAnswer';
import { updateStreak, newlyEarned } from './lib/streak';
import { MovoMark } from './components/MovoLogo';
import { findDuplicate, refOf } from './lib/duplicates';
import { mergePreferences, unionById, cloudSafePreferences } from './lib/prefsMerge';
import { buildSystemNotices, isQuiet, deviceLabel, showSystemNotification, pushGranted } from './lib/alerts';
import { lockState } from './lib/appLock';
import { buildBriefing } from './lib/insights';
import { summarize as summarizeSubscriptions, billingDate, subscriptionPaymentAccountId, revertSubscriptionPayment, restoreSubscriptionPayment } from './lib/subscriptions';
import Settings, { Appearance, NotificationSettings, ThemeSheet } from './screens/Settings';
import Notifications, { NotificationDetail, buildNotifications } from './screens/Notifications';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { uploadAccountQr, getAccountQrSignedUrl, cacheSignedAccountQr, removeAccountQr, isAccountQrDataUrl } from './lib/accountQrStorage';
import { supportsAccountQr } from './lib/accountQrEligibility';
import LoyaltySheet from './components/LoyaltySheet';
import { isLoyaltyType, normalizeLoyaltyCard, visibleLoyaltyCards } from './lib/loyaltyCards';
import { saveLocalAccountQr, getLocalAccountQr, removeLocalAccountQr, clearLocalAccountQr } from './lib/accountQrLocalStore';
import { canAnimate, revealChange, showInstantly } from './lib/motion';
import { convert, loadRates, refreshRates, CURRENCIES, currencyName } from './lib/fx';
import { LANGUAGES, detectLanguage, setLanguage, loadLanguage, t as tr } from './lib/i18n';
import { COUNTRIES, countryName, regionalLocale } from './lib/regions';
import SearchOverlay from './components/SearchOverlay';
import TransactionSheet from './components/TransactionSheet';
import AccountSheet from './components/AccountSheet';
import AccountDetailsSheet from './components/AccountDetailsSheet';
import LoyaltyDetailsSheet from './components/LoyaltyDetailsSheet';
import { readLogLink, sameKey, isRepeat, matchAccount, newKey } from './lib/autoLog';
import { guessCategory } from './lib/ocr';
import { categoryOf, categoryId, categoryFullLabel } from './lib/categories';
import { evaluate } from './lib/calc';
import { spendingLimitProgress } from './lib/spendingLimits';
import { accountBalance, accountAvailableBalance, savingsBalance } from './lib/financeCalculations';
import { buildTransactionRunningBalances } from './lib/transactionRunningBalances';
import { listAccountingPostings, listAccountingActivities, reverseAllocationEvent, listLoans, listReceivables, createLoan, createReceivable } from './lib/obligationsRepository';
import { getCurrentSession, listAccounts, listTransactions, createAccount, updateAccount, createTransaction, updateTransaction, deleteTransaction, restoreTransactionLinks, signOut, listBudgets, createBudget, updateBudget, removeBudget, deleteAllCloudData, deleteMyAccount, loadPreferences, savePreferences, listAutomationInbox, resolveAutomationInboxItem, listArchivedAutomations, deleteAutomationInboxItem, purgeArchivedAutomations, finishOAuth } from './lib/financeRepository';
import { addToArchive, archiveEntry, purgeArchive, removeFromArchive } from './lib/archive';
import { listenForAndroidBack, listenForAppUrls } from './lib/native';
import { startNativeChrome } from './lib/nativeChrome';
import { enableFontScaling, fontScaleOf, fontStyleOf, loadFontStyle } from './lib/fontPrefs';
import RecentLogsSheet, { SOURCE_LABEL } from './components/RecentLogsSheet';
import { AUTOMATION_SOURCES } from './lib/transactionSources';
import { BudgetsSheet, SpendingLimitsSheet, budgetProgress } from './components/Budgets';
import { monthOverMonth } from './lib/trend';
import { totalBalance, balanceAsOf } from './lib/totalBalance';
import { scenerySrc, veilFor, loadSceneryPhoto, saveSceneryPhoto } from './lib/scenery';
import { loadLocalTransactions, saveLocalTransactions, loadLocalAccounts, saveLocalAccounts, clearLocalFinanceData } from './lib/localFinanceStore';
import { loadOfflineWorkspace, saveOfflineWorkspace, updateOfflineWorking, clearOfflineWorkspace, recordOfflineDeletions, restoreOfflineRows, holdOfflineWorkspaceForApproval } from './lib/offlineWorkspaceStore';
import { reconcileAndCommitOfflineWorkspace } from './lib/offlineSyncTransport';
import { unsyncedChangeCount } from './lib/unsyncedChanges';
import { ConfirmProvider, deleteRecord, useConfirmController } from './components/ConfirmDialog';
import { lazyScreen, preloadScreens } from './lib/lazyScreen';
import { newRecordId } from './lib/recordId';
import { CLOUD_READ_TIMEOUT_MS, CLOUD_WRITE_TIMEOUT_MS, isNetworkFailure, withTimeout } from './lib/networkFailure';
// The first screen waits this long at most for the opening sync before showing the saved copy.
const LAUNCH_SYNC_WAIT_MS = 4000;
import { readRequiredFinancialCloudViews } from './lib/cloudFinancialReadGate';
import { matchesConfirmedOfflineHandoff, planOfflineNetworkTransition } from './lib/offlineHandoffSafety';
import { assertOfflineSyncOwner, fetchOfflineSyncCloud, insertOfflineAccount, updateOfflineAccountCAS, insertOfflineTransaction, updateOfflineTransactionCAS, deleteOfflineTransactionCAS, uploadOfflineReceipt, offlineUploadProblem } from './lib/offlineSyncCloudAdapter';
import { canUseFeature } from './lib/planAccess';
import { planOfflineReconciliation } from './lib/offlineReconciliation';
import { parseCsvTransactions, transactionFingerprint, findUniqueCsvAccount } from './lib/csvImport';
import { IMPORT_MAX_BYTES, parseImportFile, planImport } from './lib/dataImport';
import { money, shown, dayKey, monthKey, monthLabel, longDate, timeLabelFull, BUCKETS, bucketOf, setFormatLocale, setBaseCurrency, formatDate } from './lib/format';
import { ACCENTS } from './screens/Settings';
import { buildCsv } from './lib/csvExport';
import { clearCustomStickers, getCustomStickers, replaceCustomStickers, subscribeCustomStickers } from './lib/stickers';
import { apiUrl, isNativeApp, nativePlatform } from './lib/platform';
import { noteActiveDay, readReviewState, requestStoreReview, shouldAskForReview, writeReviewState } from './lib/reviewPrompt';
import { nativeAutomationKey, sanitizeNativePreferenceCache, saveNativeAutomationKey } from './lib/nativeAutomationKey';
import { recordPaymentAttempt } from './lib/paymentAttempts';
import { listBills, listOccurrences, createBill } from './lib/billsRepository';

/* Loaded on demand (lib/lazyScreen.js): none of these is needed for the first screen; all are preloaded once idle. */
const FinancialPlanning = lazyScreen(() => import('./screens/FinancialPlanning'));
const Cashback = lazyScreen(() => import('./screens/Cashback'));
const ScheduledTransactions = lazyScreen(() => import('./screens/ScheduledTransactions'));
const ExchangeRates = lazyScreen(() => import('./screens/ExchangeRates'));
const CryptoMarket = lazyScreen(() => import('./screens/CryptoMarket'));
const StocksMarket = lazyScreen(() => import('./screens/StocksMarket'));
const Archive = lazyScreen(() => import('./screens/Archive'));
const NasrinAIChat = lazyScreen(() => import('./components/NasrinAIChat'));
const TermsOfService = lazyScreen(() => import('./screens/Legal'), { pick: 'TermsOfService' });
const PrivacyPolicy = lazyScreen(() => import('./screens/Legal'), { pick: 'PrivacyPolicy' });
const HelpCenter = lazyScreen(() => import('./screens/HelpCenter'));
const TutorialVideo = lazyScreen(() => import('./components/TutorialVideo'), { placeholder: null });
const GrocerySheet = lazyScreen(() => import('./components/GrocerySheet'), { placeholder: null });
const ScannerSheet = lazyScreen(() => import('./components/ScannerSheet'), { placeholder: null });
const AutoLogSheet = lazyScreen(() => import('./components/AutoLogSheet'), { placeholder: null });

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
  if (dark) {
    for (let i = 0; i < 12 && (lum() + 0.05) / (0.0116 + 0.05) < 6; i += 1) [r, g, b] = [r, g, b].map(v => Math.round(v + (255 - v) * 0.18));
  } else {
    // Accent-colored text/icons sit on light surfaces; darken bright accents to WCAG AA.
    for (let i = 0; i < 12 && 1.05 / (lum() + 0.05) < 4.5; i += 1) [r, g, b] = [r, g, b].map(v => Math.round(v * 0.82));
  }
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
/** Chooses accessible foreground ink for accent-filled controls (WCAG contrast). */
export function contrastTextForAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '#ffffff';
  const channels = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const luminance = channels.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
}
// When a record reached MOVO (created_at), falling back to when it happened for older local rows.
const logStamp = (t) => Date.parse(t.created_at || t.occurred_at || t.date || '') || 0;
const dupText = (d) => tr('Already logged: {merchant} · {amount} on {date}.', { merchant: d.merchant, amount: money(d.amount, d.currency), date: formatDate(d.occurred_at, { month: 'short', day: 'numeric' }, 'md') });
const DEFAULTS = {
  theme: 'system', glass: true, clarity: 55, scenery: '', sceneryVisibility: 45, accent: 'green', customColor: '#13b45f', navAccent: 'plan', showBalance: true, showBalanceAfterTransaction: true, compact: false, fontStyle: 'default', fontSize: 'default', categoryColors: true,
  notifications: true, push: false, email: false, inapp: true, cloudSyncEnabled: true, autoSyncOnReconnect: false, catTransactions: true, catAccount: true, catAi: true, catPromo: true, catReports: true,
  biometrics: true, cloudSync: true, localStorage: false, autocat: true, profileName: '', phone: '', location: '', readIds: [], notifSeenAt: '', logsSeenAt: '', subsSeen: '', quietOn: false, quietStart: '22:00', quietEnd: '07:00', pushed: [], devices: [], streak: null, cardStyles: {},
  accountStyles: {}, accountQrCodes: {}, accountQrPending: {}, membershipCards: [], loyaltyRewardRules: {}, layouts: {}, budgets: [], plans: [], spendingLimits: [], subscriptions: [], archive: [], briefing: true, briefingDay: '', onboarded: false, tutorialSeen: false, legalAccepted: '', legalAcceptedAt: '', homeHero: 'auto', cloudPlanNoticeDay: '', mascot: '', mascotStyle: 'ram', appIcon: 'default', autoLog: false, autoLogKey: '', autoLogAccount: '', language: '', currency: 'PHP', country: '', cryptoWatchlist: ['btc-bitcoin', 'eth-ethereum', 'sol-solana'], stockWatchlist: ['AAPL', 'MSFT', 'NVDA'], cryptoAlerts: [], cryptoHoldings: [], fxPairs: ['USD:PHP', 'EUR:PHP', 'SGD:PHP', 'JPY:PHP', 'GBP:PHP', 'AUD:PHP'],
};
const ROOT_FOR = { ScheduledTransactions: 'Menu', Archive: 'Menu', FinancialPlanning: 'Menu', Cashback: 'Menu', ExchangeRates: 'Menu', CryptoMarket: 'Menu', StocksMarket: 'Menu', Home: 'Home', Notifications: 'Home', NotificationDetail: 'Home', NotificationSettings: 'Home', Wallet: 'Wallet', Transactions: 'Transactions', NasrinAI: 'NasrinAI', Menu: 'Menu', Profile: 'Menu', Subscriptions: 'Menu', Settings: 'Menu', Appearance: 'Menu', EditProfile: 'Menu', HelpCenter: 'Menu', TermsOfService: 'Menu', PrivacyPolicy: 'Menu' };
// Screens reachable while setup is unfinished (see setupDone in App).
const SETUP_SCREENS = new Set(['Home', 'Sign in', 'TermsOfService', 'PrivacyPolicy']);
const SETUP_READING = new Set(['Sign in', 'TermsOfService', 'PrivacyPolicy']);
const DEPTH = { ScheduledTransactions: 1, Archive: 1, FinancialPlanning: 1, Cashback: 1, ExchangeRates: 1, CryptoMarket: 1, StocksMarket: 1, Home: 0, Wallet: 0, NasrinAI: 0, Transactions: 0, Menu: 0, Profile: 1, Subscriptions: 1, Notifications: 1, Settings: 1, EditProfile: 1, 'Sign in': 1, Appearance: 2, NotificationDetail: 2, NotificationSettings: 2 };
const ORDER = { Home: 0, Wallet: 1, NasrinAI: 2, Transactions: 3, Menu: 4 };
const NAV = [['Home', 'home', 'Home'], ['Wallet', 'wallet', 'Wallet'], ['NasrinAI', 'spark', 'NasrinAI'], ['Transactions', 'list', 'Transactions'], ['Menu', 'grid', 'Menu']];
const BLANK_ACCOUNT = { name: '', account_type: 'bank', institution_name: '', opening_balance: '', creditLimit: '', owedNow: '', currency: '', mask: '', color: '', icon: '', chip: 'gold', contactless: true, cardKind: 'debit', linkedBankId: '' };
const today = () => new Date().toLocaleDateString('en-CA');

function readPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREF));
    if (stored) return { ...DEFAULTS, onboarded: true, ...stored,
      ...(isNativeApp() ? { autoLogKey: nativeAutomationKey() } : {}),
    }; // people who already used MOVO skip the first-run tour
    const old = JSON.parse(localStorage.getItem(OLD_PREF)) || {};
    return { ...DEFAULTS, theme: old.dark ? 'dark' : DEFAULTS.theme, accent: old.accent === 'mono' ? 'slate' : (old.accent || DEFAULTS.accent), showBalance: old.showBalance !== false,
      ...(isNativeApp() ? { autoLogKey: nativeAutomationKey() } : {}) };
  } catch {
    return { ...DEFAULTS, ...(isNativeApp() ? { autoLogKey: nativeAutomationKey() } : {}) };
  }
}
const hexToRgb = (hex) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '47,107,255'; };
const monthsBack = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
/* Each record keeps its original amount and currency; `amount` is converted to the home currency for totals. */
const normalize = (t, accountsById, base, rates) => {
  const account = accountsById.get(t.account_id);
  const transferTarget = accountsById.get(t.transfer_to_account_id);
  const origCurrency = t.origCurrency || t.currency || account?.currency || 'PHP';
  const origAmount = Number(t.origAmount ?? t.amount);
  // category: the stored value is kept as categoryId (stable id, or custom text); `category` becomes the compact
  // category's label so totals, budgets and insights group consistently (docs/TRANSACTION_CATEGORIES.md).
  const cat = categoryOf(t.category);
  return {
    ...t,
    categoryId: categoryId(t.category) || t.category || '',
    category: cat.label,
    subcategory: cat.subLabel,
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

/*
 * A device copy with no pending changes holds nothing the cloud does not (every row came from a complete,
 * owner-checked cloud read), so the cloud's current rows replace it: new and edited rows, and rows deleted in the
 * cloud (online on this device, or on another one). Any device-only change, invalid row or owner mismatch still
 * stops here for review; pending changes always go through the reconciliation instead.
 */
/** A backup attachment (base64 data URL) as a Blob for the device's attachment store. */
function dataUrlToBlob(dataUrl) {
  const [head, body = ''] = String(dataUrl).split(',', 2);
  const type = (/^data:([^;]+);base64$/.exec(head) || [])[1] || 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
function cleanCopyCheck(ownerId, copy, cloud) {
  const check=planOfflineReconciliation({ownerId,base:copy.baseline,local:copy.working,cloud,
    groups:['financial_accounts','transactions'],localDeletions:copy.pendingDeletions,deletedRows:copy.deletedRows});
  const ok=!copy.dirty&&!check.issues.length&&!check.upload.length
    &&check.conflicts.every(item=>item.reason==='remote_row_missing_without_tombstone');
  return {ok,changes:check.download.length+check.conflicts.length};
}
function App() {
  const [session, setSession] = useState(null);
  // One confirmation dialog for log out and every destructive action (components/ConfirmDialog.js).
  const { confirm, element: confirmDialog } = useConfirmController();
  const { entitlement, refreshEntitlement, entitlementReady } = usePlanEntitlement(session);
  const nativeReferralAttempt = useRef('');
  useEffect(() => {
    const id = session?.user?.id;
    if (!id || !session?.access_token || nativeReferralAttempt.current === id) return;
    nativeReferralAttempt.current = id;
    activateNativeReferral(session).catch(() => { /* Server retains pending verification; no local reward. */ });
  }, [session?.user?.id, session?.access_token]);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [cloudMode, setCloudMode] = useState(false);
  const [offlineOwnerId, setOfflineOwnerId] = useState(null);
  const [syncState, setSyncState] = useState({status:'idle',message:'',uploaded:0,downloaded:0});
  const [restoredConnection, setRestoredConnection] = useState(false);
  // "Not now" on the reconnect pop-up: keep the small reminder instead until the changes sync (owner, 2026-11-12).
  const [reconnectDeferred, setReconnectDeferred] = useState(false);
  // One automatic sync attempt per reconnection (see the reconnect effect below).
  const autoSyncTriedRef = useRef(false);
  const [autoSyncFailed, setAutoSyncFailed] = useState(false);
  const syncActiveRef = useRef(false);
  const lastSyncRetryRef = useRef(false); // the last failed sync only needs the connection back
  const [view, setView] = useState('Home');
  const viewRef = useRef('Home');
  const [motion, setMotion] = useState('fade');
  const [scrolled, setScrolled] = useState(false);
  const lastTab = useRef(0);
  const [legalReturnView, setLegalReturnView] = useState('Profile');
  const [prefs, setPrefs] = useState(readPrefs);
  // Cloud Sync paused for lack of a plan: shown as a panel (components/CloudPlanNotice.js), at most once a day.
  const [cloudPlanNotice, setCloudPlanNotice] = useState(false);
  const prefsRef = useRef(prefs);
  /*
   * Paid features follow the server-verified plan. Offline-first: while Cloud Sync is on but the connection is down
   * (or a sync is waiting), a signed-in owner keeps them on this account's device copy; the entitlement is still the
   * last one the server verified for this person and still expires on time. Only turning Cloud Sync off pauses them
   * (#245), and a person whose plan was never verified gets nothing extra.
   */
  const deviceCopyAccess = !cloudMode && !!session?.user?.id && prefs.cloudSyncEnabled !== false && offlineOwnerId === session.user.id;
  const safeCloudAccess = (cloudMode || deviceCopyAccess) && syncState.status !== 'blocked';
  const can = feature => canUseFeatureInMode(entitlement, feature, safeCloudAccess);
  const plan = effectiveAccessPlan(entitlement, safeCloudAccess);
  const cloudSyncRequestedRef = useRef(prefs.cloudSyncEnabled !== false);
  const cloudLoadEpochRef = useRef(0);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);
  const [accountQrDisplay, setAccountQrDisplay] = useState({});
  const [qrRetryTick, setQrRetryTick] = useState(0);
  const [fx, setFx] = useState(loadRates);
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [cloudPostings, setCloudPostings] = useState([]);
  const [cloudActivities, setCloudActivities] = useState([]);
  const [cloudBudgets, setCloudBudgets] = useState([]);
  const [cloudBills, setCloudBills] = useState([]);
  const [cloudBillOccurrences, setCloudBillOccurrences] = useState([]);
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
  const [homeMonthKey, setHomeMonthKey] = useState('');
  const [walletFilter, setWalletFilter] = useState('All');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [nFilter, setNFilter] = useState('All');
  const [activeNotificationId, setActiveNotificationId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [inbox, setInbox] = useState([]); // phone automations that could not be logged (cloud only)
  const [pendingLog, setPendingLog] = useState(null);
  const [automationStatus, setAutomationStatus] = useState('idle');
  const [toast, setToast] = useState('');
  const [localPersistenceWarning, setLocalPersistenceWarning] = useState(false);
  const pendingLocalDataRef = useRef(null);
  // Prevent duplicate cloud loads on INITIAL_SESSION, SIGNED_IN and TOKEN_REFRESHED.
  // This guard also prevents an older user's cloud response from replacing local records.
  const cloudAuthUserRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState(BLANK_ACCOUNT);
  const [form, setForm] = useState({ merchant: '', amount: '', transaction_type: 'expense', category: 'food:groceries', account_id: '', transfer_to_account_id: '', occurred_at: today(), time: '', note: '', payment_reference: '', receipt_note: '', receipt_path: '', receipt_path_to_delete: '', receipt_file: null });
  const [csvRows, setCsvRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [importAccountId, setImportAccountId] = useState('');
  const [csvImportSummary, setCsvImportSummary] = useState('');
  const [csvConfirmAction, setCsvConfirmAction] = useState('');
  const systemDark = useSystemDark();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const setPref = useCallback((key, value) => {
    const apply = () => setPrefs(cur => ({ ...cur, [key]: value }));
    if (key === 'autoLogKey' && isNativeApp()) {
      // Never activate a new shortcut device key until Keychain/Keystore
      // confirms it is durably protected on this device.
      saveNativeAutomationKey(value).then(apply).catch(() =>
        setError(tr('Could not save. Please try again.')));
      return;
    }
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
  useEffect(() => {
    try {
      // The local automation credential stays only in the native vault.
      // Preferences mirroring may persist harmless theme/notification settings.
      localStorage.setItem(PREF, JSON.stringify(sanitizeNativePreferenceCache(prefs)));
    } catch { /* storage unavailable */ }
  }, [prefs]);
  const layout = useLayout();
  const [burst, setBurst] = useState(null);
  const celebrate = useCallback((label, badge) => setBurst({ id: Date.now(), label, badge }), []);
  // Rate MOVO (lib/reviewPrompt.js): after a new record is saved, at a good moment, the phone apps ask the store's own
  // rating dialog to appear. It waits for the save celebration to finish and never shows over a sheet or the lock.
  const reviewGateRef = useRef({ ready: false, sheet: false });
  const maybeAskForReview = useCallback((records) => {
    if (!shouldAskForReview({ platform: nativePlatform(), state: readReviewState(), records })) return;
    window.setTimeout(() => { const gate = reviewGateRef.current; if (gate.ready && !gate.sheet) requestStoreReview(); }, 1800);
  }, []);
  const endBurst = useCallback(() => setBurst(null), []);
  const dupAck = useRef('');
  const notify = useCallback((msg) => { setToast(msg); window.clearTimeout(window.__movoToast); window.__movoToast = window.setTimeout(() => setToast(''), 2800); }, []);
  const loadOwnedLocal = useCallback((ownerId) => {
    const stored=loadOfflineWorkspace(ownerId);
    if (!stored) {
      // A new signed-in owner starts with a separate empty workspace. Never
      // silently attach guest records to this account.
      const empty={financial_accounts:[],transactions:[]};
      if (!saveOfflineWorkspace(ownerId,{version:2,owner:ownerId,baseline:empty,working:empty,dirty:false}))
        return false;
    }
    const next=loadOfflineWorkspace(ownerId);
    if (!next) return false;
    setOfflineOwnerId(ownerId);
    setLocalAccounts(next.working.financial_accounts);
    setRawTxs(next.working.transactions);
    setCloudPostings(next.working.accounting_postings||[]);
    setCloudActivities(next.working.accounting_activities||[]);
    setCloudMode(false);
    return true;
  }, []);
  /*
   * Every verified first-time account gets one month of Pro (owner, 2026-11-09). After the plans sheet has been seen
   * (where a referral code can be entered), an eligible signed-in person who did not start it there gets it started
   * automatically. The server alone decides eligibility (claim_movo_trial); a refusal is retried on a later launch.
   */
  /*
   * Badge app icon: the iPhone app shows the chosen badge icon while it stays unlocked. It follows the verified
   * subscription (not Cloud Sync mode, so turning sync off does not flip the icon); once the plan is confirmed
   * to have ended, MOVO returns to the standard icon.
   */
  const subscriptionPlan = effectivePlan(entitlement);
  useEffect(() => {
    const icon = appIconById(prefs.appIcon);
    if (icon.id === 'default') return;
    if (appIconUnlocked(icon, prefs.streak, subscriptionPlan)) { setNativeAppIcon(icon.native); return; }
    if (entitlementReady || (authReady && !session?.user)) { setPrefs(p => ({ ...p, appIcon: 'default' })); setNativeAppIcon(null); }
  }, [prefs.appIcon, prefs.streak, subscriptionPlan, entitlementReady, authReady, session?.user]);
  const trialAutoRef = useRef('');
  useEffect(() => {
    const id = session?.user?.id;
    if (!id || !session?.access_token || !prefs.planWelcomeSeen || !entitlement?.trialEligible || trialAutoRef.current === id) return;
    trialAutoRef.current = id;
    fetch(apiUrl('/api/purchases/trial'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: '{}' })
      .then(response => { if (response.ok) { refreshEntitlement(); notify(tr('Your free month of Pro has started.')); } })
      .catch(() => { trialAutoRef.current = ''; });
  }, [session?.user?.id, session?.access_token, prefs.planWelcomeSeen, entitlement?.trialEligible, refreshEntitlement, notify]);
  useEffect(() => {
    if (cloudMode) {
      if (!pendingLocalDataRef.current) setLocalPersistenceWarning(false);
      return;
    }
    let saved=false;
    const ownerId=session?.user?.id;
    if (ownerId) {
      if (offlineOwnerId!==ownerId) return; // auth-transition guard
      const stored=loadOfflineWorkspace(ownerId);
      const data={...(stored?.working||{}),financial_accounts:localAccounts,transactions:rawTxs};
      if (stored) {
        const unchanged=JSON.stringify(data)===JSON.stringify(stored.working);
        saved=unchanged||updateOfflineWorking(ownerId,data);
      }
    } else {
      const transactionsSaved=saveLocalTransactions(rawTxs,false);
      const accountsSaved=saveLocalAccounts(localAccounts);
      saved=transactionsSaved&&accountsSaved;
    }
    if (saved) pendingLocalDataRef.current=null;
    else pendingLocalDataRef.current={ownerId:ownerId||null,transactions:rawTxs,accounts:localAccounts};
    setLocalPersistenceWarning(!saved);
  }, [rawTxs,localAccounts,cloudMode,session?.user?.id,offlineOwnerId]);
  const retryLocalPersistence = useCallback(() => {
    const pending=pendingLocalDataRef.current;
    if(cloudMode&&!pending){setLocalPersistenceWarning(false);return;}
    const ownerId=session?.user?.id;
    let saved=false;
    if(ownerId){
      const previous=loadOfflineWorkspace(ownerId);
      saved=!!previous&&updateOfflineWorking(ownerId,{...previous.working,
        financial_accounts:pending?.accounts||localAccounts,transactions:pending?.transactions||rawTxs});
    }else{
      const txSaved=saveLocalTransactions(pending?.transactions||rawTxs,false);
      saved=txSaved&&saveLocalAccounts(pending?.accounts||localAccounts);
    }
    if(saved)pendingLocalDataRef.current=null;
    setLocalPersistenceWarning(!saved);
    notify(saved?'Local records saved on this device. Pending changes will sync after verification.':
      'Browser storage is unavailable or full. Export your records and retry.');
  }, [rawTxs,localAccounts,cloudMode,session?.user?.id,notify]);

  const launchWaitRef = useRef(0); // cap on how long the launch screen waits for the opening sync
  const refreshCloud = useCallback(async (user, { allowOffline = false } = {}) => {
    if (!user || !cloudSyncRequestedRef.current || syncActiveRef.current) return false;
    syncActiveRef.current=true;
    const ownerId=user.id;
    const loadEpoch=++cloudLoadEpochRef.current;
    setBusy(true);setError('');
    setSyncState({status:'checking',message:'Checking offline and cloud changes…',uploaded:0,downloaded:0});
    try {
      // Never let SIGNED_IN/visibility/online events approve an older offline
      // journal. Only the explicit Sync local to cloud action may do that.
      await recoverHybridWorkspace(ownerId);
      const capturedOperations=(await listOwnerSyncOperations(ownerId)).map(op=>op.id);
      const waiting=loadOfflineWorkspace(ownerId);
      if(allowOffline&&waiting){
        await approveHybridOperations(ownerId,capturedOperations);
        if(!saveOfflineWorkspace(ownerId,{...waiting,requiresManualSync:false}))
          throw new Error('Device storage could not save your sync approval.');
      }
      if(waiting?.dirty && waiting.requiresManualSync && !allowOffline){
        setRestoredConnection(true);
        setSyncState({status:'pending',retry:false,message:'Offline changes are saved. Tap Sync local to cloud to upload them.',uploaded:0,downloaded:0});
        loadOwnedLocal(ownerId);
        return false;
      }
      // A signed-in browser session alone is never a paid cloud entitlement.
      // Verify before reading or copying a cloud-backed finance workspace.
      const verified=await withTimeout(refreshEntitlement(),CLOUD_READ_TIMEOUT_MS);
      // No answer at all means the server could not be reached: keep working on the device and retry later.
      if(verified===null)throw Object.assign(Error('Cloud is unreachable. Changes are saved on this device and upload automatically when you are back online.'),{retryable:true});
      if(!canUseFeature(verified,'cloudWrite'))
        throw Object.assign(Error('Cloud Sync requires verified active access. Local records remain on this device.'),{planRequired:true});
      if(cloudAuthUserRef.current!==ownerId||!cloudSyncRequestedRef.current||loadEpoch!==cloudLoadEpochRef.current)return false;
      const today=new Date();
      const dateKey=d=>String(d.getFullYear())+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const until=new Date(today);until.setDate(until.getDate()+30);
      // Never convert a failed financial read into an empty collection. That
      // would falsely certify a partial device fallback as complete.
      let {accountsTransactions:rawCloud,postings,activities,inbox:failed,bills,
        billOccurrences,budgets}=await withTimeout(readRequiredFinancialCloudViews({
        accountsTransactions:()=>fetchOfflineSyncCloud(ownerId),
        postings:()=>listAccountingPostings(),
        activities:()=>listAccountingActivities(),
        inbox:()=>listAutomationInbox(),
        bills:()=>listBills(),
        billOccurrences:()=>listOccurrences(dateKey(until),dateKey(today)),
        budgets:()=>listBudgets(),
      }),CLOUD_READ_TIMEOUT_MS);
      if (cloudAuthUserRef.current!==ownerId || !cloudSyncRequestedRef.current || loadEpoch!==cloudLoadEpochRef.current) return false;
      let confirmed=rawCloud;
      let status={status:'synced',message:'Cloud and device account/transaction rows match.',uploaded:0,downloaded:0};
      const previous=loadOfflineWorkspace(ownerId);
      if(previous && !previous.dirty){
        const check=cleanCopyCheck(ownerId,previous,rawCloud);
        if(!check.ok)
          throw Error('Cloud and device history differ unexpectedly. Existing offline records were preserved for review.');
        status={...status,downloaded:check.changes};
      }
      if(previous?.dirty){
        // This same owner-specific entitlement was verified before the read.
        if (!canUseFeature(verified,'cloudWrite'))
          throw Object.assign(Error('Offline changes are saved. Active cloud-write plan verification is required to upload them.'),{planRequired:true});
        // Every cloud step has a deadline, so a slow connection ends this attempt (and the next retry picks up
        // where it stopped) instead of leaving the sync hanging.
        const timed=(fn,ms=CLOUD_WRITE_TIMEOUT_MS)=>(...args)=>withTimeout(fn(...args),ms);
        const result=await reconcileAndCommitOfflineWorkspace({
          ownerId,workspace:previous,fetchRemote:timed(fetchOfflineSyncCloud,CLOUD_READ_TIMEOUT_MS),
          insertAccount:timed(insertOfflineAccount),updateAccountCAS:timed(updateOfflineAccountCAS),
          insertTransaction:timed(insertOfflineTransaction),updateTransactionCAS:timed(updateOfflineTransactionCAS),
          deleteTransactionCAS:timed(deleteOfflineTransactionCAS),uploadReceipt:timed(uploadOfflineReceipt,CLOUD_READ_TIMEOUT_MS),
          assertOwner:timed(assertOfflineSyncOwner),
          shouldContinue:()=>cloudSyncRequestedRef.current && loadEpoch===cloudLoadEpochRef.current,
        });
        if(!result.ok){
          const reasons=result.plan?.counts||{};
          throw Error('Offline and cloud data need review ('+
            (reasons.conflicts||0)+' conflicts, '+(reasons.invalid||0)+' invalid groups). Nothing was discarded.');
        }
        // User may have edited another tab while network calls ran.
        const latest=loadOfflineWorkspace(ownerId);
        if(!latest||JSON.stringify(latest.working)!==JSON.stringify(previous.working))
          throw Object.assign(Error('Device records changed during reconciliation. They will upload on the next sync.'),{retryable:true});
        confirmed={financial_accounts:result.workspace.working.financial_accounts,
          transactions:result.workspace.working.transactions};
        status={status:'synced',message:'Account and transaction changes reconciled.',uploaded:result.uploaded,downloaded:result.downloaded};
        // Reversal RPCs update linked tables. Never cache their pre-mutation values.
        if(result.uploaded){
          [postings,activities,bills,billOccurrences,budgets]=await withTimeout(Promise.all([
            listAccountingPostings(),listAccountingActivities(),listBills(),listOccurrences(dateKey(until),dateKey(today)),listBudgets(),
          ]),CLOUD_READ_TIMEOUT_MS);
        }
      }
      if(cloudAuthUserRef.current!==ownerId||!cloudSyncRequestedRef.current||loadEpoch!==cloudLoadEpochRef.current)return false;
      const verifiedCopy=loadOfflineWorkspace(ownerId);
      const shared={...verifiedCopy?.working,...confirmed,accounting_postings:postings,accounting_activities:activities,
        financial_bills:bills,bill_occurrences:billOccurrences,budgets};
      const synced={version:2,owner:ownerId,baseline:shared,working:shared,dirty:false,
        lastConfirmedAt:new Date().toISOString(),pendingDeletions:{},deletedRows:{}};
      if(!saveOfflineWorkspace(ownerId,synced))
        throw Error('Device storage could not hold the reconciled copy. Cloud was not enabled; export records and free space.');
      await acknowledgeReconciledWorkspace(ownerId,confirmed,capturedOperations);
      setOfflineOwnerId(ownerId);setLocalAccounts(shared.financial_accounts);setRawTxs(shared.transactions);
      setCloudAccounts(confirmed.financial_accounts);setCloudPostings(postings||[]);
      setCloudActivities(activities||[]);setCloudBills(bills||[]);
      setCloudBillOccurrences(billOccurrences||[]);setCloudBudgets(budgets||[]);
      setInbox(failed||[]);setCloudMode(true);setSyncState(status);
      setRestoredConnection(false);
      lastSyncRetryRef.current=false;
      return true;
    }catch(cause){
      // A lost or slow connection is retried automatically; anything else (a conflict, a plan check) waits for review.
      const retry=isNetworkFailure(cause)||cause?.retryable===true;
      if(retry&&!allowOffline)holdOfflineWorkspaceForApproval(ownerId);
      lastSyncRetryRef.current=retry;
      const message=retry
        ? 'No connection to the cloud. Changes are saved on this device. Sync when connection is restored.'
        : cause?.message||'Cloud is unavailable. Device changes remain queued.';
      // A superseded attempt (signed out, Cloud Sync switched, or a newer save) leaves the current state alone.
      if(cloudAuthUserRef.current===ownerId&&cloudSyncRequestedRef.current&&loadEpoch===cloudLoadEpochRef.current){
        setSyncState({status:'pending',retry,message,uploaded:0,downloaded:0});
        // A missing plan is not an error to shout about: a calm panel explains it (at most once a day) instead.
        if(cause?.planRequired)setCloudPlanNotice(true);
        else if(!retry)setError(message);
        const restored=loadOwnedLocal(ownerId);
        if(!restored) setLocalPersistenceWarning(true);
        setCloudMode(false);
      }
      return false;
    }finally{syncActiveRef.current=false;setBusy(false);clearTimeout(launchWaitRef.current);setAuthReady(true);}
  },[loadOwnedLocal,refreshEntitlement]);

  const setCloudSyncEnabled=useCallback(async (enabled)=>{
    if(!enabled){
      // Persist the latest confirmed account/transaction copy BEFORE hiding
      // cloud records. Decline switch if browser quota prevents the copy.
      if(session?.user?.id&&cloudMode){
        const ownerId=session.user.id;
        const rows={financial_accounts:cloudAccounts,transactions:rawTxs};
        const previous=loadOfflineWorkspace(ownerId);
        if(!matchesConfirmedOfflineHandoff(ownerId,previous,rows)){
          notify('Cloud and device history differ unexpectedly. Existing offline records were preserved for review.');
          return false;
        }
        // Reuse the last VERIFIED baseline instead of certifying possibly
        // stale in-memory UI rows as a fresh cloud backup. Preserve extras.
        if(!saveOfflineWorkspace(ownerId,previous)){
          notify('Device storage is full. Cloud Sync remains on; export a backup before trying again.');
          return false;
        }
        setOfflineOwnerId(ownerId);
        setLocalAccounts(previous.working.financial_accounts);
        setRawTxs(previous.working.transactions);
      }else if(session?.user?.id&&offlineOwnerId!==session.user.id&&!loadOwnedLocal(session.user.id)){
        notify('Unable to open this account’s offline workspace. Cloud settings were not changed.');
        return false;
      }
      cloudSyncRequestedRef.current=false;++cloudLoadEpochRef.current;
      setPref('cloudSyncEnabled',false);
      setCloudMode(false);setCloudAccounts([]);setCloudBudgets([]);
      setCloudBills([]);setCloudBillOccurrences([]);setInbox([]);
      const cached=loadOfflineWorkspace(session.user.id);
      setCloudPostings(cached?.working.accounting_postings||[]);setCloudActivities(cached?.working.accounting_activities||[]);
      setSyncState({status:'offline',message:'Offline mode. Local changes will be reconciled after reconnecting.',uploaded:0,downloaded:0});
      return true;
    }
    if(!session?.user?.id){notify('Sign in before enabling Cloud Sync. Guest records stay on this device.');return false;}
    const verified=await refreshEntitlement();
    if(!canUseFeature(verified,'cloudWrite')){
      notify('Cloud Sync requires an active verified cloud plan. Local records are preserved.');
      return false;
    }
    cloudSyncRequestedRef.current=true;++cloudLoadEpochRef.current;
    // Reconciliation determines if cloud can be enabled. A failed sync cannot
    // overwrite the dirty working set or falsely mark it as uploaded.
    const ok=await refreshCloud(session.user);
    // A lost connection keeps Cloud Sync on (it uploads on reconnect); a conflict or plan problem turns it off.
    const keep=!!ok||lastSyncRetryRef.current;
    setPref('cloudSyncEnabled',keep);
    cloudSyncRequestedRef.current=keep;
    return ok;
  },[session,cloudMode,cloudAccounts,rawTxs,offlineOwnerId,refreshCloud,refreshEntitlement,loadOwnedLocal,setPref,notify]);

  /*
   * Offline-first hand-off. When the connection drops, or a cloud save cannot reach the server, a signed-in owner
   * keeps working on this account's own device copy (never guest records, never another person's), and every change
   * is uploaded automatically once the connection is back. Returns true when the device copy is active.
   * Browser network loss must not discard a confirmed owner-specific cloud copy or cancel a subscription.
   */
  const switchToDeviceCopy = useCallback(() => {
    if(!session?.user?.id||prefsRef.current.cloudSyncEnabled===false)return false;
    if(!cloudMode)return offlineOwnerId===session.user.id;
    const ownerId=session.user.id,previous=loadOfflineWorkspace(ownerId);
    const rows={financial_accounts:cloudAccounts,transactions:rawTxs};
    const choice=planOfflineNetworkTransition(ownerId,previous,rows);
    const block = message => {
      cloudSyncRequestedRef.current=false;++cloudLoadEpochRef.current;
      setLocalPersistenceWarning(true);
      setSyncState({status:'blocked',message,uploaded:0,downloaded:0});
      notify(message);
      return false;
    };
    // Never turn an unverified empty device cache into an apparent copy of live cloud finances.
    if(choice==='blocked')return block('Signed-in account workspace is unavailable. No records were changed.');
    if(choice==='reuse_confirmed'){
      if(!saveOfflineWorkspace(ownerId,{...previous,requiresManualSync:true}))return block('Offline switch stopped: device storage is full. Export your records before editing.');
      setOfflineOwnerId(ownerId);
      setLocalAccounts(previous.working.financial_accounts);
      setRawTxs(previous.working.transactions);
      setCloudMode(false);
    }else if(!loadOwnedLocal(ownerId)){
      // Restoring a previously verified device copy preserves both the owner journal and newer cloud rows.
      return block('Signed-in account workspace is unavailable. No records were changed.');
    }
    holdOfflineWorkspaceForApproval(ownerId);
    cloudSyncRequestedRef.current=false;++cloudLoadEpochRef.current;
    setSyncState({status:'offline',retry:true,
      message:choice==='restore_stale'
        ? 'No internet. Showing the last saved device copy; you can sync when the connection returns.'
        : 'No internet. Changes are saved on this device; approve sync after reconnection.',
      uploaded:0,downloaded:0});
    return true;
  },[cloudMode,cloudAccounts,rawTxs,session?.user?.id,offlineOwnerId,loadOwnedLocal,notify]);
  // Explicit approval for held offline records. Auth and CAS are still verified by refreshCloud.
  const syncNow = useCallback(() => {
    if(prefsRef.current.cloudSyncEnabled===false||!session?.user||syncActiveRef.current)return;
    cloudSyncRequestedRef.current=true;
    setRestoredConnection(false);
    refreshCloud(session.user,{allowOffline:true}).then(ok=>{
      if(!ok && loadOfflineWorkspace(session.user.id)?.requiresManualSync) setRestoredConnection(true);
    }).catch(()=>setRestoredConnection(true));
  },[session?.user,refreshCloud]);
  // Online import is allowed to upload automatically only when there are no held offline changes.
  const showDeviceCopyAndSync = (ownerId) => {
    const copy=loadOfflineWorkspace(ownerId);
    if(!copy)return false;
    cloudSyncRequestedRef.current=false;++cloudLoadEpochRef.current;
    setOfflineOwnerId(ownerId);setLocalAccounts(copy.working.financial_accounts);setRawTxs(copy.working.transactions);
    setCloudMode(false);
    const manual=copy.requiresManualSync===true || (typeof navigator!=='undefined' && navigator.onLine===false);
    if(manual)holdOfflineWorkspaceForApproval(ownerId);
    setSyncState({status:'pending',retry:!manual,
      message:manual?'Saved on device. Tap Sync local to cloud after reconnecting.':'Saved on device. Uploading to your MOVO account…',
      uploaded:0,downloaded:0});
    if(manual){ if(typeof navigator!=='undefined' && navigator.onLine!==false)setRestoredConnection(true); }
    else window.setTimeout(()=>{
      cloudSyncRequestedRef.current=true;
      refreshCloud({id:ownerId}).catch(()=>{});
    },0);
    return true;
  };
  useEffect(() => {
    const wentOffline=()=>{setRestoredConnection(false);autoSyncTriedRef.current=false;setAutoSyncFailed(false);if(cloudMode)switchToDeviceCopy();};
    const cameOnline=()=>{
      const ownerId=session?.user?.id;
      const workspace=ownerId?loadOfflineWorkspace(ownerId):null;
      if(ownerId&&prefsRef.current.cloudSyncEnabled!==false&&workspace?.dirty&&workspace.requiresManualSync)
        setRestoredConnection(true);
    };
    window.addEventListener('offline',wentOffline);
    window.addEventListener('online',cameOnline);
    return ()=>{
      window.removeEventListener('offline',wentOffline);
      window.removeEventListener('online',cameOnline);
    };
  },[cloudMode,switchToDeviceCopy,session?.user?.id]);
  /*
   * Back online with changes made offline (owner, 2026-11-12). With "Sync automatically when back online" on, they
   * upload silently once the connection has settled; otherwise MOVO asks first (ReconnectSyncPrompt below). Either
   * way the upload goes through the same verified path as "Sync now" (sign-in, plan and conflict checks).
   */
  // One automatic attempt per reconnection: if it does not finish (server busy, plan or conflict check), MOVO asks
  // with the pop-up instead of retrying in a loop. A new offline period or a completed sync allows the next one.
  useEffect(() => {
    if (syncState.status === 'synced') { autoSyncTriedRef.current = false; setAutoSyncFailed(false); }
  }, [syncState.status]);
  useEffect(() => {
    if (!restoredConnection) { setReconnectDeferred(false); return undefined; }
    if (prefs.autoSyncOnReconnect !== true || busy || reconnectDeferred) return undefined;
    if (autoSyncTriedRef.current) { setAutoSyncFailed(true); return undefined; }
    const timer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      autoSyncTriedRef.current = true;
      syncNow();
    }, 1500);
    return () => clearTimeout(timer);
  }, [restoredConnection, prefs.autoSyncOnReconnect, busy, reconnectDeferred, syncNow]);
  // Retry only ordinary online failures; never release a manually held offline queue.
  const waitingForNetwork = !cloudMode && !!session?.user?.id && prefs.cloudSyncEnabled !== false
    && syncState.retry === true && !loadOfflineWorkspace(session.user.id)?.requiresManualSync;
  useEffect(() => {
    if(!waitingForNetwork)return undefined;
    const attempt=()=>{if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
      cloudSyncRequestedRef.current=true;refreshCloud(session.user).catch(()=>{});
    };
    const onVisible=()=>{if(document.visibilityState==='visible')attempt();};
    const timer=setInterval(attempt,60000);
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[waitingForNetwork,refreshCloud,session?.user]);
  /*
   * Run a cloud write with a deadline. If the server cannot be reached, switch to this account's device copy and
   * return { offline: true } so the caller saves the same change there (it uploads on reconnect). Server answers
   * (validation, permissions) are rethrown unchanged. New records carry their own UUID, so a write that timed out
   * but still reached the cloud is matched on reconnect instead of duplicated.
   */
  const cloudWrite = useCallback(async (run) => {
    try { return { value: await withTimeout(run(), CLOUD_WRITE_TIMEOUT_MS) }; }
    catch (cause) {
      if (isNetworkFailure(cause) && switchToDeviceCopy()) return { offline: true };
      throw cause;
    }
  },[switchToDeviceCopy]);
  /*
   * Online saves, local first (owner, 2026-11-12): input → this device → dashboard → silent cloud sync. `start` gets
   * an onLocal callback; this resolves as soon as the change is committed on this device, with { local, upload },
   * while the cloud upload (`upload`, a cloudWrite result) carries on in the background. Mistakes caught before the
   * device commit (validation, sign-in) still reject here, so the form can show them. A write with no device step
   * resolves with cloudWrite's own result, exactly as before.
   */
  const uploadsInFlightRef = useRef(0);
  const localFirstWrite = useCallback((start) => new Promise((resolve, reject) => {
    const holder = { settled: false, upload: null };
    holder.upload = cloudWrite(() => start(record => {
      if (holder.settled) return;
      holder.settled = true;
      uploadsInFlightRef.current += 1;
      const upload = Promise.resolve().then(() => holder.upload).finally(() => { uploadsInFlightRef.current -= 1; });
      resolve({ local: record, upload });
    }));
    holder.upload.then(result => { if (!holder.settled) { holder.settled = true; resolve(result); } },
      error => { if (!holder.settled) { holder.settled = true; reject(error); } });
  }), [cloudWrite]);
  /*
   * Local-first create for the quick inputs (NasrinAI chat logging, card purchases, card payments). Resolves with
   * { row } to show now, or { offline: true } when the cloud could not be reached (the caller then saves on the device
   * copy as before). The upload finishes silently: a confirmed save swaps in the server copy, a dropped connection
   * keeps the record on this device for the next sync, and a refusal removes it from the screen and says why.
   */
  const createLocalFirst = useCallback(async (payload) => {
    const ownerId = session.user.id;
    const written = await localFirstWrite(onLocal => createTransaction(payload, ownerId, { onLocal }));
    if (written.offline) return { offline: true };
    if (!written.local) return { row: written.value };
    const row = { ...written.local, created_at: written.local.created_at || new Date().toISOString() };
    written.upload.then(async (result) => {
      if (result?.offline) { await persistHybridLocalRows(ownerId, 'transactions', [row]).catch(() => {}); return; }
      if (result?.value) setRawTxs(cur => cur.map(x => x.id === row.id ? result.value : x));
    }, (cause) => {
      setRawTxs(cur => cur.filter(x => x.id !== row.id));
      notify(tr('This change could not be saved to your MOVO account: {reason}', { reason: cause?.message || tr('Please try again.') }));
    });
    return { row };
  }, [localFirstWrite, session, notify]);
  /*
   * While online, keep this account's device copy matched to the cloud after each change, from a fresh owner-checked
   * cloud read (never from what is on screen), so a dropped connection continues from current records.
   */
  useEffect(() => {
    const ownerId=session?.user?.id;
    if(!cloudMode||!ownerId||busy)return undefined;
    const stored=loadOfflineWorkspace(ownerId);
    if(!stored||stored.dirty||matchesConfirmedOfflineHandoff(ownerId,stored,{financial_accounts:cloudAccounts,transactions:rawTxs}))return undefined;
    const epoch=cloudLoadEpochRef.current;
    let live=true;
    const timer=setTimeout(async()=>{
      // Never refresh the device copy while a local-first save is still uploading (its record is not in the cloud yet).
      if(syncActiveRef.current||uploadsInFlightRef.current>0)return;
      try{
        const fresh=await withTimeout(fetchOfflineSyncCloud(ownerId),CLOUD_READ_TIMEOUT_MS);
        const latest=loadOfflineWorkspace(ownerId);
        if(!live||syncActiveRef.current||uploadsInFlightRef.current>0||epoch!==cloudLoadEpochRef.current||cloudAuthUserRef.current!==ownerId||!latest)return;
        if(!cleanCopyCheck(ownerId,latest,fresh).ok)return;
        const shared={...latest.working,...fresh};
        saveOfflineWorkspace(ownerId,{...latest,baseline:shared,working:shared,dirty:false,
          lastConfirmedAt:new Date().toISOString(),pendingDeletions:{},deletedRows:{}});
      }catch{ /* offline or slow: the next change, or the hand-off itself, handles it */ }
    },2500);
    return ()=>{live=false;clearTimeout(timer);};
  },[cloudMode,cloudAccounts,rawTxs,session?.user?.id,busy]);

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

  /* iOS app: the native Liquid Glass top bar and dock mirror the web header and dock (no-op on the web). */
  useEffect(() => startNativeChrome(), []);

  /* iOS app: movo://auth-callback finishes Google/Apple sign-in (the auth listener below picks up the session);
     movo://log links become the same #/log links the web app already handles. No-op on the web. */
  useEffect(() => listenForAppUrls({
    onAuth: ({ code, error: failure }) => {
      if (failure || !code) { setView('Sign in'); setError(tr('Sign-in could not be completed. Please try again.')); return; }
      finishOAuth(code).catch(() => { setView('Sign in'); setError(tr('Sign-in could not be completed. Please try again.')); });
    },
  }), []);

  useEffect(() => {
    let mounted = true;
    if (!supabaseConfigured || !supabase) { setAuthReady(true); return undefined; }
    const applySession = async (nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      // Signing out invalidates any cloud load still in flight (#245).
      if (!nextSession?.user) ++cloudLoadEpochRef.current;
      const nextUserId = nextSession?.user?.id || null;
      // Supabase can emit SIGNED_IN repeatedly (including on tab focus). Refresh
      // finance records only when the authenticated identity actually changes.
      if (cloudAuthUserRef.current === nextUserId) {
        if (!nextUserId) setAuthReady(true);
        return;
      }
      cloudAuthUserRef.current = nextUserId;
      if(nextUserId){
        setView(current => current === 'Sign in' ? 'Home' : current);
        setAuthReady(false);setCloudMode(false);setOfflineOwnerId(null);
        setCloudAccounts([]);setLocalAccounts([]);setRawTxs([]);
        setCloudPostings([]);setCloudActivities([]);
        try { await recoverHybridWorkspace(nextUserId); }
        catch(cause){
          if(mounted&&cloudAuthUserRef.current===nextUserId){setError(cause.message);setLocalPersistenceWarning(true);setAuthReady(true);}
          return;
        }
        if(!mounted||cloudAuthUserRef.current!==nextUserId)return;
      }
      if (nextSession?.user && prefsRef.current.cloudSyncEnabled !== false) {
        // Opening MOVO syncs first (owner, 2026-11-11): this identity's device snapshot is loaded underneath, but the
        // first screen waits for the cloud check so it shows the latest records. It waits at most
        // LAUNCH_SYNC_WAIT_MS; with no connection at all the saved copy shows at once. refreshCloud releases the
        // launch screen when it finishes. Never grant cloud privileges from the device cache.
        const cache = loadOfflineWorkspace(nextSession.user.id);
        if (cache && (cache.lastConfirmedAt || cache.dirty)) {
          if (loadOwnedLocal(nextSession.user.id)) {
            const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
            if (offline) setAuthReady(true);
            else { clearTimeout(launchWaitRef.current); launchWaitRef.current = setTimeout(() => { if (mounted) setAuthReady(true); }, LAUNCH_SYNC_WAIT_MS); }
          } else setLocalPersistenceWarning(true);
        }
        refreshCloud(nextSession.user);
      } else if (nextSession?.user) {
        // Local mode for a signed-in owner: that owner's own device workspace (#246), never guest records.
        setCloudMode(false);
        if (!loadOwnedLocal(nextSession.user.id)) setLocalPersistenceWarning(true);
        setAuthReady(true);
      } else {
        const pending = pendingLocalDataRef.current;
        setCloudMode(false);
        setCloudAccounts([]); setInbox([]); setCloudBills([]); setCloudBillOccurrences([]); setCloudBudgets([]);
        setCloudPostings([]);
        setCloudActivities([]);
        setOfflineOwnerId(null);
        setRawTxs(!pending?.ownerId&&pending?.transactions ? pending.transactions:loadLocalTransactions());
        setLocalAccounts(!pending?.ownerId&&pending?.accounts ? pending.accounts:loadLocalAccounts());
        pendingLocalDataRef.current=null;
        setAuthReady(true);
      }
    };
    getCurrentSession().then(applySession).catch(() => { if (mounted) setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // No Supabase query or other awaited operation inside this callback.
      window.setTimeout(()=>applySession(nextSession).catch(()=>{if(mounted)setAuthReady(true);}),0);
    });
    return () => { mounted = false; clearTimeout(launchWaitRef.current); data?.subscription?.unsubscribe(); };
  }, [refreshCloud,loadOwnedLocal]);

  /* ---------- derived data ---------- */
  const baseAccounts = cloudMode ? cloudAccounts : localAccounts;
  const base = /^[A-Z]{3}$/.test(prefs.currency || '') ? prefs.currency : 'PHP';
  const rates = fx.rates;
  const toBase = useCallback((value, from) => convert(value, from || 'PHP', base, rates), [base, rates]);
  const useOwnerAccounting=cloudMode||Boolean(session?.user?.id&&offlineOwnerId===session.user.id);
  const visiblePostings=useMemo(()=>{
    if(!useOwnerAccounting)return [];
    const deleted=new Set(loadOfflineWorkspace(session?.user?.id)?.pendingDeletions?.transactions||[]);
    return cloudPostings.filter(row=>!row.transaction_id||!deleted.has(row.transaction_id));
  },[useOwnerAccounting,cloudPostings,session?.user?.id,rawTxs]);
  const txs = useMemo(() => {
    const accountsById = new Map(baseAccounts.map(a => [a.id, a]));
    const regular = rawTxs.map(t => normalize(t, accountsById, base, rates));
    const accounting = (useOwnerAccounting ? cloudActivities : []).map(t => ({
      ...t,
      id: t.transaction_type === 'allocation' ? `allocation-${t.id}` : t.id,
      type: t.transaction_type === 'allocation' ? 'allocation' : 'expense',
      date: t.occurred_at, origAmount: Number(t.amount), origCurrency: t.currency || base,
      currency: base, amount: convert(Number(t.amount), t.currency || base, base, rates),
      accountName: t.source_account_id ? (accountsById.get(t.source_account_id)?.name || tr('Account')) : tr('Accounting event'),
    }));
    return [...regular, ...accounting].filter(t => Number.isFinite(new Date(t.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [rawTxs, useOwnerAccounting, cloudActivities, baseAccounts, base, rates]);
  const accountsView = useMemo(() => {
    const ledger = [...txs, ...visiblePostings];
    const links = prefs.cardBankLinks || {};
    const cardKindOf = (account) => prefs.accountStyles?.[account.id]?.cardKind || account.cardKind || 'debit';
    const indexed = buildIndexedBalances(baseAccounts, ledger, links, prefs.accountStyles,
      (amount, from, to) => convert(amount, from || 'PHP', to || 'PHP', rates), cloudMode);
    const byAccountId = new Map(baseAccounts.map(account => [account.id, account]));
    return baseAccounts.map(a => {
      const st = prefs.accountStyles?.[a.id] || {};
      const currency = a.currency || 'PHP';
      const linkedBankId = a.account_type === 'card' && cardKindOf(a) === 'debit' ? links[a.id] || '' : '';
      const linkedBank = linkedBankId ? (byAccountId.get(linkedBankId)?.account_type === 'bank' ? byAccountId.get(linkedBankId) : null) : null;
      const ledgerBalances = indexed.get(linkedBank?.id || a.id) || { settled: NaN, available: NaN };
      const ledgerBalance = ledgerBalances.settled;
      const adjusted = applyCardPayments({ ...a, cardKind: st.cardKind || a.cardKind, balance: ledgerBalance }, prefs.creditCardPayments?.[a.id] || []);
      const balance = adjusted.balance;
      return { ...a, chip: st.chip || a.chip, contactless: st.contactless ?? a.contactless ?? (a.account_type === 'card'), cardKind: st.cardKind || a.cardKind, cardNetwork: st.cardNetwork || a.cardNetwork || '', creditLimit: Number(st.creditLimit) || 0, issuerBankId: st.issuerBankId || '', mask: a.mask || st.mask || '', brand: a.brand || 'blue', balance, available_balance: ledgerBalances.available, recordedPaymentsApplied: adjusted.recordedPaymentsApplied, currency: linkedBank ? (linkedBank.currency || currency) : currency, linkedAccountId: linkedBank ? linkedBank.id : '' };
    });
  }, [baseAccounts, txs, cloudMode, visiblePostings, prefs.accountStyles, prefs.cardBankLinks, prefs.creditCardPayments, rates]);
  // Pure derived ledger display: does not write or modify any transaction rows.
  const transactionBalances = useMemo(() => buildTransactionRunningBalances({
    transactions: txs, postings: visiblePostings, accounts: baseAccounts,
    cardBankLinks: prefs.cardBankLinks || {}, accountStyles: prefs.accountStyles || {},
    creditCardPayments: prefs.creditCardPayments || {},
    convertAmount: (amount, from, to) => convert(amount, from, to, rates),
  }), [txs, visiblePostings, baseAccounts, prefs.cardBankLinks, prefs.accountStyles, prefs.creditCardPayments, rates]);
  const accountsByType = useMemo(() => ({ card: accountsView.filter(a => a.account_type === 'card'), bank: accountsView.filter(a => a.account_type === 'bank'), e_wallet: accountsView.filter(a => a.account_type === 'e_wallet') }), [accountsView]);
  const refDate = useMemo(() => (cloudMode || !txs.length ? new Date() : new Date(txs[0].date)), [cloudMode, txs]);
  const refMonth = monthKey(refDate);
  const activeMonth = month || refMonth;
  const months = useMemo(() => Array.from(new Set([refMonth, ...txs.map(t => monthKey(t.date))])).sort().reverse(), [txs, refMonth]);

  const statsFor = useCallback((key) => {
    const list = key === 'all' ? txs : txs.filter(t => monthKey(t.date) === key);
    const sum = (type) => list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
    const [y, m] = key === 'all' ? [new Date().getFullYear(), new Date().getMonth() + 1] : key.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const buckets = Array(12).fill(0);
    if (key === 'all') {
      const [ry, rm] = monthKey(new Date()).split('-').map(Number);
      list.filter(t => t.type === 'expense').forEach(t => {
        const [ty, tm] = monthKey(t.date).split('-').map(Number);
        const offset = (ry - ty) * 12 + rm - tm;
        if (offset >= 0 && offset < 12) buckets[11 - offset] += t.amount;
      });
    } else {
      list.filter(t => t.type === 'expense').forEach(t => { const d = Number(dayKey(t.date).slice(8, 10)); buckets[Math.min(11, Math.floor(((d - 1) / days) * 12))] += t.amount; });
    }
    const income = sum('income'); const expenses = sum('expense');
    return { income, expenses, transfers: sum('transfer'), transferCount: list.filter(t => t.type === 'transfer').length, incomeCount: list.filter(t => t.type === 'income').length, net: income - expenses, days, bars: buckets, count: list.length, list };
  }, [txs]);
  const breakdownFor = useCallback((key) => {
    const totals = {}; statsFor(key).list.filter(t => t.type === 'expense').forEach(t => { const b = bucketOf(t.category); totals[b] = (totals[b] || 0) + t.amount; });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return { total, data: BUCKETS.filter(b => totals[b.key]).map(b => ({ ...b, amount: totals[b.key], percent: Math.round((totals[b.key] / total) * 100) })) };
  }, [statsFor]);
  const activeHomeMonth = homeMonthKey || monthKey(new Date());
  const homeRefDate = useMemo(() => { const [y, m] = activeHomeMonth.split('-').map(Number); return new Date(y, m, 0, 12); }, [activeHomeMonth]);
  const homeYears = useMemo(() => Array.from(new Set([new Date().getFullYear(), ...txs.map(t => Number(monthKey(t.date).slice(0, 4)))] )).sort((a, b) => b - a), [txs]);
  const homeStats = useMemo(() => statsFor(activeHomeMonth), [statsFor, activeHomeMonth]);
  const monthStats = useMemo(() => statsFor(activeMonth), [statsFor, activeMonth]);
  // Total balance (lib/totalBalance.js): open accounts, linked debit cards once, card payments that moved no money
  // left out, unconvertible accounts listed instead of breaking the total.
  const balanceTotals = useMemo(() => totalBalance(accountsView, toBase, prefs.creditCardPayments || {}), [accountsView, toBase, prefs.creditCardPayments]);
  // Home's month filter sits on the balance card: a past month shows the total at the end of that month.
  const homeMonthEnd = `${activeHomeMonth}-${String(new Date(Number(activeHomeMonth.slice(0, 4)), Number(activeHomeMonth.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
  const homeIsPast = homeMonthEnd < dayKey(new Date());
  const stats = useMemo(() => {
    const current = accountsView.length ? balanceTotals.total : txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    const balance = homeIsPast ? balanceAsOf(current, txs, homeMonthEnd) : current;
    // The line runs through the selected month: only income and expenses change the total (transfers and
    // allocations stay inside it).
    let running = balance - homeStats.net; const daily = new Map();
    homeStats.list.slice().reverse().forEach(t => { if (t.type === 'income' || t.type === 'expense') { running += t.type === 'income' ? t.amount : -t.amount; daily.set(dayKey(t.date), running); } });
    let points = [balance - homeStats.net, ...daily.values()];
    for (let pass = 0; pass < 3; pass += 1) points = points.map((v, i) => { const w = points.slice(Math.max(0, i - 1), i + 2); return w.reduce((s, x) => s + x, 0) / w.length; });
    const savings = savingsBalance(accountsView, toBase, prefs.accountStyles);
    return { balance, balanceExcluded: balanceTotals.excluded.length, income: homeStats.income, expenses: homeStats.expenses, savings, netCashFlow: homeStats.net, trend: points.length > 1 ? points : [balance, balance] };
  }, [accountsView, balanceTotals, homeIsPast, homeMonthEnd, txs, homeStats, toBase, prefs.accountStyles]);
  // Savings is an account-balance measure (cash excluded), not monthly net cash flow. Until a historical
  // savings-balance snapshot is available, do not display a misleading cash-flow trend beside that balance.
  // The current month compares like with like (1st–today against the same days last month); a past month
  // compares that whole month with the one before.
  const deltas = useMemo(() => ({ ...monthOverMonth(txs, homeIsPast ? homeRefDate : new Date(), stats.balance, homeIsPast ? homeMonthEnd : undefined), savings: null }), [txs, homeIsPast, homeRefDate, homeMonthEnd, stats.balance]);
  const homeBreakdown = useMemo(() => breakdownFor(activeHomeMonth), [breakdownFor, activeHomeMonth]);
  const txBreakdown = useMemo(() => breakdownFor(activeMonth), [breakdownFor, activeMonth]);
  const monthTxs = useMemo(() => {
    const type = { Income: 'income', Expenses: 'expense', Transfers: 'transfer' }[txFilter];
    const q = search.trim().toLowerCase();
    return monthStats.list.filter(t => (!type || t.type === type) && (!q || [t.merchant, t.category, t.accountName, t.type].join(' ').toLowerCase().includes(q)));
  }, [monthStats, txFilter, search]);
  const recent = useMemo(() => homeStats.list.filter(t => t.type !== 'transfer' || t.transaction_type === 'allocation').slice(0, 4), [homeStats]);
  const budgets = useMemo(() => (cloudMode ? cloudBudgets : (prefs.budgets || [])).map(b => ({ ...b, category: categoryOf(b.category).label, categoryId: categoryId(b.category) || b.category, monthly_limit: toBase(Number(b.monthly_limit), b.currency || 'PHP'), currency: base })), [cloudMode, cloudBudgets, prefs.budgets, toBase, base]);
  const budgetList = useMemo(() => budgetProgress(budgets, homeStats.list), [budgets, homeStats]);
  const spendingLimitList = useMemo(() => spendingLimitProgress((prefs.spendingLimits || []).map(l => ({ ...l, monthly_limit: toBase(Number(l.monthly_limit), l.currency || 'PHP'), currency: base })), homeStats.list, accountsView), [prefs.spendingLimits, homeStats, accountsView, toBase, base]);
  /* ---------- subscriptions (saved on this device) and NasrinAI's daily briefing ---------- */
  const subscriptions = useMemo(() => (Array.isArray(prefs.subscriptions) ? prefs.subscriptions.filter(s => s && typeof s === 'object' && typeof s.name === 'string' && s.id) : []), [prefs.subscriptions]);
  const todayKey = dayKey(new Date());
  const subSummary = useMemo(() => summarizeSubscriptions(subscriptions, new Date(`${todayKey}T12:00:00`), toBase), [subscriptions, toBase, todayKey]);
  const plans = useMemo(() => (prefs.plans || []).map(p => { const currency = p.currency || 'PHP'; const target = p.target ?? p.target_amount ?? p.amount; const saved = p.saved ?? p.saved_amount ?? 0; return { ...p, target: toBase(Number(target) || 0, currency), saved: toBase(Number(saved) || 0, currency), fundingAllocations: (Array.isArray(p.fundingAllocations) ? p.fundingAllocations : []).map(a => ({ ...a, amount: toBase(Number(a.amount) || 0, a.currency || currency), currency: base })), due: p.due || p.due_date || p.target_date || p.date || '', currency: base }; }), [prefs.plans, toBase, base]);
  const briefing = useMemo(() => buildBriefing({ txs, refDate, deltas, budgets: budgetList, plans, subs: subSummary }), [txs, refDate, deltas, budgetList, plans, subSummary]);
  // Keep card selection shared by Wallet card carousel and e-wallet display cards.
  const walletCards = [...accountsByType.card, ...accountsByType.e_wallet].filter(a => !a.is_archived);
  const selectedCard = walletCards.find(a => a.id === selectedCardId) || walletCards[0];

  const deviceId = useMemo(() => { try { let id = localStorage.getItem('movo.device.v1'); if (!id) { id = window.crypto?.randomUUID?.() || String(Date.now()); localStorage.setItem('movo.device.v1', id); } return id; } catch { return 'this-device'; } }, []);
  const systemNotices = useMemo(() => buildSystemNotices({ txs, now: new Date(`${todayKey}T12:00:00`), subs: subSummary, budgets: budgetList, spendingLimits: spendingLimitList, bills: cloudBills, billOccurrences: cloudBillOccurrences, tips: can('insights') ? briefing.tips : [], devices: prefs.devices, deviceId, fmt: (v, cur) => money(v, cur) }), [txs, todayKey, subSummary, budgetList, spendingLimitList, cloudBills, cloudBillOccurrences, briefing.tips, prefs.devices, deviceId, plan]);
  const allNotifications = useMemo(() => buildNotifications(txs, systemNotices.filter(n => can('insights') || !['catReports','catAi'].includes(n.cat))), [txs, systemNotices]);
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
  useEffect(() => {
    if (view !== 'Notifications') return;
    // Mark everything currently visible as seen, even if a notification's
    // timestamp is slightly ahead of the device clock.
    const latestVisibleAt = notifications.reduce((latest, n) => Math.max(latest, Date.parse(n.at) || 0), Date.now());
    setPref('notifSeenAt', new Date(latestVisibleAt).toISOString());
  }, [view, notifications.length, setPref]);
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
  const [planTab, setPlanTab] = useState('overview');
  // Device Back (lib/backNavigation.js): the screens visited, and a flag while Back itself is moving between them.
  const screenTrailRef = useRef(null);
  if (!screenTrailRef.current) screenTrailRef.current = createScreenTrail();
  const backMoveRef = useRef(false);
  /* iPhone edge swipe: a snapshot of each page as it is left, shown blurred under the swipe back to it. */
  const edgeSwipeOnRef = useRef(false);
  const pageSnapsRef = useRef(new Map());
  const swipeBackRef = useRef(false);
  // Back shows the previous page at once, where it was left (owner, 2026-11-12).
  const scrollMemoRef = useRef(new Map());
  const backPaintRef = useRef(null);
  /*
   * Setup gate (owner, 2026-11-11): until the video guide, the walkthrough, signing in (or choosing this device only)
   * and accepting the Terms and Privacy Policy are done, only those steps show. The dashboard stays hidden and the
   * navigation is locked. Tests skip it like the first-run tour unless they set window.__MOVO_SETUP_GATE__.
   */
  const setupGateOn = process.env.NODE_ENV !== 'test' || (typeof window !== 'undefined' && window.__MOVO_SETUP_GATE__ === true);
  const legalAccepted = hasAcceptedLegal(prefs);
  const setupDone = !setupGateOn || (!!prefs.onboarded && legalAccepted);
  const setupDoneRef = useRef(setupDone);
  // Counts the days MOVO is used (device only) for the Rate MOVO timing.
  useEffect(() => { if (setupDone) writeReviewState(noteActiveDay(readReviewState(), todayKey)); }, [setupDone, todayKey]);
  setupDoneRef.current = setupDone;
  const go = useCallback((next, params = {}) => {
    if (!setupDoneRef.current && !SETUP_SCREENS.has(next)) return;
    if (params.filter) setTxFilter(params.filter);
    if (next === 'FinancialPlanning') setPlanTab(params.tab || 'overview');
    const prev = viewRef.current; const dPrev = DEPTH[prev] ?? 0; const dNext = DEPTH[next] ?? 0;
    // A return to the page below (device Back, swipe, or an on-screen back arrow to the previous page).
    const isBack = prev !== next && (backMoveRef.current || swipeBackRef.current || screenTrailRef.current.peek() === next);
    if (prev !== next) {
      const memo = scrollMemoRef.current; memo.delete(prev); memo.set(prev, window.scrollY || 0);
      while (memo.size > 20) memo.delete(memo.keys().next().value);
    }
    setMotion(dNext > dPrev ? 'push' : dNext < dPrev ? 'pop' : (ORDER[next] ?? 0) > (ORDER[prev] ?? 0) ? 'tab-right' : (ORDER[next] ?? 0) < (ORDER[prev] ?? 0) ? 'tab-left' : 'fade');
    if (!backMoveRef.current) screenTrailRef.current.visit(prev, next);
    if (edgeSwipeOnRef.current && prev !== next && typeof document !== 'undefined') {
      const snaps = pageSnapsRef.current; const main = document.querySelector('main.screen');
      if (main) {
        snaps.delete(prev);
        snaps.set(prev, { node: main.cloneNode(true), className: main.className.replace(/\benter-\S+/g, '').trim(), scroll: window.scrollY || 0 });
        while (snaps.size > 6) snaps.delete(snaps.keys().next().value);
      }
    }
    if (isBack) {
      // No entrance motion, amounts at their value, and the scroll where the page was left (applied before paint).
      setMotion('back'); showInstantly(500);
      backPaintRef.current = { scroll: scrollMemoRef.current.get(next) || 0 };
    } else backPaintRef.current = null;
    viewRef.current = next;
    setSheet(null); setError(''); setView(next);
    if (next !== 'Settings') setQuery('');
    try { window.scrollTo?.(0, 0); } catch { /* jsdom */ }
  }, []);
  // An on-screen back arrow that returns to the screen the person came from (e.g. Profile opened from Settings goes back
  // to Settings), or to `fallback` when there is no earlier screen. go() treats the trail's top as a return.
  const goBack = useCallback((fallback) => go(screenTrailRef.current.peek() || fallback), [go]);
  /*
   * The device's own Back (Android button or gesture, browser Back) closes the open sheet first, then returns to the
   * previous screen, then to Home; from Home with nothing open it leaves the app as usual.
   */
  const sheetOpenRef = useRef(false);
  sheetOpenRef.current = !!sheet;
  const deviceBack = useCallback(() => {
    // Any open sheet first (each one registers itself, wherever its state lives), then App-level ones.
    if (closeTopBackLayer()) return true;
    if (sheetOpenRef.current) { setSheet(null); return true; }
    const current = viewRef.current;
    const previous = screenTrailRef.current.back() || (current !== 'Home' ? 'Home' : '');
    if (!previous || previous === current) return false;
    backMoveRef.current = true;
    try { go(previous); } finally { backMoveRef.current = false; }
    return true;
  }, [go]);
  /*
   * After Back, before the page is painted: finish every one-off entrance animation inside it (looping ones keep
   * running) and put the scroll back where the page was left. Content that mounts a frame later is caught once more.
   */
  useLayoutEffect(() => {
    const back = backPaintRef.current; if (!back) return undefined;
    backPaintRef.current = null;
    const settle = () => {
      const main = document.querySelector('main.screen');
      try {
        main?.getAnimations?.({ subtree: true }).forEach(a => {
          const timing = a.effect?.getTiming?.();
          if (timing && timing.iterations !== Infinity && a.playState !== 'finished') a.finish();
        });
      } catch { /* older engines: the short entrance plays */ }
      if (back.scroll && Math.abs((window.scrollY || 0) - back.scroll) > 2) { try { window.scrollTo(0, back.scroll); } catch { /* jsdom */ } }
    };
    settle();
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(settle) : null;
    return () => { if (raf !== null) cancelAnimationFrame(raf); };
  }, [view]);
  useEffect(() => listenForDeviceBack(deviceBack), [deviceBack]);
  // Android: the system back gesture and button come straight to deviceBack (lib/native.js).
  useEffect(() => listenForAndroidBack(deviceBack), [deviceBack]);
  /* iPhone app: swipe in from the left (or right) edge to go back, the screen following the finger
     (lib/edgeSwipeBack.js). Browsers and Android have their own gesture, which arrives as Back above. */
  useEffect(() => {
    if (nativePlatform() !== 'ios' && !(typeof window !== 'undefined' && window.__MOVO_EDGE_SWIPE__ === true)) return undefined;
    edgeSwipeOnRef.current = true;
    const backTarget = () => screenTrailRef.current.peek() || (viewRef.current !== 'Home' ? 'Home' : '');
    const stop = startEdgeSwipeBack({
      onBack: () => {
        swipeBackRef.current = true;
        try { return deviceBack(); } finally { swipeBackRef.current = false; }
      },
      canGoBack: () => hasBackLayer() || sheetOpenRef.current || viewRef.current !== 'Home',
      surface: () => (hasBackLayer() || sheetOpenRef.current || document.querySelector('[aria-modal="true"]') ? null : document.querySelector('main.screen')),
      preview: () => pageSnapsRef.current.get(backTarget()) || null,
      animate: canAnimate(),
    });
    return () => { edgeSwipeOnRef.current = false; pageSnapsRef.current.clear(); stop(); };
  }, [deviceBack]);
  const openLegal = useCallback((next) => {
    if (!['TermsOfService', 'PrivacyPolicy'].includes(view)) setLegalReturnView(view);
    go(next);
  }, [view, go]);
  const openNotification = (n) => { setActiveNotificationId(n.id); setPref('readIds', Array.from(new Set([...prefs.readIds, n.id]))); go('NotificationDetail'); };
  const openTx = (t) => setSheet({ name: 'tx', id: t.id });
  const openForm = (type = 'expense', accountId = '') => { setError(''); setForm(f => ({ ...f, transaction_type: type, account_id: accountId || f.account_id, occurred_at: today(), time: '', source: '', ref: '', payment_reference: '', receipt_note: '', receipt_path: '', receipt_path_to_delete: '', receipt_file: null })); setSheet({ name: 'transaction', type }); };
  const openGrocery = () => { setError(''); setSheet({ name: 'grocery' }); };
  const saveGroceryDraft = (draft) => { setPref('groceryDraft', draft); notify(tr('Grocery list saved as draft.')); };
  const logGroceryExpense = ({ merchant, amount, accountId, note }) => { setForm(f => ({ ...f, merchant, amount:String(amount), transaction_type:'expense', category:'food:groceries', account_id:accountId, occurred_at:today(), time:'', note, source:'', ref:'', payment_reference:'', receipt_note:'', receipt_path:'', receipt_path_to_delete:'', receipt_file:null })); setPref('groceryDraft', null); setSheet({ name:'transaction', type:'expense' }); };
  /* "Add amount" on a card or account: a transfer into it from another account, or a manual top-up (income). */
  const openTransferTo = (accountId) => { setError(''); setForm(f => ({ ...f, transaction_type: 'transfer', account_id: '', transfer_to_account_id: accountId, occurred_at: today(), time: '', payment_reference:'', receipt_note:'', receipt_path:'', receipt_path_to_delete:'', receipt_file:null })); setSheet({ name: 'transaction', type: 'transfer' }); };
  const openEditAccount = (account) => {
    setError('');
    setAccountForm({
      name: account.name || '', account_type: account.account_type || 'other',
      institution_name: account.institution_name || '', opening_balance: String(account.opening_balance ?? account.balance ?? 0),
      currency: account.currency || 'PHP', mask: prefs.accountStyles?.[account.id]?.mask || account.mask || '', color: prefs.accountStyles?.[account.id]?.color || '', icon: prefs.accountStyles?.[account.id]?.icon || '',
      chip: prefs.accountStyles?.[account.id]?.chip || 'gold', contactless: prefs.accountStyles?.[account.id]?.contactless ?? true, cardKind: prefs.accountStyles?.[account.id]?.cardKind || 'debit', cardNetwork: prefs.accountStyles?.[account.id]?.cardNetwork || account.cardNetwork || '',
      qrCode: prefs.accountQrCodes?.[account.id] || '',
      linkedBankId: prefs.accountStyles?.[account.id]?.cardKind === 'credit' ? (prefs.accountStyles?.[account.id]?.issuerBankId || '') : (prefs.cardBankLinks?.[account.id] || ''),
      creditLimit: prefs.accountStyles?.[account.id]?.creditLimit ? String(prefs.accountStyles[account.id].creditLimit) : '',
      owedNow: Number(account.opening_balance) < 0 ? String(-Number(account.opening_balance)) : '',
    });
    setSheet({ name: 'account', type: account.account_type, id: account.id });
  };
  const openEditTransaction = (t) => {
    setError('');
    setForm({
      merchant: t.merchant || '', amount: String(t.origAmount ?? t.amount ?? ''), transaction_type: t.type || t.transaction_type || 'expense',
      category: t.categoryId || t.category || 'other', account_id: t.account_id || '', transfer_to_account_id: t.transfer_to_account_id || '',
      occurred_at: new Date(t.date || t.occurred_at).toLocaleDateString('en-CA'), time: new Date(t.date || t.occurred_at).toTimeString().slice(0, 8), note: t.note || '', payment_reference: t.payment_reference || '', receipt_note: t.receipt_note || '', receipt_path: t.receipt_path || '', receipt_path_to_delete: '', receipt_file: null,
    });
    setSheet({ name: 'transaction', id: t.id });
  };

  const saveTransaction = async (e) => {
    e.preventDefault(); setError('');
    if (cloudMode && !can('cloudWrite')) { setError('Cloud records are read-only. Use local mode or upgrade to Pro.'); return; }
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
    const dup = editingId ? null : findDuplicate({ merchant: form.merchant, amount, type, date: occurred_at, account_id: form.account_id, ref: form.ref || '' }, rawTxs);
    const sig = `${type}|${amount}|${form.merchant.trim().toLowerCase()}|${form.occurred_at}|${form.account_id}`;
    if (dup && dupAck.current !== sig) { dupAck.current = sig; setError(`${dupText(dup)} ${tr('Save again to log it anyway.')}`); return; }
    dupAck.current = '';
    setBusy(true);
    let uploadedReceiptPath = '';
    const oldReceiptPath = form.receipt_path_to_delete || (form.receipt_file ? form.receipt_path : '');
    // Offline-first: `online` turns false when the cloud cannot be reached; the same change is then saved on this
    // account's device copy and uploads automatically on reconnect.
    let online = cloudMode;
    // A new record gets its UUID here, so the cloud save and any device fallback describe the same record.
    const newId = editingId ? null : newRecordId();
    try {
      let receiptPath = form.receipt_path || null;
      if (form.receipt_file) {
        const file = form.receipt_file;
        if (file.size > 10 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) throw new Error(tr('Use a JPG, PNG, WebP or PDF receipt smaller than 10 MB.'));
        if (online) {
          if (!can('cloudWrite')) throw new Error('Cloud records are read-only. Use local mode to attach a receipt.');
          const extension = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'})[file.type];
          const path = `${session.user.id}/${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}.${extension}`;
          const upload = await cloudWrite(() => supabase.storage.from('movo-receipts').upload(path,file,{contentType:file.type,upsert:false}).then(result => { if (result.error) throw result.error; return result; }));
          if (upload.offline) online = false; else { uploadedReceiptPath = path; receiptPath = path; }
        }
        if (!online) receiptPath = await putLocalAttachment(file);
      }
      const paidSub = !editingId && type === 'expense' && form.subscriptionPaymentId
        ? subscriptions.find(item => item.id === form.subscriptionPaymentId) : null;
      let subscriptionNextDue = '';
      if (paidSub && paidSub.status !== 'cancelled' && paidSub.status !== 'paused') {
        subscriptionNextDue = billingDate(paidSub.start, paidSub.cycle, 1);
        const paidOn = String(occurred_at || today()).slice(0, 10);
        let advanceGuard = 0;
        while (subscriptionNextDue && subscriptionNextDue <= paidOn && advanceGuard < 400) {
          subscriptionNextDue = billingDate(subscriptionNextDue, paidSub.cycle, 1);
          advanceGuard += 1;
        }
      }
      const subscriptionReference = paidSub && subscriptionNextDue
        ? `movo-subscription:${paidSub.id}:${paidSub.start}:${subscriptionNextDue}` : undefined;
      const subscriptionPaymentState = paidSub && subscriptionNextDue ? {
        previous: {
          start: paidSub.start,
          lastPaidAt: paidSub.lastPaidAt ?? null,
          lastPaidAmount: paidSub.lastPaidAmount ?? null,
          lastPaidCurrency: paidSub.lastPaidCurrency ?? null,
        },
        next: {
          start: subscriptionNextDue,
          lastPaidAt: occurred_at,
          lastPaidAmount: Number(paidSub.amount) || amount,
          lastPaidCurrency: paidSub.currency || txCurrency,
        },
      } : null;
      let savedTransaction = null;
      // Resolves true once a local-first save is confirmed by the cloud (false when it stayed on this device).
      let backgroundUpload = null;
      if (online) {
        const auto = !editingId && AUTOMATION_SOURCES.includes(form.source) ? { source: form.source, external_reference: form.ref || undefined } : {};
        const payload = { id: newId || undefined, merchant: form.merchant.trim(), amount, currency: txCurrency, transaction_type: type, category, account_id: form.account_id, transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note, payment_reference: form.payment_reference, receipt_note: form.receipt_note, receipt_path: receiptPath, external_reference: subscriptionReference };
        // Local first (owner, 2026-11-12): the change is committed on this device and shown at once; the cloud upload
        // finishes silently. A subscription payment also records the payment attempt, which needs the cloud row
        // first, so it keeps waiting for the cloud as before.
        const write = (onLocal) => editingId ? updateTransaction(editingId, payload, { onLocal }) : auto.source ? createAutomated({ ...payload, ...auto }) : createTransaction(payload, session.user.id, { onLocal });
        const before = editingId ? rawTxs.find(x => x.id === editingId) : null;
        const written = paidSub ? await cloudWrite(() => write()) : await localFirstWrite(write);
        if (written.offline) online = false;
        else {
          const row = written.local
            ? { ...(before || {}), ...written.local, ...(editingId ? {} : { created_at: written.local.created_at || new Date().toISOString() }) }
            : written.value;
          const transactionRow = subscriptionPaymentState ? { ...row, subscription_payment_state: subscriptionPaymentState } : row;
          savedTransaction = transactionRow;
          if (!editingId) markFresh(row.id);
          setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? transactionRow : x) : [transactionRow, ...cur]);
          notify(written.local ? (editingId ? tr('Transaction updated.') : tr('Transaction saved.'))
            : editingId ? 'Transaction updated in your MOVO account.' : 'Transaction saved to your MOVO account.');
          if (!editingId) { celebrate(); maybeAskForReview(rawTxs.length + 1); }
          if (written.local) {
            const recordId = transactionRow.id;
            const ownerId = session.user.id;
            backgroundUpload = written.upload.then(async (result) => {
              if (result?.offline) {
                // The connection dropped mid-upload: the change stays on this device and syncs when back online.
                await persistHybridLocalRows(ownerId, 'transactions', [transactionRow]).catch(() => {});
                return false;
              }
              const server = result?.value;
              if (server) setRawTxs(cur => cur.map(x => x.id === recordId ? (subscriptionPaymentState ? { ...server, subscription_payment_state: subscriptionPaymentState } : server) : x));
              return true;
            }, (cause) => {
              // The server refused the change (permission or a rule the form cannot check): undo it on screen.
              setRawTxs(cur => editingId ? cur.map(x => x.id === recordId ? (before || x) : x) : cur.filter(x => x.id !== recordId));
              notify(tr('This change could not be saved to your MOVO account: {reason}', { reason: cause?.message || tr('Please try again.') }));
              if (uploadedReceiptPath && supabase) supabase.storage.from('movo-receipts').remove([uploadedReceiptPath]).catch(() => {});
              return false;
            });
          }
        }
      }
      if (!online) {
        // An edit keeps the record's own fields (source, import reference, schedule, revision) and changes only what
        // the form edits, the same as an edit made online.
        const ownerCopy = session?.user?.id ? loadOfflineWorkspace(session.user.id) : null;
        const existing = editingId ? (cloudMode ? ownerCopy?.working.transactions : rawTxs)?.find(x => x.id === editingId) : null;
        if (editingId && !existing) throw new Error(tr('This record is not on this device yet. Try again when you are back online.'));
        const auto = !editingId && AUTOMATION_SOURCES.includes(form.source);
        const row = { ...(existing || {}), id: editingId || newId, merchant: form.merchant.trim().slice(0, 160), amount: Math.round(amount * 100) / 100, currency: txCurrency, transaction_type: type, category, account_id: form.account_id || 'local', transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note.trim().slice(0, 1000), payment_reference: String(form.payment_reference||'').trim().slice(0,120)||null, receipt_note: String(form.receipt_note||'').trim().slice(0,500)||null, receipt_path: receiptPath, ...(existing ? {} : { external_reference: auto ? (form.ref || undefined) : subscriptionReference, source: auto ? form.source : 'Manual', created_at: new Date().toISOString() }) };
        const transactionRow = subscriptionPaymentState ? { ...row, subscription_payment_state: subscriptionPaymentState } : row;
        if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[transactionRow]);
        savedTransaction = transactionRow;
        if (!editingId) markFresh(row.id);
        setRawTxs(cur => editingId ? cur.map(x => x.id === editingId ? transactionRow : x) : [transactionRow, ...cur]);
        notify(cloudMode ? tr('No connection. Saved on this device; it uploads automatically when you are back online.') : editingId ? 'Transaction updated on this device.' : 'Saved on this device only.');
        if (!editingId) { celebrate(); maybeAskForReview(rawTxs.length + 1); }
      }
      if (paidSub && subscriptionNextDue) {
        if (online && session?.user?.id && savedTransaction?.id) {
          await recordPaymentAttempt(session.user.id, {
            source_type: 'subscription', source_id: String(paidSub.id), due_date: paidSub.start,
            next_due_date: subscriptionNextDue, transaction_id: savedTransaction.id, status: 'paid',
            attempted_at: occurred_at, previous_state: subscriptionPaymentState?.previous,
            amount: Number(paidSub.amount) || amount, currency: paidSub.currency || txCurrency,
            account_id: form.account_id, note: 'Subscription renewal recorded',
          }).catch(() => null);
        }
        setPref('subscriptions', subscriptions.map(item => item.id === paidSub.id
          ? { ...item, ...subscriptionPaymentState.next }
          : item));
        notify(tr('Subscription payment recorded. Next billing date updated.'));
      }
      // After a local-first save these run silently once the cloud has confirmed it; otherwise as before.
      if (!editingId && online && session?.user) {
        const user = session.user;
        if (backgroundUpload) backgroundUpload.then(done => { if (done) refreshCloud(user).catch(() => {}); });
        else await refreshCloud(user);
      }
      if (online && oldReceiptPath && oldReceiptPath !== receiptPath) {
        const removeOld = () => supabase.storage.from('movo-receipts').remove([oldReceiptPath]).catch(() => {});
        if (backgroundUpload) backgroundUpload.then(done => { if (done) removeOld(); });
        else await removeOld();
      }
      setForm({ ...form, merchant: '', amount: '', note: '', time: '', occurred_at: today(), source: '', ref: '', subscriptionPaymentId: '', payment_reference: '', receipt_note: '', receipt_path: '', receipt_path_to_delete: '', receipt_file: null }); setSheet(null);
    } catch (err) {
      if (uploadedReceiptPath && supabase) await supabase.storage.from('movo-receipts').remove([uploadedReceiptPath]).catch(() => {});
      setError(err?.message || (editingId ? 'Could not update this transaction. Check the details and try again.' : 'Could not save this transaction. Check the selected account and try again.'));
    } finally { setBusy(false); }
  };
  const handleCsvFile = (file) => {
    if (!file) return;
    setCsvConfirmAction('');
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

  const discardCsvPreview = () => {
    if (busy || csvConfirmAction !== 'discard') return;
    setCsvRows([]); setCsvErrors([]); setCsvImportSummary('');
    setCsvFileName(''); setImportAccountId(''); setCsvConfirmAction('');
    notify('Uploaded preview discarded. Existing local records were not changed.');
  };
  const confirmCsvImport = async () => {
    if (busy || !csvRows.length || csvConfirmAction !== 'save') return;
    // CSV and backup imports are saved on this device first and never sent to a cloud API directly. With Cloud Sync
    // on, they go into this account's device copy, show on every page at once, and upload through the same verified
    // offline sync as any other device change (now, or when the connection is back).
    const signedOwner=session?.user?.id;
    const viaCloud=cloudMode&&!!signedOwner;
    setBusy(true); setCsvConfirmAction(''); setCsvImportSummary('');
    const created = []; const errors = [...csvErrors];
    const fingerprints = new Set(rawTxs.map(t => transactionFingerprint(t)));
    const ownerSnapshot=signedOwner?loadOfflineWorkspace(signedOwner):null;
    const persistedBefore=signedOwner?ownerSnapshot?.working.transactions:loadLocalTransactions();
    if(signedOwner&&(!ownerSnapshot||(!viaCloud&&offlineOwnerId!==signedOwner)))
      {setBusy(false);setCsvImportSummary('Unable to access the signed-in account’s local workspace. Nothing was imported.');return;}
    try {
      for (let i = 0; i < csvRows.length; i += 1) {
        const row = csvRows[i];
        const matchingSource = findUniqueCsvAccount(formAccounts, row.account_name);
        if (matchingSource.ambiguous) {
          errors.push({ line: i + 2, message: tr('Multiple wallet accounts match “{name}”. Rename them before importing.', { name: row.account_name }) });
          continue;
        }
        // A signed-in account's records always belong to a real wallet account, so they can sync.
        const accountId = matchingSource.account?.id || importAccountId || (formAccounts.length === 0 && !signedOwner ? 'local' : '');
        if (!accountId) { errors.push({ line: i + 2, message: tr('Choose a default account or match the account name for “{merchant}”.', { merchant: row.merchant }) }); continue; }
        const matchingDestination = findUniqueCsvAccount(formAccounts, row.to_account_name);
        if (row.transaction_type === 'transfer' && matchingDestination.ambiguous) {
          errors.push({ line: i + 2, message: tr('Multiple wallet accounts match “{name}”. Rename them before importing.', { name: row.to_account_name }) }); continue;
        }
        const destinationId = row.transaction_type === 'transfer' ? (matchingDestination.account?.id || '') : undefined;
        if (row.transaction_type === 'transfer' && (!destinationId || destinationId === accountId)) {
          errors.push({ line: i + 2, message: tr('Transfer “{merchant}” needs a different destination account that matches the CSV.', { merchant: row.merchant }) }); continue;
        }
        const fingerprint = transactionFingerprint({ ...row, account_id: accountId });
        if (fingerprints.has(fingerprint)) { errors.push({ line: i + 2, message: tr('Possible duplicate skipped: “{merchant}”.', { merchant: row.merchant }) }); continue; }
        const record = {
          id: newRecordId(),
          merchant: row.merchant, amount: row.amount, transaction_type: row.transaction_type, category: row.category,
          account_id: accountId, transfer_to_account_id: destinationId, currency: row.currency,
          occurred_at: row.occurred_at, note: row.note, source: 'CSV Import', external_reference: fingerprint,
          ...(row.payment_reference ? { payment_reference: row.payment_reference } : {}),
        };
        // A row the sync could never upload stays out, so it cannot hold back every later upload.
        const problem = viaCloud ? offlineUploadProblem('transactions', record, signedOwner) : '';
        if (problem) { errors.push({ line: i + 2, message: `${row.merchant}: ${problem}` }); continue; }
        created.push(record);
        fingerprints.add(fingerprint);
      }
      if (created.length) {
        // Prevent another browser tab or interrupted persistence effect from
        // being overwritten by an import based on an outdated local snapshot.
        const currentStored=signedOwner?loadOfflineWorkspace(signedOwner)?.working.transactions:loadLocalTransactions();
        if (JSON.stringify(currentStored) !== JSON.stringify(persistedBefore)
          || (!viaCloud && JSON.stringify(persistedBefore) !== JSON.stringify(rawTxs))) {
          throw new Error('Local financial records changed during import. Reopen the file and review the latest records before saving.');
        }
        // Commit before the React render changes; a failed localStorage write
        // never announces success or alters the visible financial ledger.
        const next=[...created,...(viaCloud?currentStored:rawTxs)];
        if(signedOwner)await persistHybridLocalImport(signedOwner,[],created,viaCloud?'online':'offline');
        const saved=signedOwner
          ? updateOfflineWorking(signedOwner,{...loadOfflineWorkspace(signedOwner).working,transactions:next})
          : saveLocalTransactions(next,false);
        if (!saved) {
          throw new Error('This device could not save the imported records. Free storage and retry; your preview is still available.');
        }
        if (viaCloud) showDeviceCopyAndSync(signedOwner);
        else setRawTxs(cur => [...created, ...cur]);
      }
      setCsvRows([]); setCsvErrors(errors);
      const summary = viaCloud
        ? `Saved ${created.length} transaction(s) on this device. ${errors.length} row(s) skipped or needing review. They upload to your MOVO account automatically.`
        : `Saved ${created.length} transaction(s) locally. ${errors.length} row(s) skipped or needing review. Cloud data was not changed.`;
      setCsvImportSummary(summary);
      notify(summary);
    } catch (cause) {
      setCsvImportSummary(cause?.message || 'Could not save locally. Review your file and retry.');
    } finally { setBusy(false); }
  };

  const saveAccount = async (e) => {
    e.preventDefault(); setError('');
    // Accounts are named after their bank or institution (or their type when there is none); no separate name field.
    const name = (accountForm.institution_name || '').trim() || accountForm.name.trim() || tr((accountTypes.find(type => type.value === accountForm.account_type) || {}).label || 'Account');
    const isCredit = accountForm.account_type === 'card' && accountForm.cardKind === 'credit';
    // A credit card starts at minus what is already owed; its limit is stored with the card, never a bank balance.
    const owedNow = isCredit && String(accountForm.owedNow || '').trim() ? evaluate(String(accountForm.owedNow)) : 0;
    const creditLimit = isCredit ? evaluate(String(accountForm.creditLimit || '')) : 0;
    const openingBalance = accountForm.account_type === 'card' && !isCredit ? 0 : isCredit ? -owedNow : evaluate(String(accountForm.opening_balance || '').replace(/-/g, '−'));
    const currency = /^[A-Z]{3}$/.test(accountForm.currency || '') ? accountForm.currency : base;
    const saveStyle = (id) => { const { color, icon, mask, chip, contactless, cardKind, cardNetwork } = accountForm; setPref('accountStyles', { ...(prefs.accountStyles || {}), [id]: { color, icon, mask, ...(accountForm.account_type === 'card' ? { chip, contactless, cardKind, cardNetwork: cardNetwork && cardNetwork !== 'other' ? cardNetwork : '' } : {}), ...(isCredit ? { creditLimit: Math.round(creditLimit * 100) / 100, issuerBankId: accountForm.linkedBankId || '' } : {}) } }); };
    const saveQrCode = async (id) => {
      const next = { ...(prefs.accountQrCodes || {}) };
      const previous = next[id] || '';
      let value = supportsAccountQr(accountForm.account_type) ? (accountForm.qrCode || '') : '';
      if (value && isAccountQrDataUrl(value)) {
        const qrDataUrl = value;
        const cacheKey = cloudMode && session?.user?.id ? `${session.user.id}:${id}` : `local:${id}`;
        let localCached = false;
        try { await saveLocalAccountQr(cacheKey, qrDataUrl); localCached = true; } catch { /* cloud upload may still succeed; local fallback is best-effort */ }
        if (localCached) setAccountQrDisplay(cur => ({ ...cur, [id]: value }));
        if (cloudMode && session?.user?.id) {
          try {
            const path = await uploadAccountQr(session.user.id, id, qrDataUrl);
            value = path;
            try { const signedUrl = await getAccountQrSignedUrl(session.user.id, path); setAccountQrDisplay(cur => ({ ...cur, [id]: signedUrl })); } catch { setAccountQrDisplay(cur => ({ ...cur, [id]: qrDataUrl })); /* IndexedDB cache remains available offline */ }
          } catch {
            value = previous || (localCached ? `localqr:${cacheKey}` : '');
            if (localCached) {
              setPref('accountQrPending', { ...(prefs.accountQrPending || {}), [id]: true });
              notify(tr('Account QR saved on this device. Cloud sync will retry when available.'));
            } else notify(tr('QR upload failed and offline storage is unavailable. Please retry while connected.'));
          }
          if (value && !isAccountQrDataUrl(value) && !value.startsWith('localqr:')) {
            const pending = { ...(prefs.accountQrPending || {}) }; delete pending[id]; setPref('accountQrPending', pending);
          }
        } else value = localCached ? `localqr:${cacheKey}` : accountForm.qrCode;
      }
      if (value) next[id] = value; else delete next[id];
      setPref('accountQrCodes', next);
      if (!value) {
        const pending = { ...(prefs.accountQrPending || {}) }; delete pending[id]; setPref('accountQrPending', pending);
        if (cloudMode && session?.user?.id) removeLocalAccountQr(`${session.user.id}:${id}`).catch(() => {});
        removeLocalAccountQr(`local:${id}`).catch(() => {});
      }
      if (previous.startsWith('localqr:') && previous !== value) {
        const activeCacheKey = cloudMode && session?.user?.id ? `${session.user.id}:${id}` : `local:${id}`;
        if (previous.slice(8) !== activeCacheKey) removeLocalAccountQr(previous.slice(8)).catch(() => {});
      }
      if (previous && previous !== value && !isAccountQrDataUrl(previous) && cloudMode && session?.user?.id) {
        removeAccountQr(session.user.id, previous).catch(() => { /* private orphan cleanup is retried by account cleanup */ });
      }
      if (isAccountQrDataUrl(value)) setAccountQrDisplay(cur => ({ ...cur, [id]: value }));
      else if (!value) setAccountQrDisplay(cur => { const copy = { ...cur }; delete copy[id]; return copy; });
    };
    if (!name) { setError(tr('Enter an account name.')); return; }
    if (accountForm.mask && !/^\d{4}$/.test(accountForm.mask)) { setError(tr('Enter exactly 4 digits for the last 4 numbers, or leave it empty.')); return; }
    if (isCredit && (!Number.isFinite(creditLimit) || creditLimit <= 0 || creditLimit >= 1e15)) { setError(tr('Enter the card’s credit limit.')); return; }
    if (isCredit && (!Number.isFinite(owedNow) || owedNow < 0)) { setError(tr('Enter what you owe on this card, or leave it empty.')); return; }
    if (!Number.isFinite(openingBalance) || Math.abs(openingBalance) >= 1e17) { setError(tr('Enter a valid opening balance.')); return; }
    if (!accountTypes.some(type => type.value === accountForm.account_type)) { setError(tr('Choose a valid account type.')); return; }
    const editingId = sheet?.name === 'account' ? sheet.id : null;
    const activeBankAccounts = baseAccounts.filter(a => a.account_type === 'bank' && !a.is_archived && a.id !== editingId);
    const linkedBankId = accountForm.account_type === 'card' && accountForm.cardKind !== 'credit' ? accountForm.linkedBankId : '';
    if (accountForm.account_type === 'card' && accountForm.cardKind !== 'credit' && (!linkedBankId || !activeBankAccounts.some(a => a.id === linkedBankId))) { setError(tr('A debit card must be linked to an existing bank account. Add a bank account first, then select it here.')); return; }
    setBusy(true);
    try {
      // Offline-first: when the cloud cannot be reached the account is saved on this account's device copy instead.
      let online = cloudMode && !!session?.user;
      const newId = editingId ? null : newRecordId();
      if (online) {
        const written = await cloudWrite(() => editingId
          ? updateAccount(editingId, { name, account_type: accountForm.account_type, institution_name: accountForm.institution_name, opening_balance: openingBalance })
          : createAccount({ id: newId, name, account_type: accountForm.account_type, institution_name: accountForm.institution_name, currency, opening_balance: openingBalance }, session.user.id));
        if (written.offline) online = false;
        else if (editingId) {
          const a = written.value;
          setCloudAccounts(cur => cur.map(item => item.id === editingId ? a : item)); saveStyle(editingId); if (isAccountQrDataUrl(accountForm.qrCode)) await saveQrCode(editingId); else saveQrCode(editingId);
          const nextLinks = { ...(prefs.cardBankLinks || {}) }; if (linkedBankId) nextLinks[editingId] = linkedBankId; else delete nextLinks[editingId]; setPref('cardBankLinks', nextLinks);
          notify(tr('Account updated in your MOVO account.'));
        } else {
          const a = written.value;
          setCloudAccounts(cur => [...cur, a]); saveStyle(a.id); if (isAccountQrDataUrl(accountForm.qrCode)) await saveQrCode(a.id); else saveQrCode(a.id);
          if (linkedBankId) setPref('cardBankLinks', { ...(prefs.cardBankLinks || {}), [a.id]: linkedBankId });
          notify(tr('Account added to your signed-in MOVO account.'));
        }
      }
      if (!online) {
        const deviceAccounts = cloudMode && session?.user?.id ? loadOfflineWorkspace(session.user.id)?.working.financial_accounts : localAccounts;
        const existing = (deviceAccounts || []).find(a => a.id === editingId);
        if (editingId && !existing) throw new Error(tr('This record is not on this device yet. Try again when you are back online.'));
        const a = {
          ...(existing || {}),
          id: editingId || newId,
          name: name.slice(0, 100),
          account_type: accountForm.account_type || sheet?.type || 'other',
          institution_name: accountForm.institution_name.trim().slice(0, 100),
          currency, opening_balance: Math.round(openingBalance * 100) / 100,
          balance: Math.round(openingBalance * 100) / 100, is_archived: existing?.is_archived || false, mask: accountForm.mask || existing?.mask || '', brand: existing?.brand || 'blue', source: 'Manual',
        };
        if(session?.user?.id) await persistHybridLocalRows(session.user.id,'financial_accounts',[a]);
        saveStyle(a.id); if (isAccountQrDataUrl(accountForm.qrCode)) await saveQrCode(a.id); else saveQrCode(a.id);
        setLocalAccounts(cur => editingId ? cur.map(item => item.id === editingId ? a : item) : [...cur, a]);
        const nextLinks = { ...(prefs.cardBankLinks || {}) }; if (linkedBankId) nextLinks[a.id] = linkedBankId; else delete nextLinks[a.id]; setPref('cardBankLinks', nextLinks);
        notify(cloudMode ? tr('No connection. Saved on this device; it uploads automatically when you are back online.') : editingId ? 'Account updated on this device.' : 'Account saved on this device only.');
      }
      setAccountForm(BLANK_ACCOUNT);
      setSheet(null);
    } catch (cause) { setError(cause?.message === tr('This record is not on this device yet. Try again when you are back online.') ? cause.message : editingId ? 'Could not update account. Please review the details and try again.' : 'Could not add account. Please review the details and try again.'); }
    finally { setBusy(false); }
  };
  const archiveAccount = (account) => confirm({
    title: tr('Archive this account?'), name: account.name, icon: 'archive', confirmLabel: tr('Archive'),
    message: tr('It leaves your wallet and totals. Its transaction history will remain available.'),
    failure: tr('Could not archive this account. Please try again.'),
    action: async () => {
      const written = cloudMode ? await cloudWrite(() => updateAccount(account.id, { is_archived: true })) : { offline: true };
      if (!written.offline) setCloudAccounts(cur => cur.map(item => item.id === account.id ? (written.value || { ...item, is_archived: true }) : item));
      else {
        if(session?.user?.id) await persistHybridLocalRows(session.user.id,'financial_accounts',[{...account,is_archived:true}]);
        setLocalAccounts(cur => cur.map(item => item.id === account.id ? { ...item, is_archived: true } : item));
      }
      setSheet(null); notify(tr('Account archived. Its transaction history was kept.'));
    },
  });
  /* Removing moves the item to the Archive for 90 days (Menu → Archive), where it can be restored. */
  const archiveItem = useCallback((kind, item) => setPrefs(p => ({ ...p, archive: addToArchive(p.archive, archiveEntry(kind, item)) })), []);
  /* Deleting or reversing always asks first; the change runs only after the person confirms, and a failure is shown in
     the dialog with nothing removed on screen. Returns true when it was done. */
  const removeTransaction = async (t) => {
    const raw = rawTxs.find(x => x.id === t.id) || t;
    if (String(t.id).startsWith('allocation-')) {
      if (t.event_type !== 'allocated') {
        notify(tr('Allocation release history is kept for audit purposes.'));
        return false;
      }
      return confirm({
        title: tr('Reverse this allocation?'), name: t.merchant, icon: 'refresh', confirmLabel: tr('Reverse'), danger: true,
        message: tr('The money is released back to its account and your balances update. The allocation history is kept.'),
        failure: tr('Could not reverse this allocation. Nothing was changed. Please try again.'),
        action: async () => {
          await reverseAllocationEvent(String(t.id).slice('allocation-'.length));
          await refreshCloud(session?.user);
          setSheet(null);
          notify(tr('Allocation reversed and released from its account.'));
        },
      });
    }
    const impact = [
      t.type === 'transfer' ? tr('Both accounts in this transfer are updated.') : tr('Your balances and reports update straight away.'),
      /^movo-subscription:/.test(String(raw.external_reference || '')) ? tr('The linked subscription payment is reversed too.') : '',
      tr('It stays in the Archive for 90 days, where you can restore it.'),
    ].filter(Boolean).join(' ');
    return confirm({
      ...deleteRecord(t.merchant || raw.merchant, { impact }),
      failure: tr('Could not delete this transaction or reverse its linked payment.'),
      action: async () => {
        const written = cloudMode ? await cloudWrite(() => deleteTransaction(t.id)) : { offline: true };
        if (!written.offline) {
          const saved = session?.user?.id ? await loadPreferences(session.user.id).catch(() => null) : null;
          if (saved?.prefs) setPrefs(cur => ({ ...cur, ...saved.prefs, archive: cur.archive }));
          await refreshCloud(session?.user);
        } else {
          // A signed-in owner's deletion is remembered (tombstone) and applied to the cloud on reconnect, with the same
          // server procedure, only if the cloud row is still unchanged.
          if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[raw],'delete');
          if (session?.user?.id && !recordOfflineDeletions(session.user.id, [{ group: 'transactions', id: t.id, row: raw }])) throw new Error('device_copy_unavailable');
          const restoredSubscriptions = revertSubscriptionPayment(prefsRef.current.subscriptions || [], raw);
          if (restoredSubscriptions !== (prefsRef.current.subscriptions || [])) setPref('subscriptions', restoredSubscriptions);
        }
        archiveItem('transaction', raw);
        setRawTxs(cur => cur.filter(x => x.id !== t.id)); setSheet(null);
        notify(tr('Moved to Archive. You can restore it for 90 days.'));
      },
    });
  };
  const saveSpendingLimit = async ({ id, scope, account_id, merchant, monthly_limit, alert_percent }) => {
    const row = { id: id || window.crypto?.randomUUID?.() || `limit-${Date.now()}`, scope, account_id: account_id || '', merchant: merchant || '', monthly_limit, alert_percent: Number(alert_percent) || 80, currency: base };
    setPref('spendingLimits', [...(prefs.spendingLimits || []).filter(item => item.id !== row.id), row]);
    notify(tr('Budget saved.'));
  };
  const deleteSpendingLimit = (id) => {
    const row = (prefs.spendingLimits || []).find(item => item.id === id);
    if (!row) return Promise.resolve(false);
    return confirm({
      ...deleteRecord(row.merchant || accountsView.find(a => a.id === row.account_id)?.name || tr('Spending limit'), { impact: tr('Only the limit is removed. Your transactions and balances stay the same.'), permanent: true }),
      action: () => { setPref('spendingLimits', (prefsRef.current.spendingLimits || []).filter(item => item.id !== id)); notify(tr('Budget removed.')); },
    });
  };
  const saveBudget = async ({ id, category: picked, monthly_limit }) => {
    // Budgets are kept per compact category id (custom text stays as written).
    const c = categoryOf(picked); const category = c.custom ? picked : c.primary;
    if (cloudMode && session?.user) {
      const row = id ? await updateBudget(id, { category, monthly_limit, currency: base }) : await createBudget({ category, monthly_limit, currency: base }, session.user.id);
      setCloudBudgets(cur => [...cur.filter(b => b.id !== row.id), row]);
    } else {
      const row = { id: id || window.crypto?.randomUUID?.() || `budget-${Date.now()}`, category, monthly_limit, currency: base };
      setPref('budgets', [...(prefs.budgets || []).filter(b => b.id !== row.id), row]);
    }
    notify(tr('Budget saved.'));
  };
  const deleteBudget = (id) => {
    const row = (cloudMode ? cloudBudgets : (prefs.budgets || [])).find(b => b.id === id);
    return confirm({
      ...deleteRecord(row ? categoryFullLabel(row.category) : '', { impact: [tr('Your transactions are not changed.'), tr('It stays in the Archive for 90 days, where you can restore it.')].join(' ') }),
      failure: tr('Could not remove it. Please try again.'),
      action: async () => {
        if (cloudMode) { await removeBudget(id); setCloudBudgets(cur => cur.filter(b => b.id !== id)); } else setPref('budgets', (prefsRef.current.budgets || []).filter(b => b.id !== id));
        if (row) archiveItem('budget', row);
        notify(tr('Moved to Archive. You can restore it for 90 days.'));
      },
    });
  };
  const savePlan = (plan) => { const target = Number(plan.target ?? plan.target_amount ?? plan.amount); const saved = Number(plan.saved ?? plan.saved_amount ?? 0); const row = { ...plan, target: Number.isFinite(target) && target > 0 ? target : 0, saved: Number.isFinite(saved) && saved > 0 ? saved : 0, annual_rate: Math.max(0, Math.min(100, Number(plan.annual_rate) || 0)), compounding: ['monthly', 'quarterly', 'annually'].includes(plan.compounding) ? plan.compounding : 'monthly', due: plan.due || plan.due_date || plan.target_date || plan.date || '', currency: base, id: plan.id || window.crypto?.randomUUID?.() || `plan-${Date.now()}` }; setPref('plans', [...plans.filter(p => p.id !== row.id), row]); notify(tr('Plan saved.')); };
  const deletePlan = (id) => {
    const row = (prefs.plans || []).find(p => p.id === id);
    return confirm({
      ...deleteRecord(row?.name || row?.title || '', { impact: [tr('Money you set aside in your accounts is not moved.'), tr('It stays in the Archive for 90 days, where you can restore it.')].join(' ') }),
      action: () => { setPref('plans', (prefsRef.current.plans || []).filter(p => p.id !== id)); if (row) archiveItem('plan', row); notify(tr('Moved to Archive. You can restore it for 90 days.')); },
    });
  };
  const saveSubscription = (sub) => {
    const row = { ...sub, id: sub.id || window.crypto?.randomUUID?.() || `sub-${Date.now()}` };
    setPref('subscriptions', [...subscriptions.filter(x => x.id !== row.id), row]);
    notify(sub.id ? tr('Subscription updated.') : tr('{name} added to your subscriptions.', { name: row.name }));
  };
  const deleteSubscription = (id) => {
    const row = subscriptions.find(x => x.id === id);
    return confirm({
      ...deleteRecord(row?.name || '', { impact: [tr('Payments you already logged are kept.'), tr('It stays in the Archive for 90 days, where you can restore it.')].join(' ') }),
      action: () => { setPref('subscriptions', (prefsRef.current.subscriptions || []).filter(x => x.id !== id)); if (row) archiveItem('subscription', row); notify(tr('Moved to Archive. You can restore it for 90 days.')); },
    });
  };
  /* Opens the add-transaction sheet pre-filled with this renewal, converted to the home currency. */
  const logCreditCardPayment = (card, amount) => {
    const value=Number(amount);
    if(!Number.isFinite(value)||value<=0) throw new Error(tr('Enter an amount greater than zero.'));
    const date=today();
    const current=prefs.creditCardPayments||{};
    const payments=current[card.id]||[];
    setPref('creditCardPayments',{...current,[card.id]:[...payments,{id:window.crypto?.randomUUID?.()||String(Date.now()),amount:Math.round(value*100)/100,date,month:date.slice(0,7)}]});
    notify(tr('Card payment recorded.'));
  };
  const logSubscription = (sub) => {
    const amount = Math.round(toBase(Number(sub.amount) || 0, sub.currency) * 100) / 100;
    const paymentAccountId = subscriptionPaymentAccountId(sub, accountsView);
    setError('');
    setForm(f => ({ ...f, transaction_type: 'expense', merchant: sub.name, amount: String(amount), account_id: paymentAccountId, category: 'Subscriptions', occurred_at: today(), time: '', subscriptionPaymentId: sub.id, payment_reference:'', receipt_note:'', receipt_path:'', receipt_path_to_delete:'', receipt_file:null, note: sub.currency && sub.currency !== base ? `${tr('Subscription')} · ${money(Number(sub.amount), sub.currency)}` : tr('Subscription') }));
    setSheet({ name: 'transaction', type: 'expense' });
  };
  const exportCsv = () => {
    // Every column MOVO's CSV import reads back (exact time, both accounts of a transfer, note, reference), plus a
    // stable category id; accounting activity is not a transaction and is left out.
    const rows = [['Date', 'Description', 'Category', 'Category ID', 'Type', 'Amount', 'Currency', 'Account', 'To Account', 'Note', 'Payment Reference'],
      ...txs.filter(t => ['income', 'expense', 'transfer'].includes(t.type)).map(t => [t.date, t.merchant, categoryFullLabel(t.categoryId || t.category), t.categoryId || '', t.type, t.origAmount, t.origCurrency || 'PHP', t.accountName, t.type === 'transfer' ? t.transferToAccountName : '', t.note || '', t.payment_reference || ''])];
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
      if (cloudMode && session?.user) { await deleteAllCloudData(session.user.id); setCloudAccounts([]); setCloudBudgets([]); setCloudBills([]); setCloudBillOccurrences([]); }
      const qrCleanup = Promise.all([clearLocalAccountQr(), clearLocalAttachments()]).catch(() => {});
      const wipe = (store) => { try { Object.keys(store).filter(k => k.startsWith('movo.')).forEach(k => store.removeItem(k)); } catch { /* storage unavailable */ } };
      wipe(localStorage); wipe(sessionStorage); clearLocalFinanceData(); clearCustomStickers(); setSceneryPhotoState(''); pendingLocalDataRef.current = null; setLocalPersistenceWarning(false);
      setPrefs({ ...DEFAULTS }); setRawTxs([]); setLocalAccounts([]); setPendingLog(null); setSheet(null); setClearText('');
      await qrCleanup;
      if(session?.user?.id && typeof indexedDB !== 'undefined') await clearHybridOwner(session.user.id);
      notify(cloudMode ? tr('All MOVO data was deleted from this device and your account.') : tr('All MOVO data on this device was deleted.'));
    } catch { setError(tr('Some cloud data could not be deleted. Nothing on this device was removed; please try again.')); }
    finally { setBusy(false); }
  };
  /* Delete the MOVO account itself (App Store 5.1.1(v)): server deletes the account and its cloud data, then this
     device is cleared and signed out. */
  const deleteAccount = async () => {
    if (clearText.trim().toUpperCase() !== 'DELETE') return;
    setBusy(true); setError('');
    try {
      await deleteMyAccount();
      if(session?.user?.id && typeof indexedDB !== 'undefined') await clearHybridOwner(session.user.id);
      await Promise.all([clearLocalAccountQr(), clearLocalAttachments()]).catch(() => {});
      const wipe = (store) => { try { Object.keys(store).filter(k => k.startsWith('movo.') || k.startsWith('sb-')).forEach(k => store.removeItem(k)); } catch { /* storage unavailable */ } };
      wipe(localStorage); wipe(sessionStorage); clearLocalFinanceData(); clearCustomStickers();
      setSheet(null); setClearText('');
      notify(tr('Your MOVO account was deleted.'));
      signOut().catch(() => {}).finally(() => window.location.reload());
    } catch { setError(tr('Could not delete your account. Check your connection and try again.')); }
    finally { setBusy(false); }
  };
  /* ---------- automation links (Apple Pay / Google Pay / notifications) ---------- */
  // Saves with the real channel (applepay, googlepay, bank, notification). Until migration 20261102010000 is applied the
  // database only accepts 'notification', so a rejected source is retried once as 'notification' instead of losing the record.
  const createAutomated = useCallback(async (payload) => {
    try { return await createTransaction(payload, session.user.id); }
    catch (cause) {
      if (payload.source !== 'notification' && /transactions_source_check/.test(String(cause?.message || ''))) return createTransaction({ ...payload, source: 'notification' }, session.user.id);
      throw cause;
    }
  }, [session]);
  const recordCreditSpend = useCallback(async (entry) => {
    const account = (accountsView || []).find(a => String(a.id) === String(entry.account_id));
    if (!account || account.account_type !== 'card' || account.cardKind !== 'credit') throw new Error('Choose a valid credit card.');
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e17) throw new Error('Enter a valid purchase amount.');
    // Today's purchase records the device's current time; a chosen earlier day keeps that day (lib/loggedAt.js).
    const occurred_at = loggedAt(entry.date);
    const note = `Credit purchase · APR ${Number(entry.annual_rate) || 0}% · ${Number(entry.months) || 1} month payoff estimate · estimated total ${Number(entry.after_interest_amount) || amount} ${account.currency || base}`;
    const payload = { merchant: String(entry.merchant || '').trim().slice(0, 160), amount: Math.round(amount * 100) / 100, currency: account.currency || base, transaction_type: 'expense', category: 'Shopping', account_id: account.id, occurred_at, note };
    if (!payload.merchant) throw new Error('Enter the merchant name.');
    const id = newRecordId();
    const written = cloudMode ? await createLocalFirst({ ...payload, id }) : { offline: true };
    const row = written.offline ? { ...payload, id, source: 'Manual', created_at: new Date().toISOString() } : written.row;
    if(written.offline) if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[row]);
    setRawTxs(cur => [row, ...cur]);
    return row;
  }, [accountsView, base, cloudMode, createLocalFirst, session]);
  /*
   * A credit-card payment paid from one of the person's accounts is a transfer (account → card): the card owes less
   * and the account holds less, so the total balance stays right. Without a source account it is only noted on the
   * card (the total leaves it out; lib/totalBalance.js).
   */
  const recordCardPayment = useCallback(async ({ cardId, amount, date, fromAccountId }) => {
    const value = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(value) || value <= 0 || value >= 1e15) throw new Error(tr('Enter an amount greater than zero.'));
    const day = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : today();
    const payment = { id: newRecordId(), amount: value, date: day, month: day.slice(0, 7) };
    if (fromAccountId) {
      const card = accountsView.find(a => a.id === cardId);
      const from = accountsView.find(a => a.id === fromAccountId && !a.is_archived && a.id !== cardId);
      if (!card || !from) throw new Error(tr('Choose the account you paid from.'));
      const id = newRecordId();
      const payload = { merchant: `${tr('Card payment')} · ${card.institution_name || card.name}`.slice(0, 160), amount: value, currency: from.currency || base, transaction_type: 'transfer', category: 'Transfer', account_id: from.id, transfer_to_account_id: card.id, occurred_at: loggedAt(day), note: '' };
      const written = cloudMode ? await createLocalFirst({ ...payload, id }) : { offline: true };
      const row = written.offline ? { ...payload, id, source: 'Manual' } : written.row;
      if(written.offline) if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[row]);
      setRawTxs(cur => [row, ...cur]);
      payment.transaction_id = String(row.id);
    }
    setPrefs(p => ({ ...p, creditCardPayments: { ...(p.creditCardPayments || {}), [cardId]: [...(p.creditCardPayments?.[cardId] || []), payment] } }));
    return payment;
  }, [accountsView, base, cloudMode, createLocalFirst, session]);
  const autoLogFor = useCallback(async (entry) => {
    const account = matchAccount(entry.card, accountsView.filter(a => !a.is_archived));
    if (!account) { notify(tr('Add an account or card in Wallet first, then log this transaction.')); return; }
    const payload = { merchant: entry.merchant, amount: entry.amount, transaction_type: 'expense', category: guessCategory(entry.merchant), account_id: account.id, occurred_at: entry.at || new Date().toISOString(), note: `${tr('Logged from {source}', { source: entry.source })}${entry.card ? ` · ${entry.card}` : ''}${entry.ref ? ` · Ref ${entry.ref}` : ''}` };
    const dup = findDuplicate({ ...payload, ref: entry.ref }, rawTxs);
    if (dup) { notify(`${dupText(dup)} ${tr('The {source} notification was not added twice.', { source: tr(entry.source) })}`); return; }
    try {
      const id = newRecordId();
      const source = AUTOMATION_SOURCES.includes(entry.src) ? entry.src : 'notification';
      const written = cloudMode ? await cloudWrite(() => createAutomated({ ...payload, id, source, external_reference: entry.ref || undefined })) : { offline: true };
      const row = written.offline ? { ...payload, id, source, external_reference: entry.ref || undefined } : written.value;
      if(written.offline) if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[row]);
      markFresh(row.id); setRawTxs(cur => [row, ...cur]);
      notify(tr('Logged {amount} at {merchant} from {source}.', { amount: money(entry.amount), merchant: entry.merchant, source: tr(entry.source) }));
      celebrate();
    } catch { setPendingLog(entry); }
  }, [accountsView, cloudMode, cloudWrite, notify, rawTxs, celebrate, createAutomated]);
  /* ---------- logging from the NasrinAI chat (parsed on this device; see lib/chatLog.js) ---------- */
  const logFromChat = useCallback(async (entries, force = false) => {
    const open = accountsView.filter(a => !a.is_archived);
    if (!open.length) throw new Error('account_required');
    const saved = []; const skipped = [];
    let online = cloudMode;
    for (const e of entries) {
      const account = matchAccount(e.accountHint || '', open);
      if (!account) throw new Error('account_required');
      const currency = account?.currency || e.currency || base;
      const stamp = new Date(e.date); const now = new Date();
      stamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      const payload = { merchant: e.merchant, amount: e.amount, currency, transaction_type: e.type, category: e.category, account_id: account?.id || 'local', occurred_at: stamp.toISOString(), note: tr('Logged from NasrinAI chat') };
      const dup = force ? null : findDuplicate(payload, [...saved, ...rawTxs]);
      if (dup) { skipped.push({ ...payload, id: `dup-${skipped.length}-${dup.id}`, duplicateOf: dup, entry: e, accountName: account?.name || '' }); continue; }
      const id = newRecordId();
      // Offline-first: once the cloud cannot be reached, the rest of the entries are saved on the device copy.
      const written = online ? await createLocalFirst({ ...payload, id }) : { offline: true };
      if (written.offline) online = false;
      const row = written.offline ? { ...payload, id, source: 'Manual' } : written.row;
      if(written.offline) if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[row]);
      saved.push({ ...row, accountName: account?.name || '' });
    }
    if (saved.length) {
      saved.forEach(r => markFresh(r.id));
      setRawTxs(cur => [...saved, ...cur]);
      notify(saved.length === 1 ? tr('{name} added to your transactions.', { name: saved[0].merchant }) : tr('{n} transactions added.', { n: saved.length }));
      celebrate();
    } else if (skipped.length) notify(dupText(skipped[0].duplicateOf));
    return [...saved, ...skipped];
  }, [accountsView, cloudMode, createLocalFirst, session, base, notify, rawTxs, celebrate]);
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
    { id: 'scan', icon: 'scan', label: 'Scan receipt', run: () => setSheet({ name: can('receiptScan') ? 'scanner' : 'planOffer', feature: 'receiptScan' }) },
    { id: 'today', icon: 'calendar', label: 'Today', say: () => chatSummary('today') },
    { id: 'month', icon: 'chart', label: 'This month', say: () => chatSummary('month') },
    { id: 'budgets', icon: 'target', label: 'Budgets', run: () => setSheet({ name: 'budgets', tab: 'budgets' }) },
    { id: 'renewals', icon: 'clock', label: 'Renewals', run: () => go('Subscriptions') },
    { id: 'activity', icon: 'list', label: 'Transactions', run: () => go('Transactions') },
    { id: 'accounts', icon: 'wallet', label: 'Accounts', run: () => go('Wallet') },
  ];
  const undoChatLog = useCallback((id) => {
    const raw = rawTxs.find(x => x.id === id);
    return confirm({
      ...deleteRecord(raw?.merchant || '', { impact: [tr('Your balances and reports update straight away.'), tr('It stays in the Archive for 90 days, where you can restore it.')].join(' ') }),
      failure: tr('That record could not be removed. Please try again.'),
      action: async () => {
        const written = cloudMode ? await cloudWrite(() => deleteTransaction(id)) : { offline: true };
        if (written.offline && raw) if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[raw],'delete');
        if (written.offline && session?.user?.id && !recordOfflineDeletions(session.user.id, [{ group: 'transactions', id, ...(raw ? { row: raw } : {}) }])) throw new Error('device_copy_unavailable');
        if (raw) archiveItem('transaction', raw);
        setRawTxs(cur => cur.filter(x => x.id !== id));
        notify(tr('Moved to Archive. You can restore it for 90 days.'));
      },
    });
  }, [rawTxs, confirm, cloudMode, cloudWrite, session?.user?.id, archiveItem, notify]);
  /* ---------- preferences follow the signed-in person across devices ----------
     On sign-in the account's saved preferences (card styles, layouts, theme, subscriptions, plans…) and custom
     sticker artwork are merged with what this device already has cached (nothing local is dropped), and the merged
     result is saved back; after that every change is saved back, debounced. If the cloud table
     is unavailable MOVO keeps working with this device's preferences only. */
  const prefsSync = useRef({ user: '', ready: false, timer: 0 });
  const qrMigrationRef = useRef(new Set());
  const [stickerTick, setStickerTick] = useState(0);
  useEffect(() => subscribeCustomStickers(() => setStickerTick(t => t + 1)), []);
  const userId = cloudMode ? session?.user?.id || '' : '';
  useEffect(() => {
    const retry = () => setQrRetryTick(value => value + 1);
    const onVisibility = () => { if (document.visibilityState === 'visible') retry(); };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('focus', retry); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  useEffect(() => {
    let live = true;
    setAccountQrDisplay({});
    const entries = Object.entries(prefs.accountQrCodes || {});
    Promise.all(entries.map(async ([accountId, value]) => {
      if (isAccountQrDataUrl(value)) return [accountId, value];
      if (userId && prefs.accountQrPending?.[accountId]) {
        try { return [accountId, await getLocalAccountQr(`${userId}:${accountId}`) || '']; } catch { return [accountId, '']; }
      }
      if (typeof value === 'string' && value.startsWith('localqr:')) {
        const cacheKey = value.slice(8);
        if (cacheKey !== `local:${accountId}` && (!userId || cacheKey !== `${userId}:${accountId}`)) return [accountId, ''];
        try { return [accountId, await getLocalAccountQr(cacheKey) || '']; } catch { return [accountId, '']; }
      }
      if (!userId || typeof value !== 'string') return [accountId, ''];
      try { const signedUrl = await getAccountQrSignedUrl(userId, value); cacheSignedAccountQr(userId, accountId, signedUrl).catch(() => {}); return [accountId, signedUrl]; }
      catch {
        try { return [accountId, await getLocalAccountQr(`${userId}:${accountId}`) || '']; }
        catch { return [accountId, '']; }
      }
    })).then(rows => { if (live) setAccountQrDisplay(Object.fromEntries(rows.filter(([, value]) => value))); });
    return () => { live = false; };
  }, [userId, prefs.accountQrCodes, prefs.accountQrPending, cloudAccounts, qrRetryTick, stickerTick]);
  useEffect(() => {
    const sync = prefsSync.current;
    sync.user = userId; sync.ready = false;
    if (!userId) return undefined;
    let live = true;
    loadPreferences(userId).then(row => {
      if (!live) return;
      if (row?.prefs && typeof row.prefs === 'object' && !Array.isArray(row.prefs)) {
        setPrefs(cur => mergePreferences(DEFAULTS, cur, cloudSafePreferences(row.prefs)));
        if (Array.isArray(row.stickers) && row.stickers.length) replaceCustomStickers(unionById(row.stickers, getCustomStickers(), 40));
      }
      sync.ready = true;
      setStickerTick(t => t + 1); // upload the merged copy (or this device's on a first sign-in)
    }).catch(() => { /* table unavailable: stay device-only */ });
    return () => { live = false; };
  }, [userId]);
  useEffect(() => {
    if (!userId || !can('cloudWrite') || !prefsSync.current.ready || !prefs.accountQrCodes) return;
    const pendingMap = new Map(Object.entries(prefs.accountQrCodes).filter(([id, value]) => isAccountQrDataUrl(value)));
    Object.keys(prefs.accountQrPending || {}).forEach(id => pendingMap.set(id, { cacheKey: `${userId}:${id}` }));
    Object.entries(prefs.accountQrCodes).forEach(([id, value]) => {
      if (typeof value === 'string' && value.startsWith('localqr:')) {
        const cacheKey = value.slice(8);
        if (cacheKey === `local:${id}` || cacheKey === `${userId}:${id}`) pendingMap.set(id, { cacheKey });
      }
    });
    const pending = [...pendingMap.entries()].filter(([id]) => cloudAccounts.some(account => account.id === id) && !qrMigrationRef.current.has(`${userId}:${id}`));
    if (!pending.length) return;
    let live = true;
    pending.forEach(([id]) => qrMigrationRef.current.add(`${userId}:${id}`));
    Promise.all(pending.map(async ([id, pendingValue]) => {
      try {
        const dataUrl = isAccountQrDataUrl(pendingValue) ? pendingValue : await getLocalAccountQr(pendingValue.cacheKey);
        if (!dataUrl) throw new Error('local_qr_missing');
        const path = await uploadAccountQr(userId, id, dataUrl);
        await saveLocalAccountQr(`${userId}:${id}`, dataUrl);
        const previous = prefs.accountQrCodes?.[id] || '';
        if (previous && previous !== path && !isAccountQrDataUrl(previous) && !previous.startsWith('localqr:')) removeAccountQr(userId, previous).catch(() => {});
        return [id, dataUrl, path, previous];
      } catch { qrMigrationRef.current.delete(`${userId}:${id}`); return [id, null, null, null]; }
    })).then(rows => {
      if (!live) { pending.forEach(([id]) => qrMigrationRef.current.delete(`${userId}:${id}`)); return; }
      const migrated = rows.filter(([, , path]) => path);
      if (!migrated.length) return;
      setPrefs(cur => {
        const next = { ...(cur.accountQrCodes || {}) };
        migrated.forEach(([id, dataUrl, path, previous]) => { if (next[id] === dataUrl || next[id] === previous || !next[id]) next[id] = path; });
        const pending = { ...(cur.accountQrPending || {}) }; migrated.forEach(([id]) => { delete pending[id]; });
        return { ...cur, accountQrCodes: next, accountQrPending: pending };
      });
      migrated.forEach(([id]) => qrMigrationRef.current.delete(`${userId}:${id}`));
    });
    return () => { live = false; };
  }, [userId, prefs.accountQrCodes, prefs.accountQrPending, cloudAccounts, qrRetryTick, entitlement, cloudMode]);
  useEffect(() => {
    const sync = prefsSync.current;
    if (!sync.ready || !sync.user || !can('cloudWrite') || prefs.cloudSyncEnabled === false) return undefined;
    clearTimeout(sync.timer);
    sync.timer = setTimeout(() => {
      // Newest stickers first, within the row's size limit; the scenery photo stays on its device.
      let size = 0;
      const stickers = getCustomStickers().filter(st => (size += (st.src || '').length + 200) < 3_800_000);
      const shared = cloudSafePreferences(prefs);
      if ((shared.mascot || '').length > 120_000) delete shared.mascot;
      savePreferences(sync.user, shared, stickers).catch(() => { /* retried on the next change */ });
    }, 1500);
    return () => clearTimeout(sync.timer);
  }, [prefs, stickerTick, entitlement, cloudMode]);

  /* ---------- alerts delivered by the browser (Push Notifications), held during quiet hours ---------- */
  useEffect(() => {
    if (!prefs.push || !prefs.notifications || !pushGranted()) return;
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
  reviewGateRef.current = { ready: setupDone && !locked, sheet: !!sheet };
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

  /* ---------- "While you were away": what was logged since MOVO was last open, and automations that failed ---------- */
  // Checked once the app is ready, and again when MOVO comes back after 2+ minutes in the background (cloud records
  // are refreshed first). Only items that arrived while the person was away open the sheet.
  const [logsCheck, setLogsCheck] = useState(null);
  useEffect(() => { if (authReady) setLogsCheck({ since: 0 }); }, [authReady]);
  useEffect(() => {
    let awayAt = 0;
    const onVis = () => {
      if (document.hidden) { awayAt = Date.now(); return; }
      const since = awayAt; awayAt = 0;
      if (!since || Date.now() - since < 120000) return;
      const check = () => setLogsCheck({ since });
      if (cloudMode && session?.user) refreshCloud(session.user).then(check, check); else check();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [cloudMode, session, refreshCloud]);
  useEffect(() => {
    if (!logsCheck || locked) return;
    setLogsCheck(null);
    if (!prefs.logsSeenAt) { setPref('logsSeenAt', new Date().toISOString()); return; } // first run: start counting from now
    if (!prefs.onboarded || !setupDone || sheet) return;
    const since = Math.max(Date.parse(prefs.logsSeenAt) || 0, logsCheck.since || 0);
    if (rawTxs.some(t => logStamp(t) > since) || inbox.some(i => Date.parse(i.created_at) > since)) setSheet({ name: 'recentLogs', since });
  }, [logsCheck, locked, prefs.logsSeenAt, prefs.onboarded, setupDone, sheet, rawTxs, inbox, setPref]);
  const closeRecentLogs = () => { setPref('logsSeenAt', new Date().toISOString()); setSheet(null); };
  const dismissInboxItem = async (item) => {
    try { await resolveAutomationInboxItem(item.id, { status: 'dismissed' }); setInbox(cur => cur.filter(i => i.id !== item.id)); notify(tr('Moved to Archive. You can restore it for 90 days.')); }
    catch { notify(tr('Could not update this item. Please try again.')); }
  };
  /* ---------- Archive (Menu → Archive): 90 days to restore, then gone ---------- */
  const [archivedAutomations, setArchivedAutomations] = useState([]);
  const loadArchivedAutomations = useCallback(async () => {
    if (!cloudMode) { setArchivedAutomations([]); return; }
    try { setArchivedAutomations(await listArchivedAutomations()); } catch { setArchivedAutomations([]); }
  }, [cloudMode]);
  // Expired entries are removed when MOVO opens (and archived automations older than 90 days on the server).
  useEffect(() => {
    if ((prefs.archive || []).length && purgeArchive(prefs.archive).length !== prefs.archive.length) setPrefs(p => ({ ...p, archive: purgeArchive(p.archive) }));
  }, [prefs.archive]);
  useEffect(() => { if (cloudMode) purgeArchivedAutomations().catch(() => {}); }, [cloudMode]);
  const restoreArchived = async (entry) => {
    const it = entry.item;
    try {
      if (entry.kind === 'automation') {
        await resolveAutomationInboxItem(it.id, { status: 'failed' });
        setArchivedAutomations(cur => cur.filter(a => a.id !== it.id)); setInbox(cur => [{ ...it, status: 'failed' }, ...cur.filter(i => i.id !== it.id)]);
      } else if (entry.kind === 'transaction') {
        const open = new Set(formAccounts.map(a => a.id));
        if (!open.has(it.account_id) || (it.transfer_to_account_id && !open.has(it.transfer_to_account_id))) { notify(tr('Its account is no longer in your wallet. Add the account again, then restore.')); return; }
        if (cloudMode && session?.user) {
          const row = await createTransaction({ ...it, id:newRecordId(), transaction_type: it.transaction_type || it.type }, session.user.id);
          try {
            await restoreTransactionLinks(it.id, row.id);
          } catch (restoreError) {
            await deleteTransaction(row.id).catch(() => {});
            throw restoreError;
          }
          const restoredPrefs = await loadPreferences(session.user.id).catch(() => null);
          if (restoredPrefs?.prefs) setPrefs(cur => ({ ...cur, ...restoredPrefs.prefs, archive: cur.archive }));
          setRawTxs(cur => [row, ...cur]);
          await refreshCloud(session.user);
        } else {
          // A signed-in owner's restore also drops the pending deletion, in the same device write.
          if(session?.user?.id) await persistHybridLocalRows(session.user.id,'transactions',[it]);
          if (session?.user?.id && !restoreOfflineRows(session.user.id, 'transactions', [it])) throw new Error('device_copy_unavailable');
          const restoredSubscriptions = restoreSubscriptionPayment(prefs.subscriptions || [], it);
          if (restoredSubscriptions !== (prefs.subscriptions || [])) setPref('subscriptions', restoredSubscriptions);
          setRawTxs(cur => [it, ...cur.filter(x => x.id !== it.id)]);
        }
      } else if (entry.kind === 'budget') {
        await saveBudget({ category: it.category, monthly_limit: it.monthly_limit });
      } else if (entry.kind === 'plan') {
        setPref('plans', [...(prefs.plans || []).filter(p => p.id !== it.id), it]);
      } else if (entry.kind === 'subscription') {
        setPref('subscriptions', [...subscriptions.filter(x => x.id !== it.id), it]);
      }
      if (entry.kind !== 'automation') setPrefs(p => ({ ...p, archive: removeFromArchive(p.archive, entry.id) }));
      notify(tr('Restored.'));
    } catch { notify(tr('Could not restore this item. Please try again.')); }
  };
  const deleteArchived = async (entry) => {
    try {
      if (entry.kind === 'automation') { await deleteAutomationInboxItem(entry.item.id); setArchivedAutomations(cur => cur.filter(a => a.id !== entry.item.id)); }
      else setPrefs(p => ({ ...p, archive: removeFromArchive(p.archive, entry.id) }));
      notify(tr('Deleted for good.'));
    } catch { notify(tr('Could not delete this item. Please try again.')); }
  };
  const emptyArchive = async () => {
    try {
      await Promise.all(archivedAutomations.map(a => deleteAutomationInboxItem(a.id)));
      setArchivedAutomations([]); setPrefs(p => ({ ...p, archive: [] }));
      notify(tr('Archive emptied.'));
    } catch { notify(tr('Could not delete this item. Please try again.')); }
  };
  const logInboxItem = async (item, { account_id, amount, merchant }) => {
    const type = item.transaction_type === 'income' ? 'income' : 'expense';
    const occurred_at = item.occurred_at || new Date().toISOString();
    const account = formAccounts.find(a => a.id === account_id);
    const dup = findDuplicate({ merchant, amount, type, date: occurred_at, account_id, ref: item.external_reference || '' }, rawTxs);
    try {
      let row = null;
      if (!dup) {
        row = await createAutomated({ merchant, amount, currency: item.currency || account?.currency || base, transaction_type: type, category: type === 'income' ? 'Income' : guessCategory(merchant), account_id, occurred_at,
          note: tr('Logged from {source}', { source: tr(SOURCE_LABEL[item.source] || 'Notification') }), source: item.source, external_reference: item.external_reference || undefined });
        markFresh(row.id); setRawTxs(cur => [row, ...cur]);
      }
      await resolveAutomationInboxItem(item.id, { status: 'logged', transactionId: (row || dup).id });
      setInbox(cur => cur.filter(i => i.id !== item.id));
      notify(dup ? `${dupText(dup)} ${tr('It was not added twice.')}` : tr('Logged {amount} at {merchant}.', { amount: money(amount, row.currency), merchant }));
      if (row) celebrate();
    } catch { notify(tr('Could not log this payment. Please try again.')); }
  };

  /* Once the first screen is up, fetch the on-demand screens while the device is idle, so later pages open at once
     (and still open offline if the connection drops after launch). */
  useEffect(() => {
    if (!authReady) return undefined;
    const idle = typeof window.requestIdleCallback === 'function';
    const id = idle ? window.requestIdleCallback(() => { preloadScreens(); }, { timeout: 4000 }) : window.setTimeout(() => { preloadScreens(); }, 2500);
    return () => { if (idle) window.cancelIdleCallback(id); else window.clearTimeout(id); };
  }, [authReady]);
  /* Fade out the loading screen from index.html once the app is ready. It stays at least ~0.45s from launch so it never
     flashes, and no longer: returning users reach their records as soon as the session is read. */
  useEffect(() => {
    if (!authReady) return undefined;
    const el = document.getElementById('movo-splash');
    if (!el) return undefined;
    const t = setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 400); }, Math.max(0, 450 - (window.performance?.now?.() || 0)));
    return () => clearTimeout(t);
  }, [authReady]);
  /* First-run tour: only for people with no saved preferences, on Home, and never in tests. */
  const showTour = authReady && !prefs.onboarded && view === 'Home' && !sheet && process.env.NODE_ENV !== 'test';
  // The daily briefing waits until tomorrow, so a new person is not shown two popups in a row.
  const finishTour = useCallback(() => {
    setPrefs(cur => ({ ...cur, onboarded: true, briefingDay: todayKey }));
  }, [todayKey]);
  /* Welcome choices: sign in or sign up skips the tour and opens the account page in that mode. */
  const [authMode, setAuthMode] = useState('signin');
  const [guideOpen, setGuideOpen] = useState(false); // replay of the video guide from Settings
  const startAccount = useCallback((mode) => {
    setPrefs(cur => ({ ...cur, onboarded: true, briefingDay: todayKey }));
    setAuthMode(mode); go('Sign in');
  }, [todayKey, go]);
  /* Reads a CSV or JSON file on this device and adds what is new; nothing already saved is overwritten. */
  const importDataFile = useCallback(async (file) => {
    if (file.size > IMPORT_MAX_BYTES) return { ok: false, message: tr('The file must be 5 MB or smaller.') };
    if (!/\.(csv|json)$/i.test(file.name || '')) return { ok: false, message: tr('Choose a CSV or JSON file.') };
    const parsed = parseImportFile(file.name, await file.text());
    if (parsed.errors.length) return { ok: false, message: tr(parsed.errors[0]) };
    const hasObligations = parsed.loans.length || parsed.receivables.length || parsed.bills.length;
    const hasOtherRecords = parsed.accounts.length || parsed.transactions.length || parsed.subscriptions.length || parsed.budgets.length || parsed.plans.length;
    if (hasObligations && hasOtherRecords) return { ok: false, message: tr('Import loans, receivables and bills in a separate file from accounts, transactions and plans.') };
    if (hasObligations && !cloudMode) return { ok: false, message: tr('Sign in to MOVO to import loans, receivables and bills securely.') };
    if(cloudMode)return {ok:false,message:'Turn Cloud Sync off before importing. File uploads never update cloud records.'};
    // First-run onboarding import never inserts loan/bill/receivable rows in
    // cloud without complete reversible-accounting verification.
    const batchId = `import-${Date.now().toString(36)}`;
    const plan = planImport(parsed, { accounts: localAccounts, transactions: rawTxs, subscriptions, budgets: prefs.budgets || [], plans: prefs.plans || [] },
      { base, batchId, fingerprint: transactionFingerprint, newId: () => window.crypto?.randomUUID?.() });
    if (plan.accounts.length) setLocalAccounts(cur => [...cur, ...plan.accounts]);
    if (plan.transactions.length) setRawTxs(cur => [...plan.transactions, ...cur]);
    setPrefs(cur => ({
      ...cur,
      subscriptions: [...(cur.subscriptions || []), ...plan.subscriptions],
      budgets: [...(cur.budgets || []), ...plan.budgets],
      plans: [...(cur.plans || []), ...plan.plans],
      accountStyles: { ...(cur.accountStyles || {}), ...Object.fromEntries(plan.accounts.filter(a => a.mask).map(a => [a.id, { mask: a.mask }])) },
    }));
    const added = plan.accounts.length + plan.transactions.length + plan.subscriptions.length + plan.budgets.length + plan.plans.length;
    const skipped = plan.skipped.duplicates + plan.skipped.conflicts + plan.skipped.invalid;
    const summary = tr('Added {items}.', { items: [['{n} accounts', plan.accounts], ['{n} transactions', plan.transactions], ['{n} subscriptions', plan.subscriptions], ['{n} budgets', plan.budgets], ['{n} goals', plan.plans]].filter(([, list]) => list.length).map(([label, list]) => tr(label, { n: list.length })).join(', ') });
    if (!added) return { ok: false, message: tr('Nothing new to add: everything in this file is already in MOVO.') };
    return { ok: true, message: skipped ? `${summary} ${tr('{n} rows were skipped as duplicates or incomplete.', { n: skipped })}` : summary };
  }, [cloudMode, session, refreshCloud, localAccounts, rawTxs, subscriptions, prefs.budgets, prefs.plans, base]);
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
  useEffect(() => {
    if (sheet?.name !== 'autolog') return undefined;
    if (!can('automation') || !session?.access_token || !prefs.autoLogKey) {
      setAutomationStatus('needs-signin');
      return undefined;
    }
    let cancelled = false;
    setAutomationStatus('registering');
    fetch(apiUrl('/api/log'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'register', deviceKey: prefs.autoLogKey, ...(prefs.autoLogAccount ? { defaultAccountId: prefs.autoLogAccount } : {}) }),
    }).then(async response => {
      if (!response.ok) throw new Error('registration_failed');
      return response.json();
    }).then(() => {
      if (!cancelled) setAutomationStatus('ready');
    }).catch(() => {
      if (!cancelled) setAutomationStatus('error');
    });
    return () => { cancelled = true; };
  }, [sheet?.name, cloudMode, session?.access_token, prefs.autoLogKey, prefs.autoLogAccount, entitlement]);

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
      // Handle each link once: a link that needs Pro+ opens the plans sheet a single time (it used to re-open on
      // every render while the link stayed in the address bar, which looped).
      if (!can('automation')) { setSheet({ name: 'planOffer', feature: 'automation' }); return; }
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
  }, [authReady, session, cloudMode, prefs.autoLog, prefs.autoLogKey, autoLogFor, notify, entitlement]);
  /*
   * NasrinAI's briefing opens once a day (not in unit tests). It never opens over another sheet: when
   * "While you were away" (or anything else) is showing, it waits and opens once that is closed, e.g. after Done.
   * It also waits for the unlock screen and for the launch check for new logs, so the logs come first.
   */
  const briefingShownDay = useRef('');
  const briefingDue = can('insights') && authReady && !locked && !logsCheck && prefs.onboarded && setupDone && prefs.briefing !== false && prefs.briefingDay !== todayKey
    && briefingShownDay.current !== todayKey && process.env.NODE_ENV !== 'test';
  useEffect(() => {
    if (!briefingDue || sheet) return undefined;
    const timer = setTimeout(() => setSheet(cur => {
      if (cur) return cur; // something else opened first; try again when it closes
      briefingShownDay.current = todayKey;
      return { name: 'briefing' };
    }), 700);
    return () => clearTimeout(timer);
  }, [briefingDue, sheet, todayKey]);
  const reviewPending = () => {
    const e = pendingLog; setPendingLog(null); setError('');
    setForm(cur => ({ ...cur, transaction_type: 'expense', merchant: e.merchant, amount: String(e.amount), category: guessCategory(e.merchant), occurred_at: e.at ? new Date(e.at).toLocaleDateString('en-CA') : today(), time: e.at ? new Date(e.at).toTimeString().slice(0, 8) : '', note: `${tr('From {source}', { source: e.source })}${e.card ? ` · ${e.card}` : ''}${e.ref ? ` · Ref ${e.ref}` : ''}`, account_id: matchAccount(e.card, formAccounts)?.id || cur.account_id, source: e.src, ref: e.ref || '' }));
    setSheet({ name: 'transaction', type: 'expense' });
  };

  /*
   * Log out (owner spec 2026-11-09). Nothing happens until the person confirms in the dialog. Records saved on this
   * device are never deleted by logging out: any offline changes are written to this account's device copy first (and
   * logging out stops if that write fails), then the session is ended on the server and removed from this device
   * (still removed when offline), and the app returns to the sign-in screen.
   */
  const performSignOut = async () => {
    const pending = pendingLocalDataRef.current;
    if (pending?.ownerId) {
      const workspace = loadOfflineWorkspace(pending.ownerId);
      if (!workspace || !updateOfflineWorking(pending.ownerId, { ...workspace.working, financial_accounts: pending.accounts, transactions: pending.transactions }))
        throw Object.assign(new Error('offline_changes_not_saved'), { userMessage: tr('Your changes on this device could not be saved, so you are still logged in. Free some storage or export your records, then try again.') });
      pendingLocalDataRef.current = null;
    }
    const result = await signOut();
    nativeReferralAttempt.current = ''; trialAutoRef.current = '';
    setOfflineOwnerId(null);
    setSession(null);
    setCloudMode(false);
    setCloudAccounts([]); setInbox([]); setCloudBills([]); setCloudBillOccurrences([]); setCloudBudgets([]);
    setCloudPostings([]);
    setCloudActivities([]);
    setRawTxs(!pending?.ownerId&&pending?.transactions ? pending.transactions:loadLocalTransactions());
    setLocalAccounts(!pending?.ownerId&&pending?.accounts ? pending.accounts:loadLocalAccounts());
    pendingLocalDataRef.current=null;
    setSheet(null);
    setAuthMode('signin');
    go('Sign in');
    notify(result?.localOnly ? tr('Logged out on this device. You were offline, so other devices were not signed out.') : tr('Signed out securely.'));
  };
  const signOutNow = () => {
    if (!session?.user) return Promise.resolve(false);
    const ownerId = session.user.id;
    const unsynced = unsyncedChangeCount(loadOfflineWorkspace(ownerId)) || (pendingLocalDataRef.current?.ownerId === ownerId ? 1 : 0);
    return confirm({
      title: tr('Log out of MOVO?'), message: tr('Are you sure you want to log out of your account?'),
      warning: unsynced === 1 ? tr('1 change on this device has not synced to your account yet. Logging out keeps it on this device; sign in to this account again to see or sync it.')
        : unsynced > 1 ? tr('{count} changes on this device have not synced to your account yet. Logging out keeps them on this device; sign in to this account again to see or sync them.', { count: unsynced }) : '',
      confirmLabel: tr('Log Out'), danger: true, icon: 'logout',
      failure: tr('Could not log out. You are still signed in. Please try again.'),
      action: performSignOut,
    });
  };

  /*
   * The rest of a backup: subscriptions, plans, budgets, limits, card looks and payments, loyalty cards, archive,
   * layouts and profile (lib/backupPreferences.js), plus QR codes, the scenery photo and custom stickers from the
   * attachments. Merged into this device; nothing already here is overwritten. Returns how many items were added.
   */
  const restoreBackupExtras = async (backup, accountIdMap, files) => {
    const { patch, counts, qrCodes } = planPreferenceRestore(backup, prefsRef.current, accountIdMap, DEFAULTS);
    let added = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const qrPatch = {}; const qrPending = {};
    for (const { from, to } of qrCodes) {
      const data = files.get('qr:' + from);
      if (!isAccountQrDataUrl(data)) continue;
      const cacheKey = cloudMode && session?.user?.id ? `${session.user.id}:${to}` : `local:${to}`;
      try { await saveLocalAccountQr(cacheKey, data); } catch { continue; }
      qrPatch[to] = `localqr:${cacheKey}`;
      if (cloudMode && session?.user?.id) qrPending[to] = true;
      added += 1;
    }
    const scenery = files.get('scenery');
    if (scenery && !sceneryPhoto && /^data:image\/(jpeg|png|webp);base64,/.test(scenery)) { setSceneryPhoto(scenery); added += 1; }
    const stickers = [...files.entries()].filter(([path, src]) => path.startsWith('sticker:') && /^data:image\/(jpeg|png|webp);base64,/.test(src || ''));
    if (stickers.length) {
      const mine = getCustomStickers();
      const extra = stickers.map(([path, src]) => ({ id: path.slice(8), src })).filter(item => !mine.some(s => s.id === item.id));
      if (extra.length && replaceCustomStickers([...mine, ...extra].slice(0, 40))) added += extra.length;
    }
    if (Object.keys(patch).length || Object.keys(qrPatch).length) {
      setPrefs(cur => ({ ...cur, ...patch,
        ...(Object.keys(qrPatch).length ? { accountQrCodes: { ...(cur.accountQrCodes || {}), ...qrPatch } } : {}),
        ...(Object.keys(qrPending).length ? { accountQrPending: { ...(cur.accountQrPending || {}), ...qrPending } } : {}) }));
    }
    return { added, counts };
  };
  const saveFinanceBackupRecords = async (backup) => {
    // A file import is never sent to a cloud API directly. With Cloud Sync on it is saved into this account's
    // device copy, shown everywhere at once, and uploaded by the verified offline sync (now or on reconnect).
    const signedOwner=session?.user?.id;
    const viaCloud=cloudMode&&!!signedOwner;
    const priorWorkspace=signedOwner?loadOfflineWorkspace(signedOwner):null;
    if(viaCloud&&!priorWorkspace)throw new Error('Signed-in account workspace is unavailable. No records were changed.');
    const deviceAccounts=viaCloud?priorWorkspace.working.financial_accounts:localAccounts;
    const deviceTransactions=viaCloud?priorWorkspace.working.transactions:rawTxs;
    const existing = { accounts: deviceAccounts, transactions: deviceTransactions };
    const planned = prepareFinanceBackupRestore(backup, existing, {
      base, fingerprint: transactionFingerprint, newId: newRecordId,
    });
    // Receipts travel as attachments: store each one on this device and point the restored row at it.
    const files = new Map((Array.isArray(backup?.attachments) ? backup.attachments : []).map(item => [item.path, item.dataUrl]));
    for (const row of planned.transactions) {
      if (!row.receipt_source_path) continue;
      const data = files.get(row.receipt_source_path);
      delete row.receipt_source_path;
      row.receipt_path = data && /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(data)
        ? await putLocalAttachment(dataUrlToBlob(data)).catch(() => null) : null;
    }
    const hasRows = planned.accounts.length > 0 || planned.transactions.length > 0;
    if (hasRows && viaCloud) {
      const problem = [...planned.accounts.map(row => offlineUploadProblem('financial_accounts', row, signedOwner)),
        ...planned.transactions.map(row => offlineUploadProblem('transactions', row, signedOwner))].find(Boolean);
      if (problem) throw new Error(`Some records in this file cannot be uploaded to your MOVO account (${problem}). Nothing was saved.`);
    }
    const result = { accounts: planned.accounts.length, transactions: planned.transactions.length, failed: 0, skipped: planned.skipped, unsupported: planned.unsupported };
    // Preferences point at the restored accounts, so they are applied only after those are safely saved.
    const withExtras = async () => ({ ...result, other: await restoreBackupExtras(backup, planned.accountIdMap || {}, files) });
    if (!hasRows) return { ...(await withExtras()), accounts: 0, transactions: 0 };
    const nextAccounts = [...deviceAccounts, ...planned.accounts];
    const nextTransactions = [...planned.transactions, ...deviceTransactions];
    if(signedOwner && ((!viaCloud&&offlineOwnerId!==signedOwner)||!priorWorkspace))
      throw new Error('Signed-in account workspace is unavailable. No records were changed.');
    const beforeAccounts=signedOwner?priorWorkspace.working.financial_accounts:loadLocalAccounts();
    const beforeTransactions=signedOwner?priorWorkspace.working.transactions:loadLocalTransactions();
    if (JSON.stringify(beforeAccounts)!==JSON.stringify(deviceAccounts)
      || JSON.stringify(beforeTransactions)!==JSON.stringify(deviceTransactions))
      throw new Error('Local records changed in another tab or are still saving. Reopen the backup and review before importing.');
    if(signedOwner){
      await persistHybridLocalImport(signedOwner,planned.accounts,planned.transactions,viaCloud?'online':'offline');
      if(!updateOfflineWorking(signedOwner,{...priorWorkspace.working,financial_accounts:nextAccounts,transactions:nextTransactions}))
        throw new Error('Device storage could not save the imported records; no visible records were changed.');
      const verifiedWorkspace=loadOfflineWorkspace(signedOwner);
      if(JSON.stringify(verifiedWorkspace?.working?.financial_accounts)!==JSON.stringify(nextAccounts)
        ||JSON.stringify(verifiedWorkspace?.working?.transactions)!==JSON.stringify(nextTransactions))
        throw new Error('This device could not save the imported records. Free storage and retry.');
      // Render exactly what storage confirmed; all derived Home/Wallet/Menu/Transactions
      // selectors read these states on the same React commit.
      if(viaCloud)showDeviceCopyAndSync(signedOwner);
      else{
        setLocalAccounts(verifiedWorkspace.working.financial_accounts);
        setRawTxs(verifiedWorkspace.working.transactions);
      }
      return withExtras();
    }
    const accountsOk = saveLocalAccounts(nextAccounts);
    const transactionsOk = accountsOk && saveLocalTransactions(nextTransactions, false);
    if (!accountsOk || !transactionsOk) {
      // Best-effort rollback; never update the live UI with partially saved data.
      const accountsReverted = saveLocalAccounts(beforeAccounts);
      const transactionsReverted = saveLocalTransactions(beforeTransactions, false);
      if (!accountsReverted || !transactionsReverted) {
        throw new Error('Storage failed and recovery could not be verified. Do not import again until you export and inspect existing local records.');
      }
      throw new Error('This device could not save the imported records. Free storage and retry.');
    }
    if(JSON.stringify(loadLocalAccounts())!==JSON.stringify(nextAccounts)
      ||JSON.stringify(loadLocalTransactions())!==JSON.stringify(nextTransactions))
      throw new Error('This device could not save the imported records. Free storage and retry.');
    setLocalAccounts(loadLocalAccounts());
    setRawTxs(loadLocalTransactions());
    return withExtras();
  };

  const refreshFx = useCallback(async (force = false) => { const next = await refreshRates(fx, force); if (next) setFx(next); return next || fx; }, [fx]);

  const c = {
    refreshFinance: () => (session?.user && prefs.cloudSyncEnabled !== false ? refreshCloud(session.user) : Promise.resolve()),
    recordCardPayment, rawTxs, subscriptionPlan,
    entitlement, entitlementReady, refreshEntitlement, can, plan, openPlans: () => setSheet({ name: 'planOffer' }), startAccount, openGuide: () => setGuideOpen(true), openBackup: () => setSheet({ name: 'financeBackup' }),
    setCloudSyncEnabled,
    syncState,
    deviceCopyAccess,
    // "Sync now": retries the upload without changing the Cloud Sync choice (a failed try never switches it off).
    retrySync: () => (prefs.cloudSyncEnabled === false ? setCloudSyncEnabled(true) : syncNow()),
    saveFinanceBackupRecords,
    onFinanceBackupSaved: (result) => {
      // Restore views from the same verified local snapshot without reloading
      // or switching on cloud mode. Reset stale filters hiding imported rows.
      if (!((result?.accounts || 0) + (result?.transactions || 0) + (result?.other?.added || 0) > 0)) return;
      setSheet(null);
      setSearch(''); setTxFilter('All'); setWalletFilter('All');
      setMonth(''); setHomeMonthKey('');
      go('Home');
      notify(tr('Local records saved on this device.'));
    },
    openCsvImporter: file => {
      setCsvRows([]); setCsvErrors([]); setCsvImportSummary(''); setCsvFileName(''); setImportAccountId(''); setCsvConfirmAction('');
      setSheet({ name: 'importCsv' });
      if (file) handleCsvFile(file);
    },
    accountQrDisplay,
    fx,
    refreshFx,
    show, setShow, prefs, setPref, stats, deltas, txs, transactionBalances, accountsView, accountsByType, recordCreditSpend, refDate, homeRefDate, homeMonthKey: activeHomeMonth, setHomeMonthKey, homeYears, user, unread, go, goBack, session, cloudMode, supabaseConfigured,
    breakdown: homeBreakdown, recent, homeMonthStats: homeStats, openTx, notify, sheet, setSheet, signOutNow, exportCsv, openLegal, legalReturnView, notificationsEnabled: prefs.notifications && prefs.inapp, demoAlertsAvailable: false,
    walletFilter, setWalletFilter, selectedCard, setSelectedCardId, openForm, openGrocery, openTransferTo, openEditAccount,
    txFilter, setTxFilter, month: activeMonth, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, expanded, setExpanded, search, setSearch, openSearch: () => setSearchOpen(true),
    notifications, readIds: prefs.readIds, nFilter, setNFilter, markAllRead, openNotification, activeNotification, query, setQuery,
    sceneryPhoto, setSceneryPhoto,
    toBase, base, lang, country: prefs.country, openCountry: () => setSheet({ name: 'country' }), openLanguage: () => setSheet({ name: 'language' }), openCurrency: () => setSheet({ name: 'currency' }),
    planTab, budgetList, spendingLimitList, plans, openBudgets: (tab = 'budgets') => setSheet({ name: 'budgets', tab }),
    subscriptions, subSummary, subsBadge, saveSubscription, deleteSubscription, logSubscription, archive: prefs.archive || [], archivedAutomations, loadArchivedAutomations, restoreArchived, deleteArchived, emptyArchive, briefing: can('insights') ? briefing : null, openBriefing: () => setSheet({ name: can('insights') ? 'briefing' : 'planOffer', feature: 'insights' }), openScanner: () => setSheet({ name: can('receiptScan') ? 'scanner' : 'planOffer', feature: 'receiptScan' }), openAutoLog: () => { if (!can('automation')) { setSheet({ name: 'planOffer', feature: 'automation' }); return; } if (!prefs.autoLogKey) setPref('autoLogKey', newKey()); setSheet({ name: 'autolog' }); },
  };
  c.txBreakdown = txBreakdown;
  const txScreen = { ...c, breakdown: txBreakdown };

  /* ---------- theme ---------- */
  const resolved = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme === 'dark' ? 'dark' : 'light';
  const tint = ['blue', 'purple', 'orange'].includes(prefs.theme) ? prefs.theme : '';
  const accentName = prefs.accent === 'custom' ? 'custom' : prefs.accent;
  const clarity = Math.min(100, Math.max(0, Number(prefs.clarity) || 0)) / 100; const dark = resolved === 'dark';
  const glassVars = prefs.glass ? { '--glass-blur': `${Math.round(34 - 30 * clarity)}px`, '--glass-fill': (dark ? 0.6 - 0.48 * clarity : 0.78 - 0.64 * clarity).toFixed(2), '--glass-sheet-fill': (dark ? 0.92 - 0.4 * clarity : 0.94 - 0.42 * clarity).toFixed(2), '--glass-edge': (0.16 + 0.18 * clarity).toFixed(2) } : {};
  const scenery = scenerySrc(prefs.scenery === 'photo' && !can('styleUploads') ? '' : prefs.scenery, sceneryPhoto);
  const accentHex = accentName === 'custom' ? prefs.customColor : (ACCENTS.find(([n]) => n === accentName)?.[1] || '#086b3a');
  /* Text: size scales every font-size through --font-scale (see lib/fontPrefs.js); the style swaps the font stack. */
  const fontScale = fontScaleOf(prefs.fontSize);
  const fontStack = fontStyleOf(prefs.fontStyle).stack;
  useEffect(() => {
    if (fontScale !== 1) enableFontScaling();
    loadFontStyle(prefs.fontStyle);
    const root = document.documentElement.style;
    root.setProperty('--font-scale', String(fontScale));
    root.setProperty('--app-font', fontStack);
  }, [fontScale, fontStack, prefs.fontStyle]);
  const rootStyle = { ...glassVars, colorScheme: resolved, '--accent-ink': readableAccent(accentHex, resolved === 'dark'), '--on-accent': contrastTextForAccent(accentHex), ...(scenery ? { '--scenery-veil': veilFor(prefs.sceneryVisibility) } : {}), ...(accentName === 'custom' ? { '--accent': prefs.customColor, '--accent-rgb': hexToRgb(prefs.customColor) } : {}) };
  // Bottom navigation accent (owner, 2026-11-11): Pro+ shows platinum and Pro gold by default; Settings → Appearance
  // can switch it back to the app accent. Only a server-verified paid plan counts; the free month keeps the app accent.
  const navTier = prefs.navAccent !== 'app' && entitlement?.source !== 'trial' ? ({ pro_plus: 'platinum', pro: 'gold' }[subscriptionPlan] || '') : '';
  const rootClass = `movo-app plan-${plan}${navTier ? ` nav-tier-${navTier}` : ''} theme-${resolved}${tint ? ` tint-${tint}` : ''} accent-${accentName}${prefs.glass ? ' glass-on' : ''}${prefs.compact ? ' compact' : ''}${prefs.categoryColors ? '' : ' no-category-colors'}${scenery ? ' has-scenery' : ''} layout-${layout.mode}${layout.dual ? ' layout-dual' : ''}`;
  const activeTab = ROOT_FOR[view];
  const navIdx = NAV.findIndex(n => n[2] === activeTab);
  if (navIdx !== 2 && navIdx >= 0) lastTab.current = navIdx;
  const pillIdx = lastTab.current;

  if (!authReady) return <div className={rootClass} style={rootStyle}><div className="loading-screen"><span className="brand-mark">m</span><p>{tr('Preparing your secure MOVO space…')}</p></div></div>;
  const detailTx = sheet?.name === 'tx' ? txs.find(t => t.id === sheet.id) : null;
  const formAccounts = accountsView.filter(a => !a.is_archived);
  const rawIds = new Set(rawTxs.map(t => t.id));
  const removeLoyaltyCard = id => {
    setPref('membershipCards', visibleLoyaltyCards(prefs).filter(card => card.id !== id));
    const nextRules = { ...(prefs.loyaltyRewardRules || {}) };
    delete nextRules[id];
    setPref('loyaltyRewardRules', nextRules);
    setSheet(null);
    notify(tr('Membership or rewards removed.'));
  };
  const accountChoice = sheet?.name === 'cardDetails' ? accountsView.find(a => a.id === sheet.id) || selectedCard : null;

  const screen = (() => {
    switch (view) {
      case 'Wallet': return <Wallet c={c} />;
      case 'FinancialPlanning': return <FinancialPlanning c={c} />;
      case 'Cashback': return <Cashback c={c} />;
      case 'ScheduledTransactions': return can('automation') ? <ScheduledTransactions c={c} /> : <div className="card pad"><h2>Scheduled automation · Pro+</h2><p>Pro+ unlocks scheduled logging and device automations.</p><button type="button" className="primary-button" onClick={c.openPlans}>View plans</button></div>;
      case 'ExchangeRates': return <ExchangeRates c={c} />;
      case 'CryptoMarket': return <CryptoMarket c={c} />;
      case 'StocksMarket': return <StocksMarket c={c} />;
      case 'Archive': return <Archive c={c} />;
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
      case 'NasrinAI': return <NasrinAIChat session={session} cloudMode={cloudMode || deviceCopyAccess} onOpenLegal={openLegal} onSignIn={() => go('Sign in')} onLog={can('fullAI') ? logFromChat : undefined} onUndoLog={undoChatLog} onViewLog={openTx} onLocalAnswer={localAnswer} shortcuts={chatShortcuts} show={show} />;
      case 'Sign in': return <AuthPanel key={authMode} initialMode={authMode} onOpenLegal={openLegal} onAuthenticated={() => { go('Home'); }} onContinueLocally={() => { go('Home'); notify(tr('Continuing in local-only mode.')); }} />;
      default: return <Home c={c} />;
    }
  })();

  return <PlanProvider entitlement={entitlement} cloudMode={safeCloudAccess} onUpgrade={feature => setSheet({ name: 'planOffer', feature })}><ConfirmProvider value={confirm}><div className={rootClass} style={rootStyle} dir={lang.dir} lang={lang.code}>
    {scenery && <div className="scenery" aria-hidden="true" style={{ backgroundImage: `url("${scenery}")` }} />}
    <div className="app-shell">
      <main className={`screen enter-${motion}${scrolled ? ' is-scrolled' : ''}`} key={view}>
        {localPersistenceWarning && <div className="app-alert storage-warning" role="alert">
          <span><strong>{cloudMode && pendingLocalDataRef.current ? tr('Local-only records were not saved before cloud sign-in.') : tr('Local changes may not be saved.')}</strong> {cloudMode && pendingLocalDataRef.current ? tr('These records are separate from your cloud account. Retry to preserve a local copy on this device; this does not sync them to the cloud.') : tr('Browser storage is unavailable or full. Important records may not survive a reload. Export a copy if possible, free browser storage, then retry. Local records stay on this device and are not cloud-synced.')}</span>
          <button type="button" className="retry-save" onClick={retryLocalPersistence}>{tr('Retry save')}</button>
        </div>}
        {error && !sheet && <div className="app-alert" role="alert">{error}<button type="button" aria-label={tr('Dismiss error')} onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        {screen}
        {can('automation') && setupDone && <ScheduledDuePrompt showBalance={show} session={session} accountsView={accountsView} subscriptions={subscriptions} cardStyles={prefs.accountStyles || {}} cardPayments={prefs.creditCardPayments || {}} onSubscriptionLog={logSubscription} onCreditCardLog={logCreditCardPayment} onLogged={() => session?.user ? refreshCloud(session.user) : Promise.resolve()} />}
      </main>

      <div className={`bottom-fade${view === 'NasrinAI' ? ' chat' : ''}`} aria-hidden="true" />
      {navTier && <svg className="nav-tier-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>
          {/* Fills for the active bottom-nav icon in the plan colour (owner, 2026-11-11): the icon itself turns
              platinum or gold; the sliding highlight keeps its usual look. One set per theme for contrast. */}
          {[['plat-dark', ['#f6f7f9', '#f1d3e2', '#cdeef2', '#f3e7c8', '#ddd6f1', '#eceff2']], ['plat-light', ['#5f6c79', '#9a6f8a', '#3f8a98', '#8e7b4c', '#6f6a97', '#4c5a68']],
            ['gold-dark', ['#fbe39a', '#f0c766', '#d39b2e', '#f6d47e']], ['gold-light', ['#c99a35', '#a87618', '#8a5f10', '#b98a2a']]].map(([id, stops]) =>
            <linearGradient key={id} id={`movo-nav-${id}`} x1="0" y1="0" x2="1" y2="1">{stops.map((c, i) => <stop key={i} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={c} />)}</linearGradient>)}
        </defs></svg>}
      {layout.mode === 'phone' ? <nav className={`bottom-nav${setupDone ? '' : ' is-locked'}`} aria-label={tr('Main navigation')} aria-disabled={setupDone ? undefined : 'true'}>
        <span className={`nav-pill${activeTab === 'NasrinAI' ? ' hidden' : ''}`} aria-hidden="true" style={{ '--idx': pillIdx }} />
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          // Instant feedback on touch-down (owner, 2026-11-12): the highlight starts sliding before the screen renders.
          const pressNav = (e) => { if (center || e.button > 0) return; const pill = e.currentTarget.parentElement?.querySelector('.nav-pill'); const idx = NAV.findIndex(n => n[2] === target); if (pill && idx >= 0) { pill.style.setProperty('--idx', String(idx)); pill.classList.remove('hidden'); } };
          return <button type="button" key={label} className={`nav-item${center ? ' nav-center' : ''}${active ? ' nav-active' : ''}`} disabled={!setupDone} onPointerDown={pressNav} onClick={() => go(target)} aria-current={active ? 'page' : undefined} aria-label={label} title={tr(label)}>
            <span className="nav-icon">{center ? <span className="orb"><NasrinMark size={27} /></span> : <Icon name={icon} size={29} strokeWidth={1.8} filled={active} />}</span>
            {target === 'Home' && unread && <i className="nav-badge" aria-label={tr('New activity')} />}
          </button>;
        })}
      </nav> : <nav className={`side-nav${setupDone ? '' : ' is-locked'}`} aria-label={tr('Main navigation')} aria-disabled={setupDone ? undefined : 'true'}>
        <span className="side-brand"><MovoMark size={30} /><span>Movo</span></span>
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          return <button type="button" key={label} className={`side-item${active ? ' active' : ''}`} disabled={!setupDone} onClick={() => go(target)} aria-current={active ? 'page' : undefined} title={tr(label)}>
            <span className="side-icon">{center ? <NasrinMark size={20} /> : <Icon name={icon} size={22} strokeWidth={1.8} filled={active} />}{target === 'Home' && unread && <i className="nav-badge" aria-label={tr('New activity')} />}</span>
            <span className="side-label">{tr(label)}</span>
          </button>;
        })}
        <span className="side-spacer" />
        <button type="button" className="side-item side-add" disabled={!setupDone} onClick={() => openForm('expense')} title={tr('Add transaction')}><span className="side-icon"><Icon name="plus" size={22} strokeWidth={2} /></span><span className="side-label">{tr('Add transaction')}</span></button>
        <button type="button" className={`side-item${view === 'Settings' ? ' active' : ''}`} disabled={!setupDone} onClick={() => go('Settings')} title={tr('Settings')}><span className="side-icon"><Icon name="gearSolid" size={22} /></span><span className="side-label">{tr('Settings')}</span></button>
      </nav>}

      {sheet?.name === 'grocery' && <GrocerySheet currency={base} accounts={accountsView} showBalance={show} draft={prefs.groceryDraft} onSaveDraft={saveGroceryDraft} onLogExpense={logGroceryExpense} onClose={() => setSheet(null)} />}
      {sheet?.name === 'transaction' && <TransactionSheet autoCategory={prefs.autocat !== false} currency={formAccounts.find(a => a.id === form.account_id)?.currency || base} form={form} setForm={setForm} editing={!!sheet.id} showBalance={show} accounts={formAccounts} cloudMode={cloudMode} busy={busy} error={error} onSave={saveTransaction} onClose={() => { setSheet(null); setError(''); }} onScan={sheet.id ? undefined : c.openScanner} />}
      {sheet?.name === 'scanner' && can('receiptScan') && <ScannerSheet show={show} onClose={() => setSheet(null)} onLog={(f) => {
        const type = f.type === 'income' ? 'income' : 'expense';
        // Pick the account the slip names: same last 4 digits first, then the same bank or wallet.
        const live = accountsView.filter(a => !a.is_archived); const bank = String(f.bank || '').toLowerCase();
        const acct = (f.last4 && live.find(a => a.mask === f.last4)) || (bank && live.find(a => [a.institution_name, a.name].some(n => String(n || '').toLowerCase() === bank)));
        const dup = findDuplicate({ merchant: f.merchant, amount: f.amount, type, ref: f.ref, date: f.occurred_at ? `${f.occurred_at}T${f.time || '12:00:00'}` : new Date() }, rawTxs);
        setError(dup ? `${dupText(dup)} ${tr('Save again to log it anyway.')}` : '');
        setForm(cur => ({ ...cur, transaction_type: type, merchant: f.merchant, amount: f.amount, category: f.category, occurred_at: f.occurred_at || today(), time: f.time || '', note: f.note, source: '', ref: f.ref || '', payment_reference:'', receipt_note:'', receipt_path:'', receipt_path_to_delete:'', receipt_file:null, ...(acct ? { account_id: acct.id } : {}) }));
        setSheet({ name: 'transaction', type });
      }} />}

      {sheet?.name === 'loyalty' && <LoyaltySheet
        key={sheet.id || sheet.type}
        existing={visibleLoyaltyCards(prefs).find(card => card.id === sheet.id)}
        initialType={isLoyaltyType(sheet.type) ? sheet.type : 'membership'}
        onClose={() => setSheet(null)}
        onSave={entry => {
          const safe = normalizeLoyaltyCard(entry);
          const cards = visibleLoyaltyCards(prefs);
          const id = safe.id || window.crypto?.randomUUID?.();
          if (!id) { notify(tr('Could not create a secure identifier. Please try again.')); return; }
          const record = { ...safe, id };
          const existed = cards.some(card => card.id === id);
          setPref('membershipCards', existed ? cards.map(card => card.id === id ? record : card) : [...cards, record]);
          // An edit made from the card's details returns there, like other cards.
          setSheet(existed ? { name: 'loyaltyDetails', id } : null);
          notify(tr('Membership or rewards saved.'));
        }}
        onRemove={removeLoyaltyCard}
      />}
      {sheet?.name === 'loyaltyDetails' && (() => {
        // Memberships, loyalty, rewards and custom cards open the same Account details layout as other cards.
        const card = visibleLoyaltyCards(prefs).find(item => item.id === sheet.id);
        if (!card) return null;
        return <LoyaltyDetailsSheet
          key={card.id}
          card={card} transactions={txs} accounts={accountsView} rules={prefs.loyaltyRewardRules || {}} show={show}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ name: 'loyalty', id: card.id, type: card.type })}
          onRemove={removeLoyaltyCard}
          onOpenAccount={id => { setSelectedCardId(id); setSheet({ name: 'cardDetails', id }); }}
          onOpenTransaction={item => openTx(item)}
          onOpenRewards={() => { setSheet(null); go('Cashback'); }}
        />;
      })()}

      {sheet?.name === 'account' && <AccountSheet base={base} country={prefs.country || 'PH'} qrCode={prefs.accountQrCodes?.[sheet?.id] || ''} qrCodeDisplay={accountQrDisplay[sheet?.id] || ''} accounts={accountsView} form={accountForm} setForm={setAccountForm} editing={!!sheet.id} cloudMode={cloudMode} busy={busy} error={error} onSave={saveAccount} onSelectLoyalty={type => { setAccountForm(BLANK_ACCOUNT); setSheet({ name: 'loyalty', type }); }} onAddBank={sheet.id ? undefined : () => { setError(''); setAccountForm({ ...BLANK_ACCOUNT, account_type: 'bank' }); setSheet({ name: 'account', type: 'bank' }); }} onClose={() => { setSheet(null); setError(''); setAccountForm(BLANK_ACCOUNT); }} />}

      {sheet?.name === 'actions' && <Sheet title={tr('Quick actions')} onClose={() => setSheet(null)}>
        <div className="sheet-menu">
          <button type="button" onClick={() => openForm('expense')}><Icon name="plus" size={20} />{tr('Add transaction')}</button>
          <button type="button" onClick={() => setSheet({ name: 'grocery' })}><Icon name="shopping-basket" size={20} />{tr('Add grocery items')}</button>
          <button type="button" onClick={() => setSheet({ name: can('receiptScan') ? 'scanner' : 'planOffer', feature: 'receiptScan' })}><Icon name="scan" size={20} />{tr('Scan receipt')}</button>
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
      {(sheet?.name === 'planOffer' || (authReady && prefs.onboarded && !prefs.planWelcomeSeen && !sheet && !locked && !SETUP_READING.has(view) && !guideOpen)) && <PlanOffer session={session} entitlement={entitlement} currency={base} cloudMode={safeCloudAccess} onOpenCloudSettings={() => { setPref('planWelcomeSeen', true); setSheet(null); go('Settings'); }} feature={sheet?.feature} onRefresh={refreshEntitlement} onOpenTerms={() => { setPref('planWelcomeSeen', true); setSheet(null); openLegal('TermsOfService'); }} onClose={() => { setPref('planWelcomeSeen', true); setSheet(null); }} onSignIn={() => { setPref('planWelcomeSeen', true); setSheet(null); startAccount('signin'); }} onPlans={() => { setPref('planWelcomeSeen', true); setSheet({ name: 'planUsage' }); }} />}
      {sheet?.name === 'financeBackup' && <FinanceBackupSheet c={c} onClose={() => setSheet(null)} />}
      {sheet?.name === 'planUsage' && <UsageSheet c={c} onClose={() => setSheet(null)} />}
      {/* First run: the video guide, then (skipped or finished) the spotlight walkthrough, then the free month of Pro. */}
      {showTour && !locked && !prefs.tutorialSeen && <TutorialVideo onDone={() => setPref('tutorialSeen', true)} />}
      {showTour && !locked && prefs.tutorialSeen && <Walkthrough onDone={finishTour} onAccount={startAccount} onImport={importDataFile} />}
      {guideOpen && !locked && <TutorialVideo onDone={() => setGuideOpen(false)} />}
      {cloudPlanNotice && setupDone && !locked && !sheet && prefs.cloudPlanNoticeDay !== todayKey && <CloudPlanNotice
        onPlans={() => { setCloudPlanNotice(false); setPref('cloudPlanNoticeDay', todayKey); setSheet({ name: 'planOffer', feature: 'cloudWrite' }); }}
        onClose={() => { setCloudPlanNotice(false); setPref('cloudPlanNoticeDay', todayKey); }} />}
      {/* Last setup step, after the free-month panel above: accept the Terms and Privacy Policy, then the dashboard
          opens. Reading either one returns here. */}
      {setupGateOn && authReady && !locked && prefs.onboarded && prefs.planWelcomeSeen && !legalAccepted && !SETUP_READING.has(view) && <SetupAgreement onOpenLegal={openLegal}
        onAccept={() => { setPrefs(cur => ({ ...cur, legalAccepted: LEGAL_VERSION, legalAcceptedAt: new Date().toISOString() })); go('Home'); }} />}
      {locked && <LockScreen account={session?.user} onUnlock={unlock} onForgot={() => confirm({
        // Only offered for guest or legacy locks with no account to verify. Email recovery does not erase data.
        // Erases every MOVO record on this device, so the person types DELETE first.
        title: tr('Reset MOVO on this device?'), icon: 'trash', danger: true, verify: 'DELETE', confirmLabel: tr('Reset'),
        message: tr('This removes the lock and all MOVO data stored here. Data saved to your account returns after you sign in.'),
        detail: tr('This cannot be undone.'),
        action: () => {
          const wipe = (store) => { try { Object.keys(store).filter(k => k.startsWith('movo.')).forEach(k => store.removeItem(k)); } catch { /* storage unavailable */ } };
          wipe(localStorage); wipe(sessionStorage); signOut().catch(() => {}).finally(() => window.location.reload());
        },
      })} />}
      {sheet?.name === 'briefing' && can('insights') && <BriefingSheet briefing={briefing} show={show} name={user.firstName} onClose={() => { setPref('briefingDay', todayKey); setSheet(null); }} onAsk={() => { setPref('briefingDay', todayKey); setSheet(null); go('NasrinAI'); }} />}
      {sheet?.name === 'budgets' && <BudgetsSheet initialTab={sheet.tab} progress={budgetList} plans={plans} show={show} cloudMode={cloudMode} onSaveBudget={saveBudget} onDeleteBudget={deleteBudget} onSavePlan={savePlan} onDeletePlan={deletePlan} onOpenLimits={() => setSheet({ name: 'spendingLimits' })} onClose={() => setSheet(null)} />}
      {sheet?.name === 'spendingLimits' && <SpendingLimitsSheet limits={spendingLimitList} accounts={accountsView} show={show} onSave={saveSpendingLimit} onDelete={deleteSpendingLimit} onClose={() => setSheet({ name: 'budgets', tab: 'budgets' })} />}


      {sheet?.name === 'importCsv' && <Sheet title={tr('Import transactions')} subtitle={tr('CSV is previewed here. Nothing changes until you confirm a local-only save.')} onClose={() => setSheet(null)} label={tr('Import transactions')}>
        <div className="sheet-form">
          <div className="movo-import-file-row">
            <label htmlFor="movo-csv-file" className="movo-file-upload-button"><Icon name="upload" size={17} /> {tr('Upload file')}</label>
            <input id="movo-csv-file" className="movo-native-file-input" type="file" accept=".csv,text/csv" onChange={e => { const file = e.target.files?.[0]; if (file) handleCsvFile(file); e.target.value = ''; }} />
            <small className="movo-file-status">{csvFileName || tr('No file selected')}</small>
          </div>
          <p className="form-note">{tr('Required columns: Date, Description, Type, Amount. Optional: Currency, Category, Account, To Account, Note. Review the preview before importing.')}</p>

          {formAccounts.length > 0 && <label>{tr('Default account (used when the CSV account name does not match)')}<select value={importAccountId} onChange={e => setImportAccountId(e.target.value)}><option value="">{tr('Choose account')}</option><AccountOptions accounts={formAccounts} /></select></label>}
          {csvRows.length > 0 && <section className="card pad" aria-label={tr('CSV import preview')}><strong>{tr('Preview · {n} valid row(s)', { n: csvRows.length })}</strong>{csvRows.slice(0, 5).map((row, i) => <div className="detail-row" key={`${row.occurred_at}-${row.merchant}-${i}`}><span className="menu-main"><strong>{row.merchant}</strong><small>{tr(row.transaction_type[0].toUpperCase() + row.transaction_type.slice(1))} · {tr(row.category)} · {row.account_name || tr('default account')}</small></span><b>{money(row.amount, row.currency)}</b></div>)}{csvRows.length > 5 && <p className="form-note">{tr('Showing the first 5 rows. All valid rows will be processed.')}</p>}</section>}
          {csvImportSummary && <p className="form-note" role="status">{csvImportSummary}</p>}
          {csvErrors.length > 0 && <div className="form-error" role="alert"><strong>{tr('Rows needing attention')}</strong><ul>{csvErrors.slice(0, 8).map((item, i) => <li key={`${item.line}-${i}`}>{tr('Row {line}: {message}', { line: item.line, message: tr(item.message, item.vars) })}</li>)}</ul>{csvErrors.length > 8 && <p>{tr('And {n} more row(s).', { n: csvErrors.length - 8 })}</p>}</div>}
          {cloudMode && <p className="form-note" role="note">Cloud Sync is on. Saved rows appear on this device right away and upload to your MOVO account automatically, now or when you are back online. Existing records are never changed.</p>}
          <div className="sheet-actions">
            <button type="button" className="secondary-button" onClick={() => setCsvConfirmAction('discard')} disabled={busy || (!csvRows.length && !csvFileName)}>{tr('Discard records')}</button>
            <button type="button" className="primary-button" onClick={() => setCsvConfirmAction('save')} disabled={busy || !csvRows.length}>{busy ? tr('Saving records…') : tr('Save records')}</button>
          </div>
          {csvConfirmAction && <section className="movo-backup-confirm" role="alertdialog" aria-label={csvConfirmAction === 'save' ? 'Confirm local CSV import' : 'Confirm CSV discard'} aria-modal="false">
            <strong>{csvConfirmAction === 'save' ? 'Save these transactions to this device?' : 'Discard the uploaded CSV preview?'}</strong>
            <p>{csvConfirmAction === 'save'
              ? (cloudMode
                ? 'MOVO will save valid non-duplicate transactions on this device, recalculate Home, Wallet and Transactions, and upload them to your MOVO account automatically. Existing records are never changed.'
                : 'MOVO will add valid non-duplicate transactions to local storage. Home, Wallet and Transactions will recalculate. Cloud records stay unchanged.')
              : 'No financial transactions or accounts will be deleted. Only this uploaded preview will be cleared.'}</p>
            <div className="sheet-actions">
              <button type="button" className="secondary-button" disabled={busy} onClick={() => setCsvConfirmAction('')}>Keep preview</button>
              <button type="button" className={csvConfirmAction === 'save' ? 'primary-button' : 'secondary-button'} disabled={busy} onClick={csvConfirmAction === 'save' ? confirmCsvImport : discardCsvPreview}>{csvConfirmAction === 'save' ? 'Confirm save locally' : 'Confirm discard'}</button>
            </div>
          </section>}

        </div>
      </Sheet>}
      {sheet?.name === 'deleteAccount' && <Sheet title={tr('Delete your account?')} subtitle={tr('Permanently deletes your MOVO account and everything in it: transactions, accounts, budgets, bills, plans, automations and NasrinAI chats, plus MOVO data on this device. This cannot be undone.')} onClose={() => { setSheet(null); setClearText(''); }} label={tr('Delete Account')}>
        <p className="form-hint">{tr('Subscriptions are billed and managed by Apple or Google. Cancel in your store account to stop renewal.')}</p>
        <p className="form-hint">{tr('You can request account deletion in MOVO or at movo.nasrinai.com/account-deletion.html. Deleting your MOVO account does not automatically cancel a subscription billed by Apple or Google; cancel it in your store account to stop renewal.')}</p>
        <form className="sheet-form" onSubmit={e => { e.preventDefault(); deleteAccount(); }}>
          <label>{tr('Type DELETE to confirm')}<input aria-label={tr('Type DELETE to confirm')} autoComplete="off" value={clearText} onChange={e => setClearText(e.target.value)} placeholder={tr('DELETE')} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setClearText(''); }}>{tr('Cancel')}</button><button type="submit" className="danger-button" disabled={busy || clearText.trim().toUpperCase() !== 'DELETE'}>{busy ? tr('Deleting…') : tr('Delete my account')}</button></div>
        </form>
      </Sheet>}
      {sheet?.name === 'clear' && <Sheet title={tr('Clear all data?')} subtitle={cloudMode ? tr('Permanently deletes everything in your MOVO account (transactions, accounts, budgets and NasrinAI chats) and all MOVO data on this device. Your sign-in stays.') : tr('Permanently deletes all MOVO data on this device: transactions, accounts, budgets, plans, scans, mascot, card styles and preferences.')} onClose={() => { setSheet(null); setClearText(''); }} label={tr('Clear all data')}>
        <form className="sheet-form" onSubmit={e => { e.preventDefault(); clearAll(); }}>
          <p className="form-note">{tr('Export a CSV first if you want a copy. This cannot be undone.')}</p>
          <label>{tr('Type DELETE to confirm')}<input aria-label={tr('Type DELETE to confirm')} autoComplete="off" value={clearText} onChange={e => setClearText(e.target.value)} placeholder={tr('DELETE')} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setClearText(''); }}>{tr('Cancel')}</button><button type="submit" className="danger-button" disabled={busy || clearText.trim().toUpperCase() !== 'DELETE'}>{busy ? tr('Deleting…') : tr('Clear all data')}</button></div>
        </form>
      </Sheet>}

      {accountChoice && <AccountDetailsSheet
        account={accountChoice}
        accounts={accountsView}
        transactions={txs}
        transactionBalances={transactionBalances}
        showBalanceAfterTransaction={prefs.showBalanceAfterTransaction !== false}
        prefs={prefs}
        subscriptions={subscriptions}
        plans={plans}
        cloudMode={cloudMode}
        toBase={toBase}
        show={show}
        holder={user?.name}
        base={base}
        qrCodeDisplay={accountQrDisplay[accountChoice.id] || ''}
        canEdit={cloudMode || localAccounts.some(account => account.id === accountChoice.id)}
        onClose={() => setSheet(null)}
        onEdit={() => openEditAccount(accountChoice)}
        onArchive={() => archiveAccount(accountChoice)}
        onAddTransaction={() => openForm('expense', accountChoice.id)}
        onOpenTransaction={item => setSheet({ name: 'tx', id: item.id })}
        onOpenAccount={id => { setSelectedCardId(id); setSheet({ name: 'cardDetails', id }); }}
      />}

      {detailTx && <Sheet title="" center onClose={() => setSheet(null)} label={tr('Transaction details')} className="tx-detail-sheet">
        {/* Transaction details (owner, 2026-11-12): a solid, centered pop-up. The name and amount lead, signed by type,
            with its type as a chip; one card holds the rest, including when it was spent and when it was logged. */}
        <div className={`tx-detail-hero type-${detailTx.type}`}>
          <h2 className="tx-detail-name">{detailTx.merchant}</h2>
          <strong className="tx-detail-amount">{detailTx.type === 'expense' ? '−' : detailTx.type === 'income' ? '+' : ''}{shown(show, money(detailTx.origAmount, detailTx.origCurrency))}</strong>
          {detailTx.origCurrency !== base && <small className="fx-note">≈ {shown(show, money(detailTx.amount, base))}</small>}
          <span className="tx-detail-chips"><span className="tx-detail-chip">{tr(detailTx.type[0].toUpperCase() + detailTx.type.slice(1))}</span></span>
        </div>
        <dl className="tx-detail-list">
          <div><dt>{tr('Account')}</dt><dd>{detailTx.accountName}</dd></div>
          <div><dt>{tr('Category')}</dt><dd>{tr(detailTx.category || 'Other')}{detailTx.subcategory ? ` · ${tr(detailTx.subcategory)}` : ''}</dd></div>
          {/* Two times (owner, 2026-11-12): when the money moved, and when the record was logged in MOVO. */}
          <div><dt>{tr(detailTx.type === 'income' ? 'Received' : detailTx.type === 'transfer' ? 'Transferred' : 'Spent')}</dt><dd>{longDate(detailTx.date)}, {timeLabelFull(detailTx.date)}</dd></div>
          {Number.isFinite(Date.parse(detailTx.created_at)) && <div><dt>{tr('Logged')}</dt><dd>{longDate(detailTx.created_at)}, {timeLabelFull(detailTx.created_at)}</dd></div>}
          {detailTx.note && <div className="wide"><dt>{tr('Note')}</dt><dd>{detailTx.note}</dd></div>}
          {refOf(detailTx) && <div><dt>{tr('Reference ID')}</dt><dd className="ref-id">{refOf(detailTx)}</dd></div>}
          {detailTx.payment_reference && <div><dt>{tr('Payment reference')}</dt><dd className="ref-id">{detailTx.payment_reference}</dd></div>}
          {detailTx.receipt_note && <div className="wide"><dt>{tr('Receipt note')}</dt><dd>{detailTx.receipt_note}</dd></div>}
        </dl>
        {detailTx.receipt_path && <button type="button" className="tx-detail-receipt" onClick={async()=>{const popup=window.open('about:blank','_blank');try{if(detailTx.receipt_path.startsWith('localreceipt:')){const file=await getLocalAttachment(detailTx.receipt_path);if(!file)throw new Error('missing');const url=URL.createObjectURL(file);if(popup)popup.location.href=url;else window.location.assign(url);setTimeout(()=>URL.revokeObjectURL(url),60000);return;}const {data,error}=await supabase.storage.from('movo-receipts').createSignedUrl(detailTx.receipt_path,60);if(error)throw error;if(popup)popup.location.href=data.signedUrl;else window.location.assign(data.signedUrl);}catch{popup?.close();notify(tr('Could not open this receipt. Check your connection and sign-in.'));}}}><Icon name="receipt" size={18} /><span>{tr('View receipt')}</span><Icon name="chevron" size={16} /></button>}
        {detailTx.source === 'allocation_event'
          ? detailTx.can_reverse && <div className="sheet-actions tx-detail-actions"><button type="button" className="danger-button" aria-label={tr('Reverse')} onClick={() => removeTransaction(detailTx)}><Icon name="undo-2" size={16} /> {tr('Reverse')}</button></div>
          : detailTx.source !== 'accounting_event' && <div className="sheet-actions tx-detail-actions"><button type="button" className="secondary-button" onClick={() => openEditTransaction(detailTx)}><Icon name="edit" size={16} /> {tr('Edit')}</button><button type="button" className="danger-button" aria-label={tr('Delete {name}', { name: detailTx.merchant })} onClick={() => removeTransaction(detailTx)}><Icon name="trash" size={16} /> {tr('Delete')}</button></div>}
      </Sheet>}

      {pendingLog && <div className="log-prompt" role="alertdialog" aria-label={tr('Log this payment?')}>
        <span className="log-prompt-icon"><Icon name="card" size={18} /></span>
        <span className="menu-main"><strong>{tr(pendingLog.source)}: {shown(show, money(pendingLog.amount))}</strong><small>{pendingLog.merchant}{pendingLog.trusted ? '' : ` · ${tr('from a link, please confirm')}`}</small></span>
        <button type="button" className="secondary-button" onClick={() => setPendingLog(null)} aria-label={tr('Dismiss payment')}>{tr('Skip')}</button>
        <button type="button" className="primary-button" onClick={reviewPending}>{tr('Log')}</button>
      </div>}
      {sheet?.name === 'autolog' && can('automation') && <AutoLogSheet showBalance={show} prefs={prefs} setPref={setPref} status={automationStatus} accounts={formAccounts} cloudMode={cloudMode} notify={notify} onClose={() => setSheet(null)} onResetKey={async () => {
        const oldKey = prefs.autoLogKey;
        const replacement = newKey();
        // Persist the replacement BEFORE revoking the old automation device.
        if (isNativeApp()) {
          try { await saveNativeAutomationKey(replacement); }
          catch { notify(tr('Could not save. Please try again.')); return; }
        }
        if (oldKey) {
          try {
            const response = await fetch(apiUrl('/api/log'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oldKey },
              body: JSON.stringify({ action: 'revoke' }),
            });
            if (!response.ok) throw new Error('revoke_failed');
          } catch {
            if (isNativeApp()) {
              try { await saveNativeAutomationKey(oldKey); }
              catch {
                setAutomationStatus('error');
                notify(tr('Could not register this device'));
                return;
              }
            }
            notify(tr('Could not revoke the old key. No key was changed; try again.'));
            return;
          }
        }
        setPrefs(cur => ({ ...cur, autoLogKey: replacement }));
        setAutomationStatus('registering');
        notify(tr('New device key created. Keep this screen open to register it, then update your Shortcut.'));
      }} />}
      {sheet?.name === 'recentLogs' && <RecentLogsSheet transactionBalances={transactionBalances} showBalanceAfterTransaction={prefs.showBalanceAfterTransaction !== false} logs={txs.filter(t => rawIds.has(t.id) && logStamp(t) > sheet.since)} failed={inbox} accounts={formAccounts} show={show} refDate={refDate} onOpen={openTx} onLog={logInboxItem} onDismiss={dismissInboxItem} onClose={closeRecentLogs} />}
      {searchOpen && <SearchOverlay txs={txs} show={show} refDate={refDate} onOpen={openTx} onClose={() => setSearchOpen(false)} />}
      <LoggedBurst id={burst?.id} label={burst?.label} badge={burst?.badge} onDone={endBurst} />
      {restoredConnection && !!session?.user?.id && !cloudMode && prefs.cloudSyncEnabled !== false && (prefs.autoSyncOnReconnect !== true || autoSyncFailed) && !reconnectDeferred && (
        <ReconnectSyncPrompt busy={busy} count={unsyncedChangeCount(loadOfflineWorkspace(session.user.id))}
          onSync={(always) => { if (always) setPref('autoSyncOnReconnect', true); syncNow(); }}
          onLater={(always) => { if (always) setPref('autoSyncOnReconnect', true); setReconnectDeferred(true); }} />
      )}
      {restoredConnection && !!session?.user?.id && !cloudMode && prefs.cloudSyncEnabled !== false && reconnectDeferred && (
        <div className="movo-sync-restored" role="status" aria-live="polite">
          <span className="movo-sync-restored-icon" aria-hidden="true">↗</span>
          <div className="movo-sync-restored-message">
            <strong>{tr('Your internet connection has been restored')}</strong>
            <span>{tr('Offline records are ready to sync.')}</span>
          </div>
          <button type="button" className="movo-sync-restored-action" onClick={syncNow} disabled={busy}>{tr('Sync local to cloud')}</button>
          <button type="button" className="movo-sync-restored-dismiss" aria-label={tr('Close')} onClick={()=>setRestoredConnection(false)}>×</button>
        </div>
      )}
      {confirmDialog}
      {toast && <div className={`toast${busy ? ' raised' : ''}${view === 'NasrinAI' ? ' over-composer' : ''}`} role="status" aria-live="polite">{toast}</div>}
      {busy && <div className="sync-indicator" role="status"><span className="spinner" /> {tr('Syncing securely…')}</div>}
    </div>
  </div></ConfirmProvider></PlanProvider>;
}
export default App;


