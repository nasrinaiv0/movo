const EVENT = 'movo-ai-consent-changed';
const volatileConsent = new Map();
export const aiConsentKey = owner => `movo.ai.ack.v1.${owner}`;

export function readAIConsent(owner) {
  if (!owner) return false;
  if (volatileConsent.has(owner)) return volatileConsent.get(owner) === true;
  try { return localStorage.getItem(aiConsentKey(owner)) === '1'; }
  catch { return volatileConsent.get(owner) === true; }
}
export function setAIConsent(owner, accepted) {
  if (!owner) return;
  volatileConsent.delete(owner);
  try {
    if (accepted) localStorage.setItem(aiConsentKey(owner), '1');
    else localStorage.removeItem(aiConsentKey(owner));
  } catch { volatileConsent.set(owner, accepted === true); }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { owner, accepted: accepted === true } }));
}
export function watchAIConsent(owner, onChange) {
  const local = event => { if (event.detail?.owner === owner) onChange(event.detail.accepted === true); };
  const remote = event => {
    if (event.key === aiConsentKey(owner) || event.key === null) {
      volatileConsent.delete(owner);
      onChange(readAIConsent(owner));
    }
  };
  window.addEventListener(EVENT, local);
  window.addEventListener('storage', remote);
  return () => { window.removeEventListener(EVENT, local); window.removeEventListener('storage', remote); };
}
