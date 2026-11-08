import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoreEntitlements, isNativePurchasePlatform, syncStorePurchases } from './nativePurchases';

export function usePlanEntitlement(session) {
  const [state, setState] = useState(null);
  const [checkedOwner, setCheckedOwner] = useState(null);
  const checkedRef = useRef(null); // read inside refresh without making refresh change identity
  const owner = useRef(session?.user?.id);
  owner.current = session?.user?.id;
  const refresh = useCallback(async () => {
    const id = session?.user?.id;
    if (!id || !session?.access_token) { checkedRef.current = null; setCheckedOwner(null); return null; }
    try {
      const value = await getStoreEntitlements(session);
      if (owner.current === id) { setState({ ...value, owner: id }); checkedRef.current = id; setCheckedOwner(id); }
      return value;
    } catch {
      // A temporary network failure must not erase the last verified expiry.
      // effectivePlan will still expire it locally; an unknown new session remains unverified.
      if (owner.current === id && checkedRef.current !== id) setState(null);
      return null;
    }
  }, [session?.user?.id, session?.access_token]);
  useEffect(() => {
    refresh();
    if (session?.access_token && isNativePurchasePlatform()) syncStorePurchases(session).then(refresh).catch(() => {});
    const timer = setInterval(refresh, 60000);
    const resume = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', resume);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, [refresh, session?.access_token]);
  useEffect(() => {
    const delay = Date.parse(state?.expiresAt) - Date.now();
    if (!(delay > 0)) return undefined;
    const timer = setTimeout(() => { setState(null); refresh(); }, Math.min(delay + 10, 2147483647));
    return () => clearTimeout(timer);
  }, [state?.expiresAt, refresh]);
  return { entitlement: state?.owner === session?.user?.id ? state : null, refreshEntitlement: refresh, entitlementReady: !!session?.user?.id && checkedOwner === session.user.id };
}
