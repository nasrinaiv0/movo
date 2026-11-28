import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AriesMascot, { ARIES_STATES } from './original/components/AriesMascot';
import { DressedAries } from './DressedAries';
import { BrandBars, GarmentPreview } from './Garment';
import { CATEGORIES, garmentFor, LOOKS, PALETTE, WARDROBE } from './garments';
import './style.css';

const EMPTY_OUTFIT = {};
const PICKER_CATEGORIES = ['cap', 'scarf', 'shirt', 'jacket', 'pants', 'shoes'];
const TRANSITION_MS = 220;

const ICONS = {
  hanger: 'M10 7a2 2 0 1 1 3 1.7 2 2 0 0 0-1 1.7v.6l8 5a1 1 0 0 1-.5 2h-15a1 1 0 0 1-.5-2l8-5',
  shuffle: 'M3 6h3c3 0 4 2 6 6s3 6 6 6h3m-4-4 4 4-4 4M3 18h3c1.5 0 2.5-.6 3.4-1.6m5.2-8.8C15.5 6.6 16.5 6 18 6h3m-4-4 4 4-4 4',
  reset: 'M3 11a9 9 0 1 1 2.5 7.5M3 4v7h7',
  close: 'm6 6 12 12M18 6 6 18',
  check: 'm5 12 4 4L19 6',
};

