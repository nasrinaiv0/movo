import { readRequiredFinancialCloudViews } from './cloudFinancialReadGate';

const complete = () => ({
  accountsTransactions: jest.fn(async () => ({financial_accounts:[],transactions:[]})),
  postings: jest.fn(async () => []),
  activities: jest.fn(async () => []),
  inbox: jest.fn(async () => []),
  bills: jest.fn(async () => []),
  billOccurrences: jest.fn(async () => []),
  budgets: jest.fn(async () => []),
});

test('requires every financial view and returns complete independently read data', async () => {
  const readers=complete();
  const views=await readRequiredFinancialCloudViews(readers);
  expect(views.accountsTransactions).toEqual({financial_accounts:[],transactions:[]});
  expect(Object.keys(views)).toHaveLength(7);
  Object.values(readers).forEach(read=>expect(read).toHaveBeenCalledTimes(1));
});
test.each(['accountsTransactions','postings','activities','inbox','bills','billOccurrences','budgets'])(
  'fails closed without replacing failed %s query with empty rows', async group => {
    const readers=complete();readers[group].mockRejectedValue(new Error('unauthorized'));
    await expect(readRequiredFinancialCloudViews(readers)).rejects.toThrow('Cloud finance read failed ('+group+')');
  }
);
test.each(['postings','activities','inbox','bills','billOccurrences','budgets'])(
  'rejects malformed %s response',async group => {
    const readers=complete();readers[group].mockResolvedValue(null);
    await expect(readRequiredFinancialCloudViews(readers)).rejects.toThrow('incomplete financial view');
  }
);
test('rejects missing accounts or transaction collection as partial snapshot',async()=>{
  const readers=complete();readers.accountsTransactions.mockResolvedValue({financial_accounts:[]});
  await expect(readRequiredFinancialCloudViews(readers)).rejects.toThrow('incomplete accounts/transactions');
});
