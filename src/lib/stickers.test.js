import { THEMES, findSticker, defaultThemeFor, addCustomSticker } from './stickers';

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
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('rejects oversized custom sticker files before decoding', async () => {
  await expect(addCustomSticker({ name: 'huge.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 })).rejects.toThrow('10 MB or smaller');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('rejects empty custom sticker files before decoding', async () => {
  await expect(addCustomSticker({ name: 'empty.png', type: 'image/png', size: 0 })).rejects.toThrow('empty or unreadable');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
