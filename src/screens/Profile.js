import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader, SectionTitle, Trend, Sheet } from '../components/ui';
import { money, shown } from '../lib/format';
import { ThemePicker } from './Settings';
import { t as tr } from '../lib/i18n';
import { maskEmail } from '../lib/emailPrivacy';
import { revokeOtherSessions } from '../lib/financeRepository';
import PlanBadge from '../components/PlanBadge';
import { QRCodeSVG } from 'qrcode.react';
import { totalBalance } from '../lib/totalBalance';


export default function Profile({ c }) {
  const { show, stats, deltas, user, accountsByType, go, session, signOutNow, exportCsv } = c;
  const [revokingOtherSessions, setRevokingOtherSessions] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const revokeOtherDevices = async () => {
    if (revokingOtherSessions || !window.confirm(tr('Sign out of other devices?'))) return;
    setRevokingOtherSessions(true);
    try {
      await revokeOtherSessions();
      c.notify(tr('Other devices will need to sign in again after their current session expires.'));
    } catch {
      c.notify(tr('Could not revoke other sessions. Please try again.'));
    } finally {
      setRevokingOtherSessions(false);
    }
  };

  // Each row follows the Total Balance rules (lib/totalBalance.js): open accounts only, a debit card linked to its bank
  // counted once (through the bank), card payments that moved no money left out. The ro¶»§q«^