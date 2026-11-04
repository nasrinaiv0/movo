import { uploadAccountQr, getAccountQrSignedUrl, removeAccountQr, isAccountQrDataUrl, ACCOUNT_QR_MAX_BYTES } from './accountQrStorage';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({ supabase: { storage: { from: jest.fn() } } }));

const owner = '123e4567-e89b-42d3-a456-426614174000';
const account = '123e4567-e89b-42d3-a456-426614174001';
const file = '123e4567-e89b-42d3-a456-426614174002.png';
const png = 'data:image/png;base64,iVBORw0KGgo=';

beforeEach(() => {
  jest.clearAllMocks();
  global.crypto.randomUUID = jest.fn(() => '123e4567-e89b-42d3-a456-426614174002');
});

test('recognizes only normalized PNG data URLs', () => {
  expect(isAccountQrDataUrl(png)).toBe(true);
  expect(isAccountQrDataUrl('data:image/jpeg;base64,/9j/')).toBe(false);
  expect(isAccountQrDataUrl('https://example.com/qr.png')).toBe(false);
});

test('uploads immutable PNG objects under the authenticated user and account folders', async () => {
  const upload = jest.fn().mockResolvedValue({ error: null });
  supabase.storage.from.mockReturnValue({ upload });
  await expect(uploadAccountQr(owner, account, png)).resolves.toBe(`${owner}/${account}/${file}`);
  expect(upload).toHaveBeenCalledWith(expect.stringContaining(`${owner}/${account}/`), expect.any(Blob), {
    contentType: 'image/png', cacheControl: '3600', upsert: false,
  });
});

test('rejects invalid owner ids and malformed image data before storage access', async () => {
  await expect(uploadAccountQr('not-a-user', account, png)).rejects.toThrow('invalid_account_qr_owner');
  await expect(uploadAccountQr(owner, account, 'data:image/jpeg;base64,/9j/')).rejects.toThrow('invalid_account_qr_image');
  expect(supabase.storage.from).not.toHaveBeenCalled();
});

test('signed URLs and deletion reject paths outside the current user folder', async () => {
  await expect(getAccountQrSignedUrl(owner, `other-user/${account}/${file}`)).rejects.toThrow('invalid_account_qr_path');
  await expect(removeAccountQr(owner, `other-user/${account}/${file}`)).rejects.toThrow('invalid_account_qr_path');
  expect(supabase.storage.from).not.toHaveBeenCalled();
});

test('creates a short-lived signed URL for an owned object', async () => {
  const createSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/qr' }, error: null });
  supabase.storage.from.mockReturnValue({ createSignedUrl });
  await expect(getAccountQrSignedUrl(owner, `${owner}/${account}/${file}`, 900)).resolves.toBe('https://signed.example/qr');
  expect(createSignedUrl).toHaveBeenCalledWith(`${owner}/${account}/${file}`, 900);
});

test('deletes only the exact validated owned object path', async () => {
  const remove = jest.fn().mockResolvedValue({ error: null });
  supabase.storage.from.mockReturnValue({ remove });
  await removeAccountQr(owner, `${owner}/${account}/${file}`);
  expect(remove).toHaveBeenCalledWith([`${owner}/${account}/${file}`]);
  expect(ACCOUNT_QR_MAX_BYTES).toBe(1258291);
});

test('bulk cleanup enumerates only account folders and removes only owned PNG objects', async () => {
  const list = jest.fn()
    .mockResolvedValueOnce({ data: [{ name: account, id: null }], error: null })
    .mockResolvedValueOnce({ data: [{ name: file, id: 'object-1' }, { name: 'notes.txt', id: 'object-2' }], error: null });
  const remove = jest.fn().mockResolvedValue({ error: null });
  supabase.storage.from.mockReturnValue({ list, remove });
  const { removeAllAccountQr } = require('./accountQrStorage');
  await expect(removeAllAccountQr(owner)).resolves.toBe(1);
  expect(list).toHaveBeenNthCalledWith(1, owner, { limit: 100, offset: 0 });
  expect(list).toHaveBeenNthCalledWith(2, `${owner}/${account}`, { limit: 100, offset: 0 });
  expect(remove).toHaveBeenCalledWith([`${owner}/${account}/${file}`]);
});
