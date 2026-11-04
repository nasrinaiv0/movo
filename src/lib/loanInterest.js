/**
 * Validate and normalize a per-month loan interest schedule.
 * Rates are percentages for the individual month (not annualized).
 */
export function buildMonthlyInterestSchedule(enabled, monthCount, rates) {
  if (enabled !== true) return [];
  const months = Number(monthCount);
  if (!Number.isInteger(months) || months < 1 || months > 600) {
    throw new Error('Loan interest schedule must contain between 1 and 600 months.');
  }
  if (!Array.isArray(rates) || rates.length !== months) {
    throw new Error('Enter an interest rate for every month.');
  }
  return rates.map((value, index) => {
    const rate = Number(value);
    if (value === '' || value == null || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new Error(`Enter a valid interest rate from 0 to 100 for month ${index + 1}.`);
    }
    return { month: index + 1, rate: Math.round(rate * 1000) / 1000 };
  });
}
