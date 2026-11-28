import React, { useState } from 'react';
import Icon from './Icon';
import { ZODIAC } from '../lib/homeHero';
import { t as tr } from '../lib/i18n';
import ariesCalm from '../assets/plush-zodiac/aries.webp';
import ariesHappy from '../assets/plush-zodiac/aries-happy.webp';
import ariesConcerned from '../assets/plush-zodiac/aries-concerned.webp';
import taurusCalm from '../assets/plush-zodiac/taurus.webp';
import taurusHappy from '../assets/plush-zodiac/taurus-happy.webp';
import taurusConcerned from '../assets/plush-zodiac/taurus-concerned.webp';
import geminiCalm from '../assets/plush-zodiac/gemini.webp';
import geminiHappy from '../assets/plush-zodiac/gemini-happy.webp';
import geminiConcerned from '../assets/plush-zodiac/gemini-concerned.webp';
import cancerCalm from '../assets/plush-zodiac/cancer.webp';
import cancerHappy from '../assets/plush-zodiac/cancer-happy.webp';
import cancerConcerned from '../assets/plush-zodiac/cancer-concerned.webp';
import leoCalm from '../assets/plush-zodiac/leo.webp';
import leoHappy from '../assets/plush-zodiac/leo-happy.webp';
import leoConcerned from '../assets/plush-zodiac/leo-concerned.webp';
import virgoCalm from '../assets/plush-zodiac/virgo.webp';
import virgoHappy from '../assets/plush-zodiac/virgo-happy.webp';
import virgoConcerned from '../assets/plush-zodiac/virgo-concerned.webp';
import libraCalm from '../assets/plush-zodiac/libra.webp';
import libraHappy from '../assets/plush-zodiac/libra-happy.webp';
import libraConcerned from '../assets/plush-zodiac/libra-concerned.webp';
import scorpioCalm from '../assets/plush-zodiac/scorpio.webp';
import scorpioHappy from '../assets/plush-zodiac/scorpio-happy.webp';
import scorpioConcerned from '../assets/plush-zodiac/scorpio-concerned.webp';
import sagittariusCalm from '../assets/plush-zodiac/sagittarius.webp';
import sagittariusHappy from '../assets/plush-zodiac/sagittarius-happy.webp';
import sagittariusConcerned from '../assets/plush-zodiac/sagittarius-concerned.webp';
import capricornCalm from '../assets/plush-zodiac/capricorn.webp';
import capricornHappy from '../assets/plush-zodiac/capricorn-happy.webp';
import capricornConcerned from '../assets/plush-zodiac/capricorn-concerned.webp';
import aquariusCalm from '../assets/plush-zodiac/aquarius.webp';
import aquariusHappy from '../assets/plush-zodiac/aquarius-happy.webp';
import aquariusConcerned from '../assets/plush-zodiac/aquarius-concerned.webp';
import piscesCalm from '../assets/plush-zodiac/pisces.webp';
import piscesHappy from '../assets/plush-zodiac/pisces-happy.webp';
import piscesConcerned from '../assets/plush-zodiac/pisces-concerned.webp';

const portraits = {
  aries: { calm: ariesCalm, happy: ariesHappy, concerned: ariesConcerned },
  taurus: { calm: taurusCalm, happy: taurusHappy, concerned: taurusConcerned },
  gemini: { calm: geminiCalm, happy: geminiHappy, concerned: geminiConcerned },
  cancer: { calm: cancerCalm, happy: cancerHappy, concerned: cancerConcerned },
  leo: { calm: leoCalm, happy: leoHappy, concerned: leoConcerned },
  virgo: { calm: virgoCalm, happy: virgoHappy, concerned: virgoConcerned },
  libra: { calm: libraCalm, happy: libraHappy, concerned: libraConcerned },
  scorpio: { calm: scorpioCalm, happy: scorpioHappy, concerned: scorpioConcerned },
  sagittarius: { calm: sagittariusCalm, happy: sagittariusHappy, concerned: sagittariusConcerned },
  capricorn: { calm: capricornCalm, happy: capricornHappy, concerned: capricornConcerned },
  aquarius: { calm: aquariusCalm, happy: aquariusHappy, concerned: aquariusConcerned },
  pisces: { calm: piscesCalm, happy: piscesHappy, concerned: piscesConcerned },
};
const collection = ZODIAC.map(({ id, name }) => ({
  id, name, portraits: portraits[id], style: `plush:${id}`, requiresPlus: id !== 'aries',
}));
const EXPRESSIONS = [['calm', 'Calm'], ['happy', 'Happy'], ['concerned', 'Concerned']];

export function resolveHomeMascot(style, canUsePremium) {
  const plush = collection.find(item => item.style === style);
  if (plush && (!plush.requiresPlus || canUsePremium)) return { mode: 'plush', plush };
  return { mode: style === 'photo' ? 'photo' : 'ram', plush: undefined };
}

export function plushExpressionForMood(mood) {
  if (mood === 'smile') return 'happy';
  if (mood === 'sad' || mood === 'angry') return 'concerned';
  return 'calm';
}

export function PlushPortrait({ mascot, expression = 'calm', lazy = false }) {
  return <img className="plush-portrait" data-expression={expression} src={mascot.portraits[expression]} alt="" width="320" height="320"
    loading={lazy ? 'lazy' : undefined} decoding="async" draggable={false} />;
}

export function PlushCollection({ equipped, canUsePremium, onApply, onCancel, onOpenPlans }) {
  const [preview, setPreview] = useState(equipped || collection[0]);
  const [expression, setExpression] = useState('calm');
  const isCurrent = equipped?.id === preview.id;
  const isLocked = preview.requiresPlus && !canUsePremium;

  return <div className="plush-picker">
    <figure className="plush-stage" aria-live="polite" aria-atomic="true">
      <div className="plush-stage-art" key={preview.id}><PlushPortrait key={expression} mascot={preview} expression={expression} /></div>
      <figcaption>
        <strong>{tr(preview.name)}</strong>
        <span className="plush-stage-tier">{tr(preview.requiresPlus ? 'Pro+' : 'Free')}</span>
      </figcaption>
    </figure>
    <div className="plush-expression-options" role="group" aria-label={tr('Expressions')}>
      {EXPRESSIONS.map(([id, label]) => <button key={id} type="button" aria-pressed={expression === id} onClick={() => setExpression(id)}>{tr(label)}</button>)}
    </div>
    <div className="plush-grid" role="group" aria-label={tr('Plush Zodiac')}>
      {collection.map(item => <button key={item.id} type="button" className="plush-option"
        data-plush-sign={item.id} aria-pressed={preview.id === item.id} onClick={() => setPreview(item)}>
        {item.id === equipped?.id && <Icon name="check" size={13} className="plush-option-marker" />}
        {item.requiresPlus && !canUsePremium && <span className="plush-option-lock" aria-hidden="true"><Icon name="lock" size={11} /></span>}
        <PlushPortrait mascot={item} lazy />
        <span>{tr(item.name)}</span>
      </button>)}
    </div>
    <div className="sheet-actions plush-actions">
      <button type="button" className="secondary-button" onClick={onCancel}>{tr('Cancel')}</button>
      {isLocked
        ? <button type="button" className="primary-button" onClick={onOpenPlans}><Icon name="lock" size={16} />{tr('View plans')}</button>
        : <button type="button" className="primary-button" disabled={isCurrent} onClick={() => onApply(preview.style)}>{tr(isCurrent ? 'Current' : 'Use mascot')}</button>}
    </div>
  </div>;
}
