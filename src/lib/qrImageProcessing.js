/**
 * Isolate the QR artwork from a camera/photo upload. The QR's white quiet zone is
 * rebuilt around the detected dark modules; everything outside that square is discarded.
 */
export function findQrBounds(data, width, height) {
  if (!data || !width || !height || data.length < width * height * 4) return null;
  const x0 = Math.floor(width * 0.05), x1 = Math.ceil(width * 0.95);
  const y0 = Math.floor(height * 0.05), y1 = Math.ceil(height * 0.95);
  const rowCounts = new Uint32Array(height);
  const colCounts = new Uint32Array(width);
  let darkPixels = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      if (alpha < 32) continue;
      const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
      if (luminance < 92 && chroma < 85) {
        rowCounts[y] += 1; colCounts[x] += 1; darkPixels += 1;
      }
    }
  }
  if (darkPixels < 80) return null;
  const rowThreshold = Math.max(2, Math.floor(width * 0.004));
  const colThreshold = Math.max(2, Math.floor(height * 0.004));
  let top = y1, bottom = y0, left = x1, right = x0;
  for (let y = y0; y < y1; y += 1) if (rowCounts[y] >= rowThreshold) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  for (let x = x0; x < x1; x += 1) if (colCounts[x] >= colThreshold) { left = Math.min(left, x); right = Math.max(right, x); }
  const boxWidth = right - left + 1, boxHeight = bottom - top + 1;
  const ratio = boxWidth / boxHeight;
  if (boxWidth < 24 || boxHeight < 24 || ratio < 0.62 || ratio > 1.6) return null;
  const side = Math.max(boxWidth, boxHeight);
  const quiet = Math.max(8, Math.ceil(side * 0.045));
  const square = Math.min(side + quiet * 2, width, height);
  const cx = (left + right) / 2, cy = (top + bottom) / 2;
  const x = Math.min(width - square, Math.max(0, Math.round(cx - square / 2)));
  const y = Math.min(height - square, Math.max(0, Math.round(cy - square / 2)));
  return { x, y, size: square };
}

export function extractQrImage(image, maxSize = 640) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth || image.width;
  source.height = image.naturalHeight || image.height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('qr_canvas_unavailable');
  sourceContext.drawImage(image, 0, 0, source.width, source.height);
  const bounds = findQrBounds(sourceContext.getImageData(0, 0, source.width, source.height).data, source.width, source.height);
  if (!bounds) throw new Error('qr_not_detected');
  const output = document.createElement('canvas');
  output.width = output.height = maxSize;
  const context = output.getContext('2d');
  if (!context) throw new Error('qr_canvas_unavailable');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, maxSize, maxSize);
  const sx = Math.max(0, bounds.x), sy = Math.max(0, bounds.y);
  const sw = bounds.size, sh = bounds.size;
  const scale = Math.min(maxSize / bounds.size, 1);
  const destSize = bounds.size * scale;
  const offset = (maxSize - destSize) / 2;
  context.drawImage(source, sx, sy, sw, sh, offset, offset, destSize, destSize);
  return output.toDataURL('image/png');
}
