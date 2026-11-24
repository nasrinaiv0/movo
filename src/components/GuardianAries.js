import React, { useId } from 'react';
import portrait from '../assets/movo-guardian-aries.webp';

const ARM = 'M119 209Q130 204 136 213L140 224 135 232Q141 238 136 247Q133 256 124 256Q111 254 109 246Q107 240 111 233L111 223Q113 212 119 209Z';
const NEAR_EYE = 'M122 132Q126 126 129 121Q136 114 145 114Q155 113 160 121Q165 129 158 139Q150 147 138 144Q128 143 122 132Z';
const FAR_EYE = 'M186 131Q185 119 191 112Q200 107 207 113Q213 117 213 126Q211 137 203 141Q192 142 186 131Z';

export function GuardianAries() {
  const id = useId();
  const source = `${id}-portrait`;
  const arm = `${id}-arm`;
  const near = `${id}-near`;
  const far = `${id}-far`;
  return <svg className="guardian-aries" viewBox="0 0 360 360" width="360" height="360"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <image id={source} href={portrait} width="285" height="330" />
      <clipPath id={arm}><path d={ARM} /></clipPath>
      <clipPath id={near}><path d={NEAR_EYE} /></clipPath>
      <clipPath id={far}><path d={FAR_EYE} /></clipPath>
      <linearGradient id={`${id}-sleeve-reveal`} x1="0" x2="1" y1="1" y2="0">
        <stop stopColor="#721b19" /><stop offset="1" stopColor="#211915" />
      </linearGradient>
      <linearGradient id={`${id}-eyelid`} x1="0" x2="0" y1="0" y2="1">
        <stop stopColor="#e8aa85" /><stop offset=".55" stopColor="#f7c7a3" /><stop offset="1" stopColor="#efb292" />
      </linearGradient>
    </defs>
    <g className="aries-figure">
      <g transform="translate(37 12)">
        <use href={`#${source}`} />
        <g className="guardian-wave-layer" opacity="0">
          <path d={ARM} fill={`url(#${id}-sleeve-reveal)`} stroke="#50231a" strokeWidth="1.8" />
          <g className="aries-arm-right guardian-free-arm">
            <g className="guardian-arm-lift" transform="rotate(118 127 211)">
              <use href={`#${source}`} clipPath={`url(#${arm})`} />
            </g>
          </g>
        </g>
        <g className="guardian-blink-layer" opacity="0">
          <path d={NEAR_EYE} fill={`url(#${id}-eyelid)`} stroke="#f1bd99" strokeWidth="2.5" />
          <path d={FAR_EYE} fill={`url(#${id}-eyelid)`} stroke="#efbb94" strokeWidth="2.4" />
          <g transform="translate(143 130)">
            <g className="aries-eye guardian-eye">
              <g transform="translate(-143 -130)"><use href={`#${source}`} clipPath={`url(#${near})`} /></g>
            </g>
          </g>
          <g transform="translate(200 125)">
            <g className="aries-eye guardian-eye">
              <g transform="translate(-200 -125)"><use href={`#${source}`} clipPath={`url(#${far})`} /></g>
            </g>
          </g>
        </g>
      </g>
    </g>
  </svg>;
}
