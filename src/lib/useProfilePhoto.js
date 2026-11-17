import { useEffect, useRef, useState } from 'react';
import { friendsRequest } from './friends';

function cacheKey(owner) { return `movo.profile-photo.v1.${owner}`; }

function readPhoto(owner) {
  try { return window.localStorage.getItem(cacheKey(owner)); } catch { return null; }
}

function cachePhoto(owner, photo) {
  try { window.localStorage.setItem(cacheKey(owner), photo); } catch { /* account copy remains available */ }
}

export function cropProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const fail = () => reject(new Error('invalid_profile_photo'));
    image.onerror = () => { URL.revokeObjectURL(url); fail(); };
    image.onload = () => {
      try {
        const { naturalWidth: width, naturalHeight: height } = image;
        const side = Math.min(width, height);
        if (!side) throw Error();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw Error();
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 256, 256);
        ctx.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, 256, 256);
        for (const quality of [0.85, 0.7, 0.5]) {
          const result = canvas.toDataURL('image/jpeg', quality);
          if (result.startsWith('data:image/jpeg;base64,') && result.length <= 90000) {
            resolve(result);
            return;
          }
        }
        fail();
      } catch { fail(); }
      finally { URL.revokeObjectURL(url); }
    };
    image.src = url;
  });
}

export function useProfilePhoto(session, legacyPhoto, setPref, enabled) {
  const owner = session?.user?.id;
  const accessToken = session?.access_token;
  const [display, setDisplay] = useState(null);
  const [revision, setRevision] = useState(0);
  const writeRef = useRef(null);
  const version = useRef(0);
  const lastOwner = useRef(owner);
  lastOwner.current = owner;

  useEffect(() => {
    if (!owner || !accessToken || !enabled) return undefined;
    const controller = new AbortController();
    const refresh = () => {
      if (writeRef.current?.owner === owner || document.hidden) return;
      const requested = ++version.current;
      friendsRequest({ access_token: accessToken }, 'avatar', {}, controller.signal).then(result => {
        if (controller.signal.aborted || requested !== version.current || lastOwner.current !== owner || typeof result.photo !== 'string') return;
        cachePhoto(owner, result.photo);
        setDisplay({ owner, photo: result.photo });
      }).catch(() => { /* retain the last photo when offline or while the API rolls out */ });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [owner, accessToken, enabled, revision]);

  async function savePhoto(photo) {
    if (!owner) { setPref('profilePhoto', photo); return; }
    if (!accessToken || lastOwner.current !== owner || writeRef.current?.owner === owner) throw new Error('profile_photo_unavailable');
    const write = { owner };
    writeRef.current = write;
    ++version.current;
    try {
      await friendsRequest({ access_token: accessToken }, 'set_avatar', { photo });
      cachePhoto(owner, photo);
      if (lastOwner.current === owner) setDisplay({ owner, photo });
    } finally {
      if (writeRef.current === write) writeRef.current = null;
      if (lastOwner.current === owner) setRevision(value => value + 1);
    }
  }

  const accountPhoto = owner ? (display?.owner === owner ? display.photo : readPhoto(owner)) : null;
  return { photo: owner ? accountPhoto ?? '' : legacyPhoto || '', savePhoto };
}
