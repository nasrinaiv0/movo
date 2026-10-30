import { dayKey, monthKey } from './format';

/*
 * Answers common money questions instantly from the records on this device, without NasrinAI:
 * "How much did I spend today?", "Magkano gastos ko ngayong linggo?", "Top category this month", "My balance",
 * "Food budget left", "Upcoming renewals", "Last transaction". Returns null when it cannot answer, so the question
 * can go to NasrinAI instead. Nothing here leaves the device.
 */
const CATEGORY_NAMES = ['Food & drinks', 'Groceries', 'Transport', 'Bills', 'Shopping', 'Subscriptions', 'Health', 'Entertainment', 'Education', 'Housing', 'Travel'];
const has = (re, s) => re.test(s);
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

export function periodOf(text, now = new Date()) {
  const t = text.toLowerCase();
  const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); const k = dayKey(d); return { label: offset ? 'Yesterday' : 'Today', test: (x) => dayKey(x) === k }; };
  if (has(/\b(yesterday|kahapon)\b/, t)) return day(-1);
  if (has(/\b(today|ngayong araw|ngayon araw|kanina)\b/, t)) return day(0);
  if (has(/\b(last week|nakaraang linggo)\b/, t)) { const s = startOfWeek(now); const a = new Date(s); a.setDate(a.getDate() - 7); return { label: 'Last week', test: (x) => new Date(x) >= a && new Date(x) < s }; }
  if (has(/\b(this week|ngayong linggo|week)\b/, t)) { const s = startOfWeek(now); return { label: 'This week', test: (x) => new Date(x) >= s }; }
  if (has(/\b(last month|nakaraang buwan)\b/, t)) { const d = new Date(now.getFullYear(), now.getMonth() - 1, 15); const k = monthKey(d); return { label: 'Last month', test: (x) => monthKey(x) === k }; }
  if (has(/\b(this year|ngayong taon|year)\b/, t)) { const y = now.getFullYear(); return { label: 'This year', test: (x) => new Date(x).getFullYear() === y }; }
  const k = monthKey(now); return { label: 'This month', test: (x) => monthKey(x) === k };
}

export function answerLocally(text, { txs = [], accounts = [], budgets = [], upcoming = [], fmt = (n) => String(n), now = new Date() } = {}) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return null;
  const period = periodOf(t, now);
  const inPeriod = txs.filter(x => period.test(x.date));
  const cats = [...new Set([...CATEGORY_NAMES, ...txs.map(x => x.category)].filter(Boolean))];
  const cat = cats.find(c => t.includes(c.toLowerCase()) || (c === 'Food & drinks' && /\b(food|pagkain|kain)\b/.test(t)) || (c === 'Transport' && /\b(transport|pamasahe|commute)\b/.test(t)));
  const merchant = !cat && [...new Set(txs.map(x => x.merchant))].find(m => m && m.length > 2 && t.includes(m.toLowerCase()));
  const sum = (list, type) => list.filter(x => x.type === type).reduce((s, x) => s + x.amount, 0);
  const P = period.label;

  if (has(/\b(balance|how much do i have|pera ko|natitira|total money)\b/, t)) {
    const open = accounts.filter(a => !a.is_archived);
    if (!open.length) return 'You have no accounts yet. Add one in Wallet to see your balance.';
    const total = open.reduce((s, a) => s + (Number(a.baseBalance ?? a.balance) || 0), 0);
    return [`**Total balance: ${fmt(total)}**`, ...open.slice(0, 6).map(a => `- ${a.name}: ${fmt(Number(a.baseBalance ?? a.balance) || 0)}`)].join('\n');
  }
  if (has(/\b(budget|limit|badyet)\b/, t)) {
    const list = cat ? budgets.filter(b => b.category === cat) : budgets;
    if (!list.length) return cat ? `There is no monthly limit for ${cat} yet.` : 'You have no monthly limits yet. Add one in Menu → Limits.';
    return list.map(b => `- **${b.category}**: ${fmt(b.spent)} of ${fmt(b.monthly_limit)} used (${b.percent}%), ${b.left >= 0 ? `${fmt(b.left)} left` : `${fmt(-b.left)} over`}`).join('\n');
  }
  if (has(/\b(renew\w*|subscription\w*|bills due|due)\b/, t)) {
    if (!upcoming.length) return 'No subscription renewals are coming up.';
    return ['**Upcoming renewals**', ...upcoming.slice(0, 5).map(s => `- ${s.name}: ${fmt(Number(s.amount) || 0)} on ${s.next}`)].join('\n');
  }
  if (has(/\b(last|latest|recent|huli|pinakabago)\b.*\b(transaction|expense|purchase|record|gastos|bili)\b|\blast (one|thing)\b/, t)) {
    const last = txs[0]; if (!last) return 'You have no records yet.';
    return `Your latest record: **${last.merchant}**, ${last.type === 'income' ? '+' : '−'}${fmt(last.amount)} (${last.category}) on ${new Date(last.date).toLocaleString()}.`;
  }
  if (has(/\b(most|top|biggest|largest|pinakamalaki|pinakamarami)\b/, t)) {
    const by = {}; inPeriod.filter(x => x.type === 'expense').forEach(x => { by[x.category] = (by[x.category] || 0) + x.amount; });
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!top.length) return `No spending recorded for ${P.toLowerCase()} yet.`;
    return [`**${P}, most spending went to:**`, ...top.map(([c, v], i) => `${i + 1}. ${c}: ${fmt(v)}`)].join('\n');
  }
  const asksIncome = has(/\b(earn|earned|income|salary|kita|kinita|sahod|sweldo)\b/, t);
  const asksSpend = has(/\b(spend|spent|spending|expense|expenses|gastos|gumastos|nagastos)\b/, t) || (!asksIncome && has(/\b(magkano|how much)\b/, t));
  const asksSummary = has(/\b(summary|summarize|summarise|overview|buod|recap|report)\b/, t);
  if (!(asksIncome || asksSpend || asksSummary || cat || merchant)) return null;
  let list = inPeriod;
  if (cat) list = list.filter(x => x.category === cat);
  if (merchant) list = list.filter(x => x.merchant === merchant);
  const what = cat || merchant || '';
  if (!list.length) return `No ${what ? `${what} ` : ''}records for ${P.toLowerCase()} yet.`;
  if (asksIncome && !asksSpend) return `**${P}${what ? ` · ${what}` : ''}**: you earned ${fmt(sum(list, 'income'))} across ${list.filter(x => x.type === 'income').length} record(s).`;
  if (asksSummary || (!asksSpend && !asksIncome)) {
    const spent = sum(list, 'expense'); const earned = sum(list, 'income');
    return `**${P}${what ? ` · ${what}` : ''}**: spent ${fmt(spent)}, earned ${fmt(earned)}, net ${fmt(earned - spent)} across ${list.length} record(s).`;
  }
  const spentList = list.filter(x => x.type === 'expense');
  const lines = [`**${P}${what ? ` · ${what}` : ''}: you spent ${fmt(sum(list, 'expense'))}** across ${spentList.length} record(s).`];
  if (spentList.length && spentList.length <= 5) spentList.forEach(x => lines.push(`- ${x.merchant}: ${fmt(x.amount)}`));
  return lines.join('\n');
}