function Icon({ name, size = 19 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

const LookCard = memo(function LookCard({ look, active, onChoose, onBrowse }) {
  return <article className="look">
    <button type="button" className="look-preset" aria-pressed={active} onClick={() => onChoose(look)}>
      <div className="look-model">
        <DressedAries outfit={look.outfit} expression={look.expression} />
      </div>
      <span className="look-name">{look.name}{active && <Icon name="check" size={16} />}</span>
    </button>
    <ul className="look-pieces">
      {['jacket', 'cap', 'pants', 'shoes', 'shirt'].map(category => {
        const item = garmentFor(category, look.outfit[category]);
        return <li key={category}>
          <button type="button" className="look-piece" aria-label={`Browse ${WARDROBE[category].label.toLowerCase()} for the ${look.name} look`}
            aria-haspopup="dialog" onClick={() => onBrowse(look, category)}>
            <span className="piece-image"><GarmentPreview category={category} choice={look.outfit[category]} /></span>
            <span><b>{WARDROBE[category].singular}</b><small>{item.name}</small></span>
          </button>
        </li>;
      })}
    </ul>
  </article>;
});

const ExpressionTile = memo(function ExpressionTile({ state, active, onSelect }) {
  return <button type="button" className="style-tile" aria-pressed={active} onClick={() => onSelect(state.id)}>
    <span className="tile-model"><AriesMascot state={state.id} animated={false} size="100%" /></span>
    <span>{state.label}</span>
  </button>;
});

const ClothingTile = memo(function ClothingTile({ category, style, current, choose }) {
  const active = style ? current?.id === style.id : !current;
  const choice = style && (active ? current : style);
  const sample = useMemo(() => choice ? { [category]: choice } : EMPTY_OUTFIT, [category, choice]);
  return <button type="button" className="style-tile" aria-pressed={active}
    onClick={() => choose(category, style ? (active ? current : { id: style.id }) : null)}>
    <span className="tile-model">
      {choice ? <DressedAries outfit={sample} /> : <AriesMascot animated={false} size="100%" />}
    </span>
    <span>{style?.name || (category === 'scarf' ? 'Original scarf' : 'None')}</span>
  </button>;
});

function CostumePicker({ dialog, category, setCategory, outfit, previous, expression, setExpression, motion, setMotion,
  status, choose, randomize, reset, onClose }) {
  const choice = outfit[category];
  const clothing = category ? WARDROBE[category] : null;
  const item = clothing && garmentFor(category, choice);
  const color = choice?.color ?? item?.color;
  const expressionLabel = ARIES_STATES.find(state => state.id === expression).label;
  const categoryButtons = useRef({});

  function backToExpressions() {
    categoryButtons.current[category]?.focus();
    setCategory(null);
  }

  return <dialog ref={dialog} className="costume-picker" aria-labelledby="picker-title" onClose={onClose} onClick={event => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }}>
    <div className="picker-content" data-motion={motion ? 'on' : 'off'}>
      <header className="picker-heading">
        <div><h2 id="picker-title">Your mascot</h2><p className="picker-status" role="status">{status}</p></div>
        <button type="button" className="icon-button" aria-label="Close costume picker" autoFocus onClick={() => dialog.current.close()}>
          <Icon name="close" />
        </button>
      </header>
      <section aria-label="Meet Aries">
        <div className="meet-aries">
          <h3>Meet Aries</h3>
          <button type="button" className="text-button" onClick={() => setMotion(!motion)}>
            {motion ? 'Pause animation' : 'Play animation'}
          </button>
        </div>
        <div className="fitting">
          <figure className="fitting-model">
            <DressedAries outfit={outfit} previous={previous} expression={expression} animated={motion} label="Aries in the current outfit" />
            <figcaption aria-live="polite">{expressionLabel}</figcaption>
          </figure>
          <div className="category-buttons" role="group" aria-label="Clothing category">
            {PICKER_CATEGORIES.map(key => <button type="button" key={key}
              ref={node => { categoryButtons.current[key] = node; }}
              aria-pressed={key === category} aria-controls="aries-choices"
              onClick={() => setCategory(key === category ? null : key)}>
              {WARDROBE[key].singular}
            </button>)}
          </div>
        </div>
        <div id="aries-choices" className="picker-options">
          {clothing && <div className="picker-subheading">
            <h3>{clothing.label}</h3>
            <button type="button" className="text-button" onClick={backToExpressions}>Back to expressions</button>
          </div>}
          <div className="style-grid" role="group" aria-label={clothing ? clothing.label + ' styles' : 'Expressions'}>
            {clothing
              ? [null, ...clothing.styles].map(style => <ClothingTile key={category + ':' + (style?.id || 'none')}
                  category={category} style={style} current={choice} choose={choose} />)
              : ARIES_STATES.map(state => <ExpressionTile key={state.id} state={state}
                  active={state.id === expression} onSelect={setExpression} />)}
          </div>
          {item && <div className="palette" role="group" aria-label={clothing.label + ' color'}>
            <span className="palette-label">Color</span>
            <button type="button" className="swatch" aria-label="Original color" title="Original color"
              style={{ '--swatch': item.color }} aria-pressed={!choice.color}
              onClick={() => choose(category, { id: choice.id })} />
            {PALETTE.map(swatch => <button type="button" className="swatch" key={swatch.color} aria-label={swatch.name} title={swatch.name}
              style={{ '--swatch': swatch.color }} aria-pressed={choice.color === swatch.color}
              onClick={() => choose(category, { ...choice, color: swatch.color })} />)}
            <input type="color" className="color-input" value={color} aria-label="Custom color" title="Custom color"
              onChange={event => choose(category, { ...choice, color: event.target.value })} />
          </div>}
        </div>
      </section>
      {clothing && <footer className="picker-actions">
        <button type="button" className="action secondary" onClick={randomize}><Icon name="shuffle" />Randomize</button>
        <button type="button" className="action secondary" onClick={reset}><Icon name="reset" />Reset</button>
        <button type="button" className="action primary done" onClick={() => dialog.current.close()}>Done</button>
      </footer>}
    </div>
  </dialog>;
}

function App() {
  const [{ current: outfit, previous }, setOutfit] = useState({ current: EMPTY_OUTFIT, previous: null });
  const [expression, setExpression] = useState('welcome');
  const [motion, setMotion] = useState(true);
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState('Original Aries');
  const [pickerOpen, setPickerOpen] = useState(false);
  const dialog = useRef(null);

  useEffect(() => {
    if (!previous) return;
    const timeout = setTimeout(() => setOutfit(value => ({ ...value, previous: null })), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [previous]);

  const apply = useCallback((next, name) => {
    const animate = motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setOutfit(value => value.current === next ? value : { current: next, previous: animate ? value.current : null });
    setStatus(name);
  }, [motion]);

  const chooseLook = useCallback(look => {
    apply(look.outfit, look.name);
    setExpression(look.expression);
  }, [apply]);

  function choose(category, choice) {
    if (outfit[category] === choice) return;
    const next = { ...outfit };
    if (choice) next[category] = choice;
    else delete next[category];
    apply(next, Object.keys(next).length ? 'Custom outfit' : 'Original Aries');
  }

  function randomize() {
    const next = Object.fromEntries(CATEGORIES.map(key => {
      const options = WARDROBE[key].styles.filter(style => style.id !== outfit[key]?.id);
      const { id } = options[Math.floor(Math.random() * options.length)];
      return [key, { id }];
    }));
    apply(next, 'Randomized outfit');
  }

  const openPicker = useCallback((key = null) => {
    setCategory(key);
    setPickerOpen(true);
  }, []);
  const browseLook = useCallback((look, key) => {
    chooseLook(look);
    openPicker(key);
  }, [chooseLook, openPicker]);

  useEffect(() => {
    if (pickerOpen && !dialog.current.open) dialog.current.showModal();
  }, [pickerOpen]);

  return <main className="page">
    <header className="masthead">
      <div className="wordmark"><svg viewBox="-2 -1 25 24" width="36" height="35" aria-hidden="true"><BrandBars /></svg>MOVO</div>
      <div className="title-line"><h1>Aries Mascot Costumes</h1></div>
    </header>
    <div className="toolbar">
      <div className="outfit-status" role="status"><span>Your outfit</span><strong>{status}</strong></div>
      <div className="toolbar-actions">
        <button type="button" className="action primary" aria-haspopup="dialog" onClick={() => openPicker()}>
          <Icon name="hanger" />Customize Aries
        </button>
        <button type="button" className="action secondary" aria-haspopup="dialog" onClick={() => { randomize(); openPicker(); }}>
          <Icon name="shuffle" />Randomize
        </button>
        <button type="button" className="action secondary" aria-haspopup="dialog" onClick={() => { apply(EMPTY_OUTFIT, 'Original Aries'); openPicker(); }}>
          <Icon name="reset" />Reset
        </button>
      </div>
    </div>
    <section className="lookbook" aria-label="Costume collection">
      {LOOKS.map(look => <LookCard key={look.name} look={look} active={outfit === look.outfit} onChoose={chooseLook} onBrowse={browseLook} />)}
    </section>
    {pickerOpen && <CostumePicker dialog={dialog} category={category} setCategory={setCategory} outfit={outfit} previous={previous}
      expression={expression} setExpression={setExpression} motion={motion} setMotion={setMotion} status={status} choose={choose}
      randomize={randomize} reset={() => apply(EMPTY_OUTFIT, 'Original Aries')} onClose={() => setPickerOpen(false)} />}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
