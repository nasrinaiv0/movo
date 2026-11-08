# PR #241 — consolidated with #250 (2026-11-09)

#241 and #246/#250 each built an owner-scoped offline workspace and cloud hand-off. Per the 2026-11-09 handover,
one state machine is kept: #250's (baseline + dirty journal + three-way reconnect, already on main).

Kept from #241:
- Masked emails in Profile and Edit Profile (`src/lib/emailPrivacy.js`, tests).
- `usePlanEntitlement`: a temporary network failure keeps the last verified entitlement (it still expires on its
  own date); `entitlementReady` reports whether this owner was checked. The checked owner is read from a ref so
  `refreshEntitlement` keeps a stable identity (no extra fetch or effect restarts after the first check).

Dropped (superseded by #250): #241's `App.js` workspace/expiry hand-off and `loadUserLocalWorkspace` /
`saveUserLocalWorkspace` in `localFinanceStore.js`, with their test.
