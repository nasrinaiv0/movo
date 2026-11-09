'use strict';
// The legacy RPC is disabled by the integrity migration. All writes require a fenced lease.
module.exports = { persistStoreEntitlement: async () => { throw new Error('use_fenced_iap_commit'); } };
