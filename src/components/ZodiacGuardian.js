import React from 'react';
import atlas from '../assets/movo-zodiac-guardians.webp';

const SIZE = 128;
const COLUMNS = 4;
const HEIGHT = SIZE * 3;

const TRAILS = {
  aries: ['#ffc172', 'M103 26q13-6 16-15m-1 16v8m-4-4h8'],
  taurus: ['#c9e19b', 'M102 27q6-10 16-9-2 9-12 10m-3 0 9-7'],
  gemini: ['#d8c6ff', 'M112 18v14m-7-7h14m-11-7 8 13m-8 0 8-13'],
  cancer: ['#a7def5', 'M103 30q7-8 14-8m0 14q5-7 7-13m-14-7 2-3'],
  leo: ['#ffe09b', 'M108 14v8m-6-5 3 7m9-6-3 6m-11 1 4 4m13-4-4 4'],
  virgo: ['#d7eba8', 'M105 27q4-8 14-8-2 8-11 11m5-11q-1-6-7-7'],
  libra: ['#ffdb9c', 'M101 26h20m-15-4-4 7m14-7 4 7m-10 2h2'],
  scorpio: ['#ff9ee0', 'M105 16q11-2 13 5 1 4-4 8m-9-5 4-4m-1 9 4 1'],
  sagittarius: ['#dfc4ff', 'M103 28l17-14m-8 1 9-2-2 9m-16 2 4-4'],
  capricorn: ['#a6e3dc', 'M103 30q7-8 13-6t7-7m-14 17q4-4 8-4'],
  aquarius: ['#9de5ff', 'M113 13q7 7 7 10a4 4 0 0 1-8 0q0-3 1-10m9 17 2 4'],
  pisces: ['#b5e1fa', 'M110 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6m8 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
};

export function ZodiacGuardian({ sign, index }) {
  const x = (index % COLUMNS) * SIZE;
  const y = Math.floor(index / COLUMNS) * SIZE;
  const [stroke, path] = TRAILS[sign];
  return <svg className="zodiac-portrait" viewBox="0 0 128 128" width="128" height="128"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <g className="zodiac-figure">
      <svg width="128" height="128" viewBox={`${x} ${y} 128 128`} overflow="hidden">
        <image href={atlas} width={SIZE * COLUMNS} height={HEIGHT} />
      </svg>
    </g>
    <path className="zodiac-trail" d={path} fill="none" stroke={stroke} strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" opacity="0" />
  </svg>;
}
