import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountOptions } from './components/AccountPicker';
import { flushSync } from 'react-dom';
import './App.css';
import AuthPanel from './components/AuthPanel';
import Icon, { NasrinMark } from './components/Icon';
import { Sheet } from './components/ui';
import Home from './screens/Home';
import Wallet from './screens/Wallet';
import FinancialPlanning from './screens/FinancialPlanning';
import Cashback from './screens/Cashback';
import ScheduledTransactions from './screens/ScheduledTransactions';
import ScheduledDuePrompt from './components/ScheduledDuePrompt';
import ExchangeRates from './screens/ExchangeRates';
import CryptoMarket from './screens/CryptoMarket';
import StocksMarket from './screens/StocksMarket';
import Transactions from './screens/Transactions';
import Profile, { EditProfile } from './screens/Profile';
import Menu from './screens/Menu';
import Subscriptions from './screens/Subscriptions';
import { BriefingSheet } from './components/Briefing';
import Walkthrough from './components/Walkthrough';
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
import { summarize as summarizeSubscriptions, billingDate, subscriptionPaymentAccountId, rev...[truncated], e_wallet: accountsView.filter(a => a.account_type === 'e_wallet') }), [accountsView]);
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
    const total = Object.values(totals).reduc...[truncated]  if (!name) { setError(tr('Enter an account name.')); return; }
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
      if (cloudMode && session?.user) {
        if (editingId) {
          const a = await updateAccount(editingId, { name, account_type: accountForm.account_type, institution_name: accountForm.institution_name, opening_balance: openingBalance });
          setCloudAccounts(cur => cur.map(item => item.id === editingId ? a : item)); saveStyle(editingId); if (isAccountQrDataUrl(accountForm.qrCode)) await saveQrCode(editingId); else saveQrCode(editingId);
          const nextLinks = { ...(prefs.cardBankLinks || {}) }; if (linkedBankId) nextLinks[editingId] = ...[truncated]    } catch (restoreError) {
            await deleteTransaction(row.id).catch(() => {});
            throw restoreError;
          }
          const restoredPrefs = await loadPreferences(session.user.id).catch(() => null);
          if (restoredPrefs?.prefs) setPrefs(cur => ({ ...cur, ...restoredPrefs.prefs, archive: cur.archive }));
          setRawTxs(cur => [row, ...cur]);
          await refreshCloud(session.user);
        } else {
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
      setArchivedAutomations([]); setPrefs(p => ({ ...p, archive: [] }));...[truncated]ull); setClearText(''); }} label={tr('Delete Account')}>
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
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setClearText(''); }}>{tr('Cancel')}</button><button type="submit" className="danger-b...[truncated]