import React, { memo, useId, useMemo, useState } from 'react';
import Icon from './Icon';
import { loyaltyCardStyle, loyaltyLogoUrl, loyaltyTypeLabel } from '../lib/loyaltyBranding';
import { maskedMembershipNumber, safeLoyaltyPoints } from '../lib/loyaltyCards';
import { PATTERN_HEIGHT, PATTERN_WIDTH, cardPattern } from '../lib/cardPatterns';
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
  // Each card's own geometric pattern, the same everywhere the card appears.
  const pattern = useMemo(() => cardPattern(`${card.id || ''}|${card.name || ''}`, palette), [card.id, card.name, palette]);
  const shadow = `lcp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return <span className="loyalty-card-face" data-motif={palette.motif} data-title={palette.title || 'sans'}
    style={{ '--lc-bg': palette.bg, '--lc-ink': palette.ink, '--lc-trim': palette.trim, '--lc-accent': palette.accent }}>
    <span className="loyalty-card-motif" aria-hidden="true"><i /><i /><i /></span>
    <svg className="loyalty-card-pattern" data-pattern={pattern.family} viewBox={`0 0 ${PATTERN_WIDTH} ${PATTERN_HEIGHT}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <filter id={`${shadow}1`} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.28" /></filter>
        <filter id={`${shadow}2`} x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="11" stdDeviation="9" floodColor="#000" floodOpacity="0.38" /></filter>
      </defs>
      {pattern.shapes.map((shape, i) => {
        const look = { fill: shape.fill, fillOpacity: shape.opacity, filter: shape.depth ? `url(#${shadow}${shape.depth})` : undefined,
          ...(shape.depth === 2 ? { stroke: '#ffffff', strokeOpacity: 0.24, strokeWidth: 1.5 } : {}) };
        return shape.kind === 'circle' ? <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...look} /> : <polygon key={i} points={shape.points} {...look} />;
      })}
    </svg>
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
