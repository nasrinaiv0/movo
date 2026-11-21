import { nativePlatform } from './platform';

// This is the production iOS asset policy, not an App Review/user detection switch.
export const originalOnlyAssets = () => process.env.REACT_APP_ASSET_POLICY === 'original-only' || nativePlatform() === 'ios';
export const thirdPartyArtworkAllowed = () => !originalOnlyAssets();

/** MOVO-generated geometry; keeps a saved selection usable without fetching an unverified image. */
export function originalArtwork(key = '', ink = 'light') {
  let seed = 0;
  for (const char of String(key)) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const light = ink === 'light' ? 24 : 84;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540"><defs><linearGradient id="g"><stop stop-color="hsl(${hue},45%,${light}%)"/><stop offset="1" stop-color="hsl(${(hue + 55) % 360},55%,${light + 10}%)"/></linearGradient></defs><path fill="url(#g)" d="M0 0h856v540H0z"/><circle cx="730" cy="110" r="200" fill="white" opacity=".08"/><path d="M350 540 856 140v400Z" fill="white" opacity=".08"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
