// MOVO financial copilot prompts are kept separate from UI copy so they can be
// tested as request payloads without being treated as translatable interface labels.
export const MOVO_PLACEHOLDER_EXAMPLES = [
  'Ask NasrinAI to… “check expenses”',
  'Ask NasrinAI about “money flow”',
  'Ask NasrinAI for trends',
  'Ask NasrinAI for forecasting',
  'Ask NasrinAI for average expenses',
  'Ask NasrinAI anything about your money…'
];

export const MOVO_FINANCIAL_SUGGESTIONS = [
  { label: 'Briefing', prompt: 'Give me a financial briefing based on my recent MOVO income, spending, balances, and budgets.' },
  {
    label: 'Daily, Weekly, Monthly Trends',
    prompt: 'Analyze my actual MOVO transaction history and compare income, expenses, and net cash flow by day, week, and month. Use only available records, state the date ranges and totals clearly, and explain when there is insufficient historical data to identify a reliable trend. Do not estimate or invent transactions or figures.'
  },
  { label: 'Summarize my recent spending', prompt: 'Summarize my recent spending.' },
  { label: 'Which categories cost me the most?', prompt: 'Which spending categories cost me the most?' }
];
