/** Only account payment QR codes are allowed; never attach one to a card or membership. */
export const supportsAccountQr = (accountType) => accountType === 'bank' || accountType === 'e_wallet';
