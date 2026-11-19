import { readOfflineEntitlement, saveOfflineEntitlement } from './offlineEntitlement';
import { CLOUD_READ_TIMEOUT_MS, withTimeout } from './networkFailure';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoreEntitlements, isNativePurchasePlatform, syncStorePurchases } from './nativePurchases';

export function usePlanEntitlement(session) {
  const [state, setState] = useState(null);
  const [checkedOwner, setCheckedOwner] = useState(null);
  const checkedRef = useRef(null); // read inside refresh without making refresh change identity
  const owner = useRef(session?.user?.id);
  owner.current = session?.user?.id;
  // Stable refresh identity keeps App’s auth listener alive during owner recovery.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const pending = useRef(null);
  const cacheWrite = useRef(Promise.resolve());
  const refresh = useCallback(async () => {
    const session = sessionRef.current;
    const id = session?.user?.id;
    if (!id || !session?.access_token) { checkedRef.current = null; setCheckedOwner(null); return null; }
    // Share concurrent startup/resume checks only for this exact session.
    let request = pending.current;
    if (!request || request.id !== id || request.token !== session.access_token) {
      request = { id, token: session.access_token, promise: withTimeout(Promise.resolve().then(() => getStoreEntitlements(session)), CLOUD_READ_TIMEOUT_MS) };
      pending.current = request;
    }
    try {
      const value = await request.promise;
      if (owner.current === id && sessionRef.current?.access_token === request.token) {
        setState({ ...value, owner: id }); checkedRef.current = id; setCheckedOwner(id);
        // Serialize responses so an older persistence operation cannot replace newer status.
        cacheWrite.current = cacheWrite.current.catch(() => {}).then(() => saveOfflineEntitlement(id, value)).catch(() => {});
      }
      return value;
    } catch {
      // A temporary network failure must not erase the last verified expiry.
      // effectivePlan will still expire it locally; an unknown new session remains unverified.
      if (owner.current === id && checkedRef.current !== id) {
        const cached = await readOfflineEntitlement(id).catch(() => null);
        if (owner.current === id && checkedRef.current !== id) {
          setState(cached);
          if (cached) { checkedRef.current = id; setCheckedOwner(id); }
        }
      }
      return null;
    } finally {
      if (pending.current === request) pending.current = null;
    }
  }, []);
  useEffect(() => {
    let live = true;
    const id = session?.user?.id;
    if (id) readOfflineEntitlement(id).then(cached => {
      if (live && owner.current === id && checkedRef.current !== id && cached) {
        setState(cached); checkedRef.current = id; setCheckedOwner(id);
      }
    }).catch(() => {});
    refresh();
    if (session?.access_token && isNativePurchasePlatform()) syncStorePurchases(session).then(refresh).catch(() => {});
    const timer = setInterval(refresh, 60000);
    const resume = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', refresh);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', refresh); };
  }, [refresh, session?.user?.id, session?.access_token]);
  useEffect(() => {
    const expiry = Date.parse(state?.expiresAt);
    if (!(expiry > Date.now())) return undefined;
    let timer;
    const schedule = () => {
      const remaining = expiry - Date.now();
      if (remaining <= 0) { setState(null); refresh(); return; }
      timer = setTimeout(schedule, Math.min(remaining + 10, 2147483647));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [state?.expiresAt, refresh]);
  return { entitlement: state?.owner === session?.user?.id ? state : null, refreshEntitlement: refresh, entitlementReady: !!session?.user?.id && checkedOwner === session.user.id };
}
