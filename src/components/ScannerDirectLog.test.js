import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ScannerSheet from './ScannerSheet';
import { scanReceiptWithAI } from '../lib/aiReceipt';

jest.mock('../lib/aiReceipt', () => ({scanReceiptWithAI: jest.fn()}));
jest.mock('./ui', () => ({
  Sheet: ({children}) => <div data-testid="scanner">{children}</div>,
}));
jest.mock('./AccountPicker', () => ({accounts, value, onChange}) => (
  <select aria-label="Select payment account" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Choose account</option>
    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
  </select>
));
jest.mock('./Icon', () => () => <span aria-hidden="true" />);
jest.mock('./ReceiptBreakdown', () => () => <div>Receipt breakdown</div>);
global.IS_REACT_ACT_ENVIRONMENT = true;
const accounts=[
  {id:'cash01',name:'Cash pocket',account_type:'cash',currency:'PHP'},
  {id:'card02',name:'BPI credit',account_type:'card',currency:'PHP'},
  {id:'ewallet03',name:'GCash',account_type:'e_wallet',currency:'PHP'},
  {id:'euro04',name:'EUR wallet',account_type:'e_wallet',currency:'EUR'},
  {id:'dollar05',name:'USD card',account_type:'card',currency:'USD'},
];
const response={
  merchant:"McDonald's",date:'2026-11-14',time:'02:41:33',currency:'PHP',
  amount:159,total:159,category:'food:fast_food',type:'expense',warnings:[],
  items:[{name:'Chicken meal',quantity:1,total:159,category:'food:fast_food',options:['Fries','Coke']}],
  tax:17.04,taxableSales:141.96,cashTendered:500,change:341,
};
let host,root;
const click = async label => {
  const button=[...host.querySelectorAll('button')].find(n => n.textContent.trim()===label);
  expect(button).toBeTruthy();
  await act(async()=>button.click());
};
const selectReceipt=async()=>{
  const input=host.querySelector('input[aria-label="Upload a photo or screenshot"]');
  const file=new File(['fake receipt pixels'],'receipt.jpg',{type:'image/jpeg'});
  Object.defineProperty(input,'files',{configurable:true,value:[file]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
};
beforeEach(()=>{
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 window.localStorage.clear();
 scanReceiptWithAI.mockReset();
 scanReceiptWithAI.mockResolvedValue(response);
});
afterEach(()=>{act(()=>root.unmount());host.remove();});

test('selecting a registered e-wallet and Log saves directly once without a calculator',async()=>{
 const onLog=jest.fn(async()=>true);
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();
 expect(host.textContent).toContain('Analyze with AI');
 expect(onLog).not.toHaveBeenCalled();
 await click('Analyze with AI');
 expect(scanReceiptWithAI).toHaveBeenCalledTimes(1);
 expect(host.textContent).toContain('159.00');
 expect(host.textContent).toContain("McDonald's");
 const logButton=[...host.querySelectorAll('button')].find(b=>b.textContent==='Log transaction');
 expect(logButton.disabled).toBe(true);
 await act(async()=>{
   const s=host.querySelector('select[aria-label="Select payment account"]');
   s.value='ewallet03';s.dispatchEvent(new Event('change',{bubbles:true}));
 });
 expect(logButton.disabled).toBe(false);
 await click('Log transaction');
 expect(onLog).toHaveBeenCalledTimes(1);
 expect(onLog).toHaveBeenCalledWith(expect.objectContaining({account_id:'ewallet03',merchant:"McDonald's",amount:'159',category:'food:fast_food'}));
 expect(onLog.mock.calls[0][0].note).toContain('VAT/tax 17.04');
 expect(onLog.mock.calls[0][0].note).toContain('Change 341.00');
 expect(host.textContent).not.toContain('Transaction calculator');
});

test('Discard after analysis never logs a transaction',async()=>{
 const onLog=jest.fn();
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();
 await click('Analyze with AI');
 await click('Discard');
 expect(onLog).not.toHaveBeenCalled();
 expect(host.textContent).toContain('Take a photo');
});

test('a failed log leaves review open for correction and does not claim success',async()=>{
 const onLog=jest.fn(async()=>false);
 await act(async()=>root.render(<ScannerSheet show={true} accounts={accounts} onLog={onLog} onClose={()=>{}} />));
 await selectReceipt();await click('Analyze with AI');
 await act(async()=>{
   const s=host.querySelector('select[aria-label="Select payment account"]');
   s.value='card02';s.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await click('Log transaction');
 expect(onLog).toHaveBeenCalledTimes(1);
 expect(host.textContent).toContain('Log transaction');
 expect(host.textContent).toContain("McDonald's");
});


const changeInput = (node, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
};
const pick = async (label, value) => {
  const select = [...host.querySelectorAll('select')].find(node =>
    node.getAttribute('aria-label') === label || node.labels?.[0]?.textContent.startsWith(label));
  expect(select).toBeTruthy();
  await act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); });
};
const reviewForeign = async props => {
  scanReceiptWithAI.mockResolvedValue({ ...response, amount: 12.34, total: 12.34, currency: 'USD', tax: 1.23 });
  await act(async () => root.render(<ScannerSheet show accounts={accounts} {...props} />));
  await selectReceipt();
  await click('Analyze with AI');
};
const currentRates = () => ({ live: true, at: Date.now() - 1000, rates: { USD: 1, PHP: 58.6, EUR: 0.93 } });
const logButton = () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Log transaction');

test('foreign receipts follow the selected account and log the reviewed estimate and original currency once', async () => {
  const onLog = jest.fn(async () => true);
  const refreshFx = jest.fn();
  await reviewForeign({ onLog, fx: currentRates(), refreshFx });
  await pick('Select payment account', 'ewallet03');
  expect(host.textContent).toContain('USD 12.34');
  expect(host.textContent).toContain('PHP 723.12');
  await pick('Select payment account', 'dollar05');
  expect(host.textContent).not.toContain('Estimated account amount');
  await pick('Select payment account', 'euro04');
  expect(host.textContent).toContain('EUR 11.48');
  await click('Log transaction');
  expect(refreshFx).not.toHaveBeenCalled();
  expect(onLog).toHaveBeenCalledTimes(1);
  expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'euro04', amount: '11.48' }));
  expect(onLog.mock.calls[0][0].receipt_note).toMatch(/USD 12.34 → EUR 11.48 · ExchangeRate-API · \d{4}-\d{2}-\d{2} · 0.93 EUR\/USD/);
  expect(onLog.mock.calls[0][0].note).toContain('VAT/tax 1.23');
});

