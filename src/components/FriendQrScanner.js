import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';

/** Frames stay on this device. Only a reviewed, validated invite reaches Friends. */
export default function FriendQrScanner({ onScan, onClose }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const file = useRef(null);
  const stream = useRef(null);
  const alive = useRef(true);
  const attempt = useRef(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const stop = () => {
    ++attempt.current;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (alive.current) setRunning(false);
  };
  async function start() {
    stop(); setError('');
    const request = attempt.current;
    try {
      const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      if (!alive.current || request !== attempt.current || document.hidden) { opened.getTracks().forEach(track => track.stop()); return; }
      stream.current = opened;
      video.current.srcObject = opened;
      await video.current.play();
      if (alive.current && request === attempt.current) setRunning(true);
    } catch {
      if (alive.current && request === attempt.current) { stop(); setError(tr('Camera unavailable. Choose a QR photo or paste the invite link.')); }
    }
  }
  useEffect(() => {
    alive.current = true;
    start();
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { alive.current = false; stop(); document.removeEventListener('visibilitychange', hide); };
    // Start only when the user opens this scanner. Callbacks are read by the scan effect below.
  }, []);
  const decode = useCallback(source => {
    const width = source.videoWidth || source.naturalWidth;
    const height = source.videoHeight || source.naturalHeight;
    if (!width || !height || width * height > 32e6) return '';
    const scale = Math.min(1, 1024 / Math.max(width, height));
    const target = canvas.current;
    target.width = Math.round(width * scale); target.height = Math.round(height * scale);
    const context = target.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0, target.width, target.height);
    return jsQR(context.getImageData(0, 0, target.width, target.height).data, target.width, target.height)?.data || '';
  }, []);
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      if (document.hidden || !video.current || video.current.readyState < 2) return;
      try { const value = decode(video.current); if (value) onScan(value); } catch { /* next frame can recover */ }
    }, 220);
    return () => clearInterval(timer);
  }, [running, onScan, decode]);
  async function readPhoto(event) {
    const chosen = event.target.files?.[0]; event.target.value = '';
    if (!chosen) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(chosen.type) || chosen.size > 10 * 1024 * 1024) { setError(tr('Choose a JPG, PNG or WebP QR image under 10 MB.')); return; }
    stop(); setError('');
    const url = URL.createObjectURL(chosen);
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      if (!alive.current) return;
      const value = decode(image);
      if (value) onScan(value); else setError(tr('No QR code found. Try another photo or paste the invite link.'));
    } catch { if (alive.current) setError(tr('No QR code found. Try another photo or paste the invite link.')); }
    finally { URL.revokeObjectURL(url); }
  }
  return <div className="friend-scanner">
    <div className="friend-scanner-frame"><video ref={video} autoPlay muted playsInline aria-label={tr('Friend QR camera')} /><span aria-hidden="true" /></div>
    <canvas ref={canvas} hidden />
    <p className="friends-note">{tr('Point the camera at a MOVO friend QR code. Photos stay on this device.')}</p>
    {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    <div className="friends-actions">
      <button type="button" className="friends-secondary" onClick={() => file.current?.click()}><Icon name="image" size={18} />{tr('Choose QR photo')}</button>
      <button type="button" className="friends-secondary" onClick={running ? onClose : start}>{running ? tr('Paste invite link') : tr('Try camera again')}</button>
    </div>
    <input hidden ref={file} type="file" accept="image/png,image/jpeg,image/webp" onChange={readPhoto} />
    {!running && <button type="button" className="link-button" onClick={onClose}>{tr('Paste invite link')}</button>}
  </div>;
}
