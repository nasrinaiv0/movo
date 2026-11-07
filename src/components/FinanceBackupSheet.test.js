import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FinanceBackupSheet from './FinanceBackupSheet';

global.IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('./Icon', () => ({ __esModule: true, default: () => null }));
jest.mock('./ui', () => ({ Sheet: ({ children, title }) => <div role="dialog" aria-label={title}>{children}</div> }));
jest.mock('../lib/financeBackup', () => ({
  createFinanceBackup: jest.fn().mockResolvedValue({ format:'movo-finance-backup',version:1,accounts:[],transactions:[],tables:{} }),
  parseFinanceBackup: jest.fn(text => JSON.parse(text)),
}));
jest.mock('../lib/localAttachments', () => ({
  getLocalAttachment: jest.fn().mockResolvedValue(null),
  putLocalAttachment: jest.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  require('../lib/localAttachments').getLocalAttachment.mockResolvedValue(null);
  require('../lib/localAttachments').putLocalAttachment.mockResolvedValue(true);
  require('../lib/financeBackup').parseFinanceBackup.mockImplementation(text => JSON.parse(text));
  require('../lib/financeBackup').createFinanceBackup.mockResolvedValue({ format:'movo-finance-backup', version:1, accounts:[], transactions:[], tables:{} });
});

const sample = { format:'movo-finance-backup',version:1,accounts:[{id:'bank',name:'Bank',balance:300}],transactions:[{id:'tx',merchant:'Food',amount:20}],tables:{} };
async function setup() {
  const node = document.createElement('div'); document.body.appendChild(node);
  const root = createRoot(node);
  const c = { saveFinanceBackupRecords: jest.fn().mockResolvedValue({ accounts:1,transactions:1,failed:0,skipped:{duplicates:0,conflicts:0},unsupported:[] }), exportCsv: jest.fn(), openCsvImporter: jest.fn() };
  await act(async () => root.render(<FinanceBackupSheet c={c} onClose={jest.fn()} />));
  return { node, c, cleanup: async () => { await act(async () => root.unmount()); node.remove(); } };
}
test('compact upload label replaces native file chooser, with useful empty placeholder', async () => {
  const ui = await setup();
  expect(ui.node.textContent).toContain('Upload file');
  expect(ui.node.textContent).toContain('No file selected');
  expect(ui.node.textContent).toContain('Export CSV');
  expect(ui.node.querySelector('input[type="file"].movo-native-file-input')).not.toBeNull();
  expect(ui.node.querySelector('button[class="primary-button"]').textContent).toContain('Export backup');
  await ui.cleanup();
});
test('JSON backup must be previewed and Save records clicked before any active data is written', async () => {
  const ui = await setup();
  const file = { name:'wallet.json', size:1000, text: async () => JSON.stringify(sample) };
  const input = ui.node.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value:[file], configurable:true });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles:true })));
  expect(ui.node.textContent).toContain('wallet.json');
  expect(ui.node.textContent).toContain('Preview records');
  expect(ui.c.saveFinanceBackupRecords).not.toHaveBeenCalled();
  const save = [...ui.node.querySelectorAll('button')].find(button => button.textContent.includes('Save records'));
  expect(save).toBeDefined();
  await act(async () => save.dispatchEvent(new MouseEvent('click', { bubbles:true })));
  expect(ui.c.saveFinanceBackupRecords).toHaveBeenCalledWith(sample);
  expect(ui.node.textContent).toContain('Records saved');
  await ui.cleanup();
});
test('CSV file routes into the existing CSV preview without silently recording it', async () => {
  const ui = await setup();
  const file = { name:'transactions.csv', size:50, text: async () => 'Date,Description,Type,Amount' };
  const input = ui.node.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value:[file], configurable:true });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles:true })));
  expect(ui.c.openCsvImporter).toHaveBeenCalledWith(file);
  expect(ui.c.saveFinanceBackupRecords).not.toHaveBeenCalled();
  await ui.cleanup();
});
