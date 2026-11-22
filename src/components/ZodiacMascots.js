import React, { memo } from 'react';
import AriesMascot from './AriesMascot';
import { ZODIAC } from '../lib/homeHero';
import './ZodiacMascots.css';

const COLUMNS = 4;
const ROWS = 3;
const SIGN_INDEX = new Map(ZODIAC.map(({ id }, index) => [id, index]));
const GUARDIAN_ARIES = 'aries-guardian';
const MASCOT_ORDER = ['aries', GUARDIAN_ARIES, ...ZODIAC.slice(1).map(({ id }) => id)];

export function ZodiacMascot({ sign, label }) {
  const index = SIGN_INDEX.get(sign === GUARDIAN_ARIES ? 'aries' : sign);
  if (index === undefined) return null;
  const x = (index % COLUMNS) * 100 / (COLUMNS - 1);
  const y = Math.floor(index / COLUMNS) * 100 / (ROWS - 1);
  return <span className="zodiac-mascot" data-zodiac={sign}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {sign === 'aries' ? <AriesMascot size="100%" animated={false} /> : (
      <span className="zodiac-portrait" data-zodiac-portrait aria-hidden="true"
        style={{ backgroundPosition: `${x}% ${y}%` }} />
    )}
  </span>;
}

export const ZodiacSignInRow = memo(function ZodiacSignInRow() {
  return <div className="auth-zodiac-row" aria-hidden="true">
    {MASCOT_ORDER.map(id => <ZodiacMascot key={id} sign={id} />)}
  </div>;
});
