/** Export only the chosen display name and invitation QR. No account or financial data. */
export async function friendCardImage(qr, name, caption = '') {
  if (!qr) throw new Error('qr_unavailable');
  const source = new Blob([new XMLSerializer().serializeToString(qr)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(source);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 960;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fafaf8'; context.fillRect(0, 0, 720, 960);
    context.fillStyle = '#e9eee9'; context.beginPath(); context.arc(360, 114, 52, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#173f2d'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.font = '600 48px system-ui'; context.fillText(Array.from(name)[0]?.toLocaleUpperCase() || 'M', 360, 115);
    context.fillStyle = '#151716'; context.font = '600 42px system-ui';
    while (context.measureText(name).width > 620 && parseInt(context.font.slice(4), 10) > 23) {
      context.font = `600 ${parseInt(context.font.slice(4), 10) - 1}px system-ui`;
    }
    context.fillText(name, 360, 220, 620);
    context.drawImage(image, 96, 280, 528, 528);
    context.font = '700 30px system-ui'; context.fillText('MOVO', 360, 858);
    context.font = '16px system-ui'; context.fillStyle = '#5b645f'; context.fillText(caption, 360, 914, 620);
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > 1500000) throw new Error('qr_export_unavailable');
    return dataUrl;
  } finally { URL.revokeObjectURL(url); }
}

export function downloadFriendCard(dataUrl) {
  const link = document.createElement('a'); link.href = dataUrl; link.download = 'MOVO-friend-profile.png';
  document.body.appendChild(link); link.click(); link.remove();
}
