import React, { memo, useState } from 'react';
import Icon from './Icon';
import { loyaltyCardStyle, loyaltyLogoUrl, loyaltyTypeLabel } from '../lib/loyaltyBranding';
import { maskedMembershipNumber, safeLoyaltyPoints } from '../lib/loyaltyCards';
import { t as tr } from '../lib/i18n';
import './LoyaltySheet.css';

/*
 * A membership or rewards card laid out like the merchant cards people carry (owner references, 2026-11-09):
 * merchant mark and name on top, the program title large, then the member number and validity, and the rewards
 * balance at the bottom. The motif (rings, band, stripes, foil or split) is MOVO's own flat vector shape in the
 * merchant's colours; no merchant artwork is reproduced.
 */
export default memo(function LoyaltyCardFace({ card, show = true, estimate = 0 }) {
  const [brokenLogo, setBrokenLogo] = useState(false);
  const palette = loyaltyCardStyle(card.name);
  const logo = loyaltyLogoUrl(card.name);
  const unit = card.pointsUnit || (card.type === 'tokens' ? 'tokens' : 'points');
  const label = loyaltyTypeLabel(card);
  const value = show ? safeLoyaltyPoints(card.points).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '••••';
  // The person's own program name wins; otherwise the merchant's program title, otherwise the card type.
  const program = card.program && card.program !== card.name ? card.program : palette.program || label;
  return <span className="loyalty-card-face" data-motif={palette.motif} data-title={palette.title || 'sans'}
    style={{ '--lc-bg': palette.bg, '--lc-ink': palette.ink, '--lc-trim': palette.trim, '--lc-accent': palette.accent }}>
    <span className="loyalty-card-motif" aria-hidden="true"><i /><i /><i /></span>
    {/* Text stays on the left, as on the reference cards; the right side carries the motif. */}
    <span className="loyalty-card-header">
      <span className="loyalty-card-identity">
        <span className="loyalty-card-logo">
          {logo && !brokenLogo
            ? <img src={logo} width="36" height="36" loading="lazy" decoding="async" referrerPolicy="no-referrer" alt="" onError={() => setBrokenLogo(true)} />
            : <Icon name={card.type === 'tokens' ? 'star' : 'gift'} size={22} />}
        </span>
        <span className="loyalty-card-names">
          <strong className="loyalty-card-merchant">{card.name}</strong>
          <span className="loyalty-card-category">{label}</span>
        </span>
      </span>
    </span>
    <span className="loyalty-card-program">{program}</span>
    <span className="loyalty-card-details-row">
      <span className="loyalty-card-mask">{card.memberNumber ? maskedMembershipNumber(card.memberNumber) : '••••'}</span>
      {/* Valid-thru like a payment card, when the membership expires. */}
      {!card.noExpiry && /^\d{4}-\d{2}-\d{2}$/.test(card.expiryDate || '') && <span className="loyalty-card-expiry"><span className="loyalty-card-expiry-label">{tr('Valid thru')} </span>{card.expiryDate.slice(5, 7)}/{card.expiryDate.slice(2, 4)}</span>}
    </span>
    <span className="loyalty-card-footer">
      <span className="loyalty-card-points"><strong>{value}</strong><small>{unit}</small></span>
      {!!estimate && <span className="loyalty-card-estimate">{show ? '+' + estimate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '••••'} est.</span>}
    </span>
  </span>;
});
