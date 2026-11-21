import { THEMES, findSticker, defaultThemeFor, addCustomSticker, clearCustomStickers, getCustomStickers,
  replaceCustomStickers, resetCustomStickerView } from './stickers';

test('sticker library has 250+ unique themes', () => {
  expect(THEMES.length).toBeGreaterThanOrEqual(250);
  expect(new Set(THEMES.map(t => t.id)).size).toBe(THEMES.length);
  expect(new Set(THEMES.map(t => t.name)).size).toBe(THEMES.length);
});

test('findSticker and defaults resolve', () => {
  expect(findSticker('thunder-crimson').name).toBe('Crimson Thunder');
  expect(findSticker('nope')).toBeNull();
  expect(defaultThemeFor('abc')).toBe(defaultThemeFor('abc'));
});


test('rejects SVG and unsupported image formats before decoding', async () => {
  await expect(addCustomSticker({ name: 'external.svg', type: 'image/svg+xml', size: 512 })).rejects.toThrow('SVG and other formats are not supported');
});

test('rejects oversized custom sticker files before decoding', async () => {
  await expect(addCustomSticker({ name: 'huge.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 })).rejects.toThrow('10 MB or smaller');
});

test('rejects empty custom sticker files before decoding', async () => {
  await expect(addCustomSticker({ name: 'empty.png', type: 'image/png', size: 0 })).rejects.toThrow('empty or unreadable');
});

test('clears custom sticker artwork from browser storage', () => {
  window.localStorage.setItem('movo.customStickers.v1', JSON.stringify([{ id: 'custom-test', name: 'Test', src: 'data:image/jpeg;base64,AA==', ink: 'light', custom: true }]));
  expect(clearCustomStickers()).toBe(true);
  expect(window.localStorage.getItem('movo.customStickers.v1')).toBeNull();
});

test('an image decoded after the owner view changed cannot enter the new owner artwork', async () => {
  const originalImage = global.Image;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let image;
  global.Image = class { constructor() { image = this; } };
  URL.createObjectURL = jest.fn(() => 'blob:synthetic-owner-a');
  URL.revokeObjectURL = jest.fn();
  try {
    const pending = addCustomSticker({ name: 'A.png', type: 'image/png', size: 100 });
    const rejected = expect(pending).rejects.toThrow('Could not save');
    replaceCustomStickers([]);
    image.onload();
    await rejected;
    expect(getCustomStickers()).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-owner-a');
  } finally {
    global.Image = originalImage;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});

test('runtime reset hides previous artwork even if a quota error prevents replacing its stored copy', () => {
  const art = { id: 'a', src: 'data:image/jpeg;base64,AA==' };
  replaceCustomStickers([art]);
  const saved = localStorage.getItem('movo.customStickers.v1');
  const write = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  try {
    expect(replaceCustomStickers([])).toBe(false);
    resetCustomStickerView();
    expect(getCustomStickers()).toEqual([]);
    expect(localStorage.getItem('movo.customStickers.v1')).toBe(saved);
  } finally { write.mockRestore(); clearCustomStickers(); }
});
