import React, { memo } from 'react';
import AriesMascot from './AriesMascot';
import { GuardianAries } from './GuardianAries';
import { ZodiacGuardian } from './ZodiacGuardian';
import { ZODIAC } from '../lib/homeHero';
import './ZodiacMascots.css';

const SIGN_INDEX = new Map(ZODIAC.map(({ id }, index) => [id, index]));
const GUARDIAN_ARIES = 'aries-guardian';
const MASCOT_ORDER = ['aries', GUARDIAN_ARIES, ...ZODIAC.slice(1).map(({ id }) => id)];

export function ZodiacMascot({ sign, label }) {
  const index = SIGN_INDEX.get(sign === GUARDIAN_ARIES ? 'aries' : sign);
  if (index === undefined) return null;
  return <span className="zodiac-mascot" data-zodiac={sign}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    {sign === 'aries' && <AriesMascot size="100%" animated={false} />}
    {sign === GUARDIAN_ARIES && <GuardianAries />}
    {sign !== 'aries' && sign !== GUARDIAN_ARIES && <ZodiacGuardian sign={sign} index={index} />}
  </span>;
}

export const ZodiacSignInRow = memo(function ZodiacSignInRow() {
  return <div className="auth-zodiac-row" aria-hidden="true">
    {MASCOT_ORDER.map(id => <ZodiacMascot key={id} sign={id} />)}
  </div>;
});
