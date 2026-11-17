import { money, setFormatLocale, dayKey, monthKey } from './format';
beforeEach(()=>setFormatLocale('en-PH'));
test('money retains cents and always displays two decimal digits, including compact callers',()=>{
 expect(money(5858,'PHP')).toContain('5,858.00');
 expect(money(5858.07,'PHP',0)).toContain('5,858.07');
 expect(money(1000000.99,'PHP')).toContain('1,000,000.99');
 expect(money(0.01,'PHP')).toContain('0.01');
 expect(money(120,'JPY')).toContain('120.00');
});

test('unavailable financial values never appear as zero',()=>{
 expect(money(NaN,'PHP')).toBe('— PHP');
 expect(money(Infinity,'USD')).toBe('— USD');
 expect(money(0,'PHP')).toMatch(/0[.,]00/);
});

test('dayKey gives the device-zone calendar day, the same as the date formatter, for every kind of input', () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const reference = (d) => { const p = Object.fromEntries(fmt.formatToParts(new Date(d)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
  const inputs = ['2026-11-08T12:00:00.000Z', '2026-10-26T09:00:00+08:00', '2026-03-08T07:30:00-05:00', '2026-11-08', 1794926899616, new Date(2026, 0, 1, 0, 0, 1), new Date(2026, 11, 31, 23, 59, 59)];
  for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2027, 0, 1); t += 7 * 3600e3 + 61e3) inputs.push(t);
  for (const input of inputs) expect(dayKey(input)).toBe(reference(input));
  expect(monthKey('2026-11-08T12:00:00.000Z')).toBe(reference('2026-11-08T12:00:00.000Z').slice(0, 7));
  // Unreadable dates still fail loudly instead of turning into a made-up day.
  expect(() => dayKey('not a date')).toThrow(RangeError);
});
