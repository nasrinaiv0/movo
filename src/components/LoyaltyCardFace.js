import React, { memo, useState } from 'react';
import Icon from './Icon';
import { loyaltyCardStyle, loyaltyLogoUrl, loyaltyTypeLabel } from '../lib/loyaltyBranding';
import { maskedMembershipNumber, safeLoyaltyPoints } from '../lib/loyaltyCards';
import './LoyaltySheet.css';

export default memo(function LoyaltyCardFace({ card, show = true, estimate = 0 }) {
  const [brokenLogo, setBrokenLogo] = useState(false);
  const palette = loyaltyCardStyle(card.name);
  const logo = loyaltyLogoUrl(card.name);
  const unit = card.pointsUnit || (card.type === 'tokens' ? 'tokens' : 'points');
  const label = loyaltyTypeLabel(card);
  const value = show ? safeLoyaltyPoints(card.points).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '••••';
  return <span className="loyalty-card-face" style={{ '--lc-bg': palette.bg, '--lc-ink': palette.ink, '--lc-trim': palette.trim }}>
    <span className="loyalty-card-header">
      <span className="loyalty-card-identity">
        <span className="loyalty-card-logo">
          {logo && !brokenLogo
            ? <img src={logo} width="36" height="36" loading="lazy" decoding="async" referrerPolicy="no-referrer" alt="" onError={() => setBrokenLogo(true)} />
            : <Icon name={card.type === 'tokens' ? 'star' : 'gift'} size={22} />}
        </span>
        <strong className="loyalty-card-merchant">{card.name}</strong>
      </span>
      <span className="loyalty-card-category">{label}</span>
    </span>
    <span className="loyalty-card-details">
      <span className="loyalty-card-program">{card.program && card.program !== card.name ? card.program : label}</span>
      <span className="loyalty-card-mask">{card.memberNumber ? maskedMembershipNumber(card.memberNumber) : '••••'}</span>
    </span>
    <span className="loyalty-card-footer">
      <span className="loyalty-card-points"><strong>{value}</strong><small>{unit}</small></span>
      {!!estimate && <span className="loyalty-card-estimate">{show ? '+' + estimate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '••••'} est.</span>}
    </span>
  </span>;
});
