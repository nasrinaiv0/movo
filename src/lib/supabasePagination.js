/**
 * Fetch every owner-visible row. Incomplete pages fail closed to prevent incorrect
 * financial summaries. Call queryFactory afresh per page with stable sorting.
 */
export async function fetchAllRows(queryFactory, { pageSize = 500 } = {}) {
  if (typeof queryFactory !== 'function') throw new TypeError('A query factory is required.');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new RangeError('Invalid page size.');
  const result = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Invalid ledger page received.');
    result.push(...data);
    if (data.length < pageSize) return result;
    if (offset > Number.MAX_SAFE_INTEGER - pageSize) throw new Error('Ledger is too large to page safely.');
  }
}
