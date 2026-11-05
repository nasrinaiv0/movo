import { money, setFormatLocale } from './format';
beforeEach(()=>setFormatLocale('en-PH'));
test('money retains cents and always displays two decimal digits, including compact callers',()=>{
 expect(money(5858,'PHP')).toContain('5,858.00');
 expect(money(5858.07,'PHP',0)).toContain('5,858.07');
 expect(money(1000000.99,'PHP')).toContain('1,000,000.99');
 expect(money(0.01,'PHP')).toContain('0.01');
 expect(money(120,'JPY')).toContain('120.00');
});
