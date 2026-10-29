const { buildFinancialContext, buildUpstreamBody, buildContextPayload, hasConfirmedMovoScope, extractReply, allowedOrigin, selectRelevantTransactions } = require('../../api/nasrinai/chat');

describe('MOVO NasrinAI chat isolation helpers', () => {
  test('builds a bounded financial context from only the supplied user-scoped rows', () => {
    const context = buildFinancialContext({
      accounts: [{ id: 'a1', name: 'Main', account_type: 'bank', currency: 'PHP', opening_balance: '1000', is_archived: false }],
      transactions: [{ account_id: 'a1', transaction_type: 'expense', amount: '120', currency: 'PHP', merchant: 'Groceries', category: 'Food', occurred_at: '2026-10-28T00:00:00Z', note: 'weekly' }],
      budgets: [{ category: 'Food', monthly_limit: '5000', currency: 'PHP', starts_on: '2026-10-01', is_active: true }]
    });
    expect(context.accounts[0].name).toBe('Main');
    expect(context.recent_transactions[0].account).toBe('Main');
    expect(context.recent_transactions[0].amount).toBe(120);
    expect(context.budgets[0].monthly_limit).toBe(5000);
    expect(JSON.stringify(context)).not.toContain('user_id');
  });

  test('retrieval prioritizes transactions matching the current question', () => {
    const rows = [
      { merchant: 'Groceries Market', category: 'Food', transaction_type: 'expense' },
      { merchant: 'Electricity Bill', category: 'Bills', transaction_type: 'expense' },
      { merchant: 'Coffee Shop', category: 'Food', transaction_type: 'expense' }
    ];
    expect(selectRelevantTransactions(rows, 'show groceries spending').map((row) => row.merchant)).toEqual(['Groceries Market']);
    expect(selectRelevantTransactions(rows, 'summarize my spending')).toHaveLength(3);
  });

  test('sends the actual question and bounded finance context through the isolated MOVO scope', () => {
    const context = { accounts: [{ name: 'Main' }], recent_transactions: [], budgets: [] };
    const body = buildUpstreamBody('Summarize my spending', context);
    expect(Object.keys(body)).toEqual(['message', 'context_scope', 'context']);
    expect(body.message).toBe('Summarize my spending');
    expect(body.context_scope).toBe('movo');
    expect(JSON.parse(body.context)).toEqual(context);
    expect(body).not.toHaveProperty('conversation_id');
    expect(body.message).not.toContain('global or personal memory');
    expect(buildContextPayload({
      accounts: Array.from({ length: 50 }, (_, i) => ({ name: 'Account ' + i, details: 'x'.repeat(250) })),
      recent_transactions: Array.from({ length: 40 }, (_, i) => ({ merchant: 'Transaction ' + i, note: 'x'.repeat(250) })),
      budgets: Array.from({ length: 50 }, (_, i) => ({ category: 'Category ' + i, note: 'x'.repeat(250) }))
    }).length).toBeLessThanOrEqual(3800);
  });

  test('fails closed unless the upstream explicitly confirms MOVO context scope', () => {
    expect(hasConfirmedMovoScope({ context_scope: 'movo' })).toBe(true);
    expect(hasConfirmedMovoScope({ data: { context_scope: 'movo' } })).toBe(true);
    expect(hasConfirmedMovoScope({ message: { content: 'answer' } })).toBe(false);
    expect(hasConfirmedMovoScope({ context_scope: 'default' })).toBe(false);
  });

  test('extracts only a bounded reply string', () => {
    expect(extractReply({ reply: '  Hello MOVO  ' })).toBe('Hello MOVO');
    expect(extractReply({ conversation_id: 'upstream-id', message: { content: 'Structured reply' } })).toBe('Structured reply');
    expect(extractReply({ reply: { text: 'not a string' } })).toBe('');
    expect(extractReply({ text: 'x'.repeat(13000) })).toHaveLength(12000);
  });

  test('rejects foreign production origins', () => {
    expect(allowedOrigin({ headers: { origin: 'https://evil.example' } })).toBe(false);
    expect(allowedOrigin({ headers: { origin: 'https://movo-lime.vercel.app' } })).toBe(true);
  });
});
