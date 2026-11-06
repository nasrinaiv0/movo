/** MOVO stores fiat ledger amounts to two decimal places. Round each posting before summing. */
export function moneyCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return NaN;
  const [coefficient, exponent = '0'] = Math.abs(number).toString().split('e');
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  return Number.isSafeInteger(cents) ? Math.sign(number) * cents : NaN;
}

export const roundMoney = value => moneyCents(value) / 100;

export function sumMoney(values) {
  const cents = values.reduce((sum, value) => {
    const next = moneyCents(value);
    return Number.isFinite(next) ? sum + next : sum;
  }, 0);
  return Number.isSafeInteger(cents) ? cents / 100 : NaN;
}
