import { THEMES, findSticker, defaultThemeFor } from './stickers';

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
