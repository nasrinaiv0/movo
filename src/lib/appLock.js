/*
 * App lock for this device. The passcode is never stored: only a random salt and a PBKDF2-SHA256 hash
 * (210,000 iterations). Face ID / Touch ID uses the device's platform authenticator through WebAuthn with user
 * verification required. This keeps MOVO closed to casual access on a shared or unlocked phone; it does not
 * encrypt stored records. Lock settings stay on this device (they are not part of preference sync).
 */
const KEY = 'movo.lock.v1';
const ITERATIONS = 210000;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); return true; } catch { return false; } };

export const lockState = () => { const s = read(); return { enabled: !!s?.hash, biometric: !!s?.bioId, length: s?.len || 6 }; };
export const validPasscode = (pin) => /^\d{4,6}$/.test(String(pin || ''));

async function derive(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256));
}

export async function setPasscode(pin) {
  if (!validPasscode(pin)) throw new Error('Use 4 to 6 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prev = read();
  return write({ salt: b64(salt), hash: await derive(pin, salt), len: String(pin).length, bioId: prev?.bioId || '' });
}

export async function verifyPasscode(pin) {
  const s = read(); if (!s?.hash || !validPasscode(pin)) return false;
  const got = await derive(pin, unb64(s.salt));
  let diff = got.length ^ s.hash.length; // constant-time compare
  for (let i = 0; i < Math.max(got.length, s.hash.length); i += 1) diff |= (got.charCodeAt(i) || 0) ^ (s.hash.charCodeAt(i) || 0);
  return diff === 0;
}

export const removeLock = () => write(null);

export async function biometricAvailable() {
  try { return !!(window.PublicKeyCredential && await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}

export async function enableBiometric() {
  const s = read(); if (!s?.hash) throw new Error('Set a passcode first.');
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Movo' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'movo-app-lock', displayName: 'Movo app lock' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000, attestation: 'none',
  } });
  if (!cred) throw new Error('Face ID / Touch ID was not set up.');
  return write({ ...s, bioId: b64(cred.rawId) });
}

export const disableBiometric = () => { const s = read(); return s ? write({ ...s, bioId: '' }) : true; };

export async function unlockWithBiometric() {
  const s = read(); if (!s?.bioId) return false;
  try {
    const got = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(s.bioId) }],
      userVerification: 'required', timeout: 60000,
    } });
    return !!got;
  } catch { return false; }
}
