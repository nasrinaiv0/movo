import { saveLocalAccountQr, getLocalAccountQr, removeLocalAccountQr } from './accountQrLocalStore';

const valid = 'data:image/png;base64,iVBORw0KGgo=';

test('rejects malformed QR cache payloads and oversized data URLs', async () => {
  await expect(saveLocalAccountQr('local:account-1', 'data:image/jpeg;base64,/9j/')).rejects.toThrow('invalid_account_qr_image');
  await expect(saveLocalAccountQr('local:account-1', `data:image/png;base64,${'A'.repeat(1_200_001)}`)).rejects.toThrow('invalid_account_qr_image');
});

test('rejects invalid cache keys without opening IndexedDB', async () => {
  await expect(saveLocalAccountQr('', valid)).rejects.toThrow('invalid_account_qr_cache_key');
  await expect(getLocalAccountQr('')).resolves.toBeNull();
  await expect(removeLocalAccountQr('')).resolves.toBeUndefined();
});
