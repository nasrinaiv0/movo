/**
 * Read all currently rendered cloud finance views without mistaking a failed
 * query for an empty table. This is NOT an atomic multi-table DB snapshot and
 * does not certify full-device offline coverage.
 */
const REQUIRED_READS = [
  'accountsTransactions', 'postings', 'activities', 'inbox',
  'bills', 'billOccurrences', 'budgets',
];
export async function readRequiredFinancialCloudViews(readers) {
  const entries = await Promise.all(REQUIRED_READS.map(async name => {
    const read = readers?.[name];
    if (typeof read !== 'function')
      throw new Error('Required cloud finance reader unavailable: ' + name);
    let result;
    try { result = await read(); }
    catch { throw new Error('Cloud finance read failed (' + name + '). Existing offline records were preserved.'); }
    if (name === 'accountsTransactions') {
      if (!result || !Array.isArray(result.financial_accounts) || !Array.isArray(result.transactions))
        throw new Error('Cloud returned an incomplete accounts/transactions snapshot.');
    } else if (!Array.isArray(result)) {
      throw new Error('Cloud returned an incomplete financial view: ' + name);
    }
    return [name, result];
  }));
  return Object.fromEntries(entries);
}
