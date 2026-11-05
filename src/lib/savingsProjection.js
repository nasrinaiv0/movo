const PERIODS = { monthly: 12, quarterly: 4, annually: 1 };

export function estimateSavingsGrowth(principal, monthlyContribution, annualRatePercent, months, compounding = 'monthly') {
  const start = Math.max(0, Number(principal) || 0);
  const contribution = Math.max(0, Number(monthlyContribution) || 0);
  const rate = Math.min(100, Math.max(0, Number(annualRatePercent) || 0)) / 100;
  const count = Math.max(0, Math.min(600, Math.floor(Number(months) || 0)));
  const periods = PERIODS[compounding] || PERIODS.monthly;
  const periodMonths = 12 / periods;
  const periodRate = rate / periods;
  let balance = start;
  for (let month = 1; month <= count; month += 1) {
    balance += contribution;
    if (month % periodMonths === 0) balance *= 1 + periodRate;
    else if (month === count) balance *= Math.pow(1 + periodRate, (month % periodMonths) / periodMonths);
  }
  const totalContributions = start + contribution * count;
  return { projectedBalance: balance, interestEarned: Math.max(0, balance - totalContributions), totalContributions, months: count };
}

export { PERIODS as SAVINGS_COMPOUNDING };
