import React from 'react';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import { cardNetworkLogoUrl, institutionLogoCandidates } from '../lib/institutions';

/** Approved Google favicon/official-site logos only; never infer a domain from arbitrary account text. */
export default function AccountBrandMark({ account, size = 44 }) {
  const issuer = String(account?.institution_name || account?.name || '');
  const candidates = institutionLogoCandidates(issuer, { size: 128 });
  const network = account?.cardNetwork || account?.brand || '';
  const networkFallback = account?.account_type === 'card' ? cardNetworkLogoUrl(network, 64) : '';
  const sources = [...candidates, networkFallback].filter(Boolean);
  return <span className="wallet-brand-mark" style={{ '--wallet-brand-mark-size': size + 'px' }} aria-hidden="true">
    <BrandLogo
      src={sources[0]}
      fallbackSrcs={sources.slice(1)}
      size={Math.round(size * .73)}
      className="wallet-brand-mark-image"
      fallback={<Icon name={account?.account_type === 'card' ? 'card' : account?.account_type === 'e_wallet' ? 'wallet' : 'bank'} size={22} />}
    />
  </span>;
}
