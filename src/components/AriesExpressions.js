import React, { useId, useState } from 'react';
import AriesMascot, { ARIES_STATES } from './AriesMascot';
import { t as tr } from '../lib/i18n';
import './AriesExpressions.css';

/** A local character preview: exploring a face never changes spending moods or saved preferences. */
export default function AriesExpressions() {
  const heading = useId();
  const [selected, setSelected] = useState('welcome');
  const [paused, setPaused] = useState(false);
  const expression = ARIES_STATES.find(item => item.id === selected) || ARIES_STATES[0];

  return <section className="aries-expressions" aria-labelledby={heading}>
    <div className="aries-expressions-heading">
      <h3 id={heading}>{tr('Meet Aries')}</h3>
      <button type="button" className="aries-animation-toggle" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{tr(paused ? 'Play animation' : 'Pause animation')}</button>
    </div>
    <figure className="aries-expression-preview">
      <AriesMascot state={selected} size={150} animated={!paused} />
      <figcaption aria-live="polite">{tr(expression.label)}</figcaption>
    </figure>
    <div className="aries-expression-grid" role="group" aria-label={tr('Expressions')}>
      {ARIES_STATES.map(item => <button type="button" className={`aries-expression-option${selected === item.id ? ' selected' : ''}`} key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
        <AriesMascot state={item.id} size={54} animated={false} />
        <span>{tr(item.label)}</span>
      </button>)}
    </div>
    <p className="aries-expression-note">{tr('Expression preview only. On Home, Aries follows your spending limits.')}</p>
  </section>;
}