test('stale provider rates cannot log; an entered statement amount takes priority and resets with account changes', async () => {
  const onLog = jest.fn(async () => true);
  const refreshFx = jest.fn(async () => { throw new Error('offline'); });
  await reviewForeign({ onLog, fx: { ...currentRates(), at: Date.now() - 172800000 }, refreshFx });
  await pick('Select payment account', 'card02');
  expect(refreshFx).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain('Rate unavailable');
  expect(logButton().disabled).toBe(true);
  const setStatement = async (value) => {
    await click('Use statement amount');
    const manual = host.querySelector('.scan-exchange input');
    await act(async () => changeInput(manual, value));
  };
  await setStatement('733.142');
  expect(logButton().disabled).toBe(true);
  await act(async () => changeInput(host.querySelector('.scan-exchange input'), '733,14'));
  expect(logButton().disabled).toBe(false);
  await pick('Select payment account', 'ewallet03');
  expect(logButton().disabled).toBe(true);
  await setStatement('732.25');
  await click('Log transaction');
  expect(onLog).toHaveBeenCalledWith(expect.objectContaining({
    account_id: 'ewallet03', amount: '732.25', receipt_note: expect.stringContaining('USD 12.34 → PHP 732.25 · Statement amount'),
  }));
});

test('an unidentified receipt currency must be confirmed before saving', async () => {
  const onLog = jest.fn(async () => true);
  scanReceiptWithAI.mockResolvedValue({ ...response, currency: '' });
  await act(async () => root.render(<ScannerSheet show accounts={accounts} onLog={onLog} />));
  await selectReceipt();
  await click('Analyze with AI');
  await pick('Select payment account', 'cash01');
  expect(host.textContent).toContain('Choose the currency printed on the receipt.');
  expect(logButton().disabled).toBe(true);
  await pick('Receipt currency', 'PHP');
  await click('Log transaction');
  expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'cash01', amount: '159' }));
});
