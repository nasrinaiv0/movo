import { CACHE_PREFIX, encryptFinancialCache, decryptFinancialCache } from './financeCacheCrypto';

const CACHE_NAME = 'verified-plan';
const key = owner => CACHE_PREFIX + owner + ':' + CACHE_NAME;

export async function saveOfflineEntitlement(owner, entitlement, now = Date.now()) {
  if (!owner) return;
  if (!entitlement?.active || !(Date.parse(entitlement.expiresAt) > now)) {
    localStorage.removeItem(key(owner));
    return;
  }
  const payload = { owner, verifiedAt: now, entitlement };
  const encrypted = await encryptFinancialCache(owner, CACHE_NAME, payload);
  localStorage.setItem(key(owner), encrypted);
}

export async function readOfflineEntitlement(owner, now = Date.now()) {
  if (!owner) return null;
  const raw = localStorage.getItem(key(owner));
  if (!raw) return null;
  const value = await decryptFinancialCache(owner, CACHE_NAME, JSON.parse(raw));
  if (value.owner !== owner || !Number.isFinite(value.verifiedAt) || value.verifiedAt > now ||
      value.entitlement?.active !== true || !['pro', 'pro_plus'].includes(value.entitlement.tier) ||
      !(Date.parse(value.entitlement.expiresAt) > now)) return null;
  // Keep only server response fields used by the interface. Never restore credentials.
  const { tier, active, expiresAt, source, trialEligible } = value.entitlement;
  return { tier, active, expiresAt, source, trialEligible, owner };
}
