import { findQrBounds } from './qrImageProcessing';

function makeImage(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  paint((x, y, rgb = [0, 0, 0]) => {
    const i = (y * width + x) * 4;
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
  });
  return findQrBounds(data, width, height);
}

test('isolates a square QR region from a larger uploaded photo', () => {
  const bounds = makeImage(300, 220, set => {
    for (let y = 70; y < 150; y += 1) for (let x = 110; x < 190; x += 1) {
      if ((x + y) % 3 !== 0) set(x, y);
    }
  });
  expect(bounds).not.toBeNull();
  expect(bounds.size).toBeGreaterThanOrEqual(96);
  expect(bounds.size).toBeLessThanOrEqual(120);
});

test('rejects an upload without a detectable square QR-like dark region', () => {
  const bounds = makeImage(200, 160, set => {
    for (let x = 10; x < 180; x += 1) set(x, 80);
  });
  expect(bounds).toBeNull();
});
