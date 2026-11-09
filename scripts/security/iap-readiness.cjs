'use strict';
const { billingConfigurationIssues } = require('../../api/lib/billingReadiness');
const missing = billingConfigurationIssues();
if (missing.length) {
  console.error('Billing configuration incomplete: ' + missing.join(', '));
  process.exitCode = 1;
} else {
  console.log('Billing configuration structure passed. This does not verify credentials, database migration, store-console routing or real purchases.');
}
