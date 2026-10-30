import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';

const SIZES = ['S', 'M', 'L'];
const SIZE_NAMES = { S: 'Small', M: 'Medium', L: 'Large' };
const HOLD_MS = 480;
const RESIZE_STEP = 52;
const SWIPE_MIN = 44;

/** Applies a saved layout ({ order, hidden }) to a list of boxes, keeping any new boxes at their default spot. */
export function arrange(boxes, layout = {}) {
  const order = layout.order || [];
  const rank = (id) => { const i = order.indexOf(id); return i === -1 ? order.length + boxes.findIndex(b => b.id === id) : i; };
  return [...boxes].sort((a, b) => rank(a.id) - rank(b.id));
}

/** A box's saved size, falling back to Medium (or its only allowed size). */
export function sizeOf(box, layout = {}) {
  const allowed = box.sizes || SIZES; const saved = layout.sizes?.[box.id];
  return allowed.includes(saved) ? saved : allowed.includes('M') ? 'M' : allowed[0];
}

/** A box's saved chart style key, falling back to its first style. */
export function styleOf(box, layout = {}) {
  const saved = layout.styles?.[box.id];
  return box.styles?.some(s => s[0] === saved) ? saved : box.styles?.[0]?.[0];
}

const render = (b, layout) => (typeof b.node === 'function' ? b.node({ size: sizeOf(b, layout), style: styleOf(b, layout) }) : b.node);
const rtl = () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl';

/**
 * Screen sections people can hide, restore, reorder and resize, in the style of iOS Control Center editing:
 * hold any box to start, drag the corner handle to resize, swipe a chart sideways to change its style,
 * drag the grip to move, tap − to remove. Hidden boxes wait in a tray at the bottom.
 */
export default function EditableBoxes({ boxes, layout = {}, editing, onChange, onDone, onEdit, title }) {
  const ordered = arrange(boxes.filter(b => b.node), layout);
  const hidden = new Set(layout.hidden || []);
  const visible = ordered.filter(b => !hidden.has(b.id));
  const save = (next) => onChange({ ...layout, order: next.order || ordered.map(b => b.id), hidden: next.hidden ?? [...hidden], ...(next.sizes ? { sizes: next.sizes } : {}), ...(next.styles ? { styles: next.styles } : {}) });
  const tail = () => ordered.filter(b => hidden.has(b.id)).map(b => b.id);
  const move = (id, dir) => {
    const ids = visible.map(b => b.id); const i = ids.indexOf(id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save({ order: [...ids, ...tail()] });
  };
  const hide = (id) => save({ hidden: [...hidden, id] });
  const show = (id) => save({ hidden: [...hidden].filter(x => x !== id), order: [...visible.map(b => b.id), id, ...ordered.filter(b => hidden.has(b.id) && b.id !== id).map(b => b.id)] });
  const setSize = (b, size) => { if (size !== sizeOf(b, layout)) save({ sizes: { ...(layout.sizes || {}), [b.id]: size } }); };
  const stepStyle = (b, dir) => {
    const keys = b.styles.map(s => s[0]); const i = keys.indexOf(styleOf(b, layout));
    save({ styles: { ...(layout.styles || {}), [b.id]: keys[(i + dir + keys.length) % keys.length] } });
  };

  /* Hold to edit: a still press of about half a second opens Customize, like holding an iPhone home screen. */
  const press = useRef(null);
  const lastType = useRef('mouse');
  const endPress = () => { const p = press.current; if (p) { clearTimeout(p.timer); p.el.classList.remove('pressing'); } press.current = null; };
  const startPress = (e) => {
    lastType.current = e.pointerType;
    if (!onEdit || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const el = e.currentTarget;
    endPress();
    el.classList.add('pressing');
    press.current = { el, x: e.clientX, y: e.clientY, timer: setTimeout(() => { el.classList.remove('pressing'); press.current = null; try { navigator.vibrate?.(12); } catch { /* unsupported */ } onEdit(); }, HOLD_MS) };
  };
  const movePress = (e) => { const p = press.current; if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) endPress(); };

  /* Drag to reorder: the grip follows the finger; passing a neighbour's midpoint swaps the two boxes. */
  const els = useRef({});
  const drag = useRef(null);
  const [dragId, setDragId] = useState('');
  const [dy, setDy] = useState(0);
  const capture = (e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ } };
  const down = (e, id) => {
    e.preventDefault(); capture(e);
    drag.current = { id, startY: e.clientY, ids: visible.map(b => b.id) };
    setDragId(id); setDy(0);
  };
  const moveDrag = (e) => {
    const d = drag.current; if (!d) return;
    let offset = e.clientY - d.startY;
    const i = d.ids.indexOf(d.id);
    const neighbour = offset > 0 ? d.ids[i + 1] : d.ids[i - 1];
    const el = neighbour && els.current[neighbour];
    if (el) {
      const h = el.getBoundingClientRect().height + 14;
      if (Math.abs(offset) > h / 2) {
        const j = offset > 0 ? i + 1 : i - 1;
        [d.ids[i], d.ids[j]] = [d.ids[j], d.ids[i]];
        d.startY += offset > 0 ? h : -h; offset = e.clientY - d.startY;
        save({ order: [...d.ids, ...tail()] });
      }
    }
    setDy(offset);
  };
  const endDrag = () => { drag.current = null; setDragId(''); setDy(0); };

  /* Resize: drag the corner handle down/outward to grow, up/inward to shrink; a tap steps to the next size. */
  const resize = useRef(null);
  const resizeDown = (e, b) => { e.preventDefault(); capture(e); resize.current = { x: e.clientX, y: e.clientY, start: sizeOf(b, layout), moved: false }; };
  const resizeMove = (e, b) => {
    const r = resize.current; if (!r) return;
    const dx = (e.clientX - r.x) * (rtl() ? -1 : 1); const d = (e.clientY - r.y) + dx * 0.6;
    if (Math.abs(d) > 6) r.moved = true;
    const allowed = b.sizes || SIZES;
    const next = allowed[Math.max(0, Math.min(allowed.length - 1, allowed.indexOf(r.start) + Math.round(d / RESIZE_STEP)))];
    setSize(b, next);
  };
  const resizeUp = (b) => {
    const r = resize.current; resize.current = null;
    if (r && !r.moved) { const allowed = b.sizes || SIZES; setSize(b, allowed[(allowed.indexOf(sizeOf(b, layout)) + 1) % allowed.length]); }
  };

  /* Swipe a chart sideways to switch its style; vertical movement is left to the page so scrolling still works. */
  const swipe = useRef(null);
  const [swipeX, setSwipeX] = useState({ id: '', x: 0 });
  const swipeDown = (e, b) => { swipe.current = { id: b.id, x: e.clientX, y: e.clientY, on: false }; };
  const swipeMove = (e) => {
    const s = swipe.current; if (!s) return;
    const dx = e.clientX - s.x; const dyy = e.clientY - s.y;
    if (!s.on && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dyy) * 1.2) { s.on = true; capture(e); }
    if (s.on) setSwipeX({ id: s.id, x: dx });
  };
  const swipeUp = (e, b) => {
    const s = swipe.current; swipe.current = null; setSwipeX({ id: '', x: 0 });
    if (!s?.on) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) >= SWIPE_MIN) stepStyle(b, (dx < 0 ? 1 : -1) * (rtl() ? -1 : 1));
  };

  if (!editing) {
    return visible.map(b => <div key={b.id} className={`box-slot size-${sizeOf(b, layout)}`} onPointerDown={startPress} onPointerMove={movePress} onPointerUp={endPress} onPointerCancel={endPress} onPointerLeave={endPress}
      onContextMenu={(e) => { if (onEdit && lastType.current !== 'mouse') e.preventDefault(); }}>{render(b, layout)}</div>);
  }
  return <>
    <div className="edit-bar" role="toolbar" aria-label={tr('Customize {name}', { name: title })}>
      <span><strong>{tr('Customize {name}', { name: title })}</strong><small>{tr('Drag to move, drag the corner to resize, swipe a chart to change it.')}</small></span>
      <button type="button" className="primary-button" onClick={onDone}>{tr('Done')}</button>
    </div>
    {visible.map((b, i) => {
      const size = sizeOf(b, layout); const allowed = b.sizes || SIZES; const styles = b.styles || [];
      const style = styleOf(b, layout); const styleName = styles.find(s => s[0] === style)?.[1];
      const sliding = swipeX.id === b.id ? swipeX.x : 0;
      return <div key={b.id} ref={el => { els.current[b.id] = el; }} className={`edit-box size-${size}${dragId === b.id ? ' dragging' : ''}`} style={{ '--d': `${(i % 3) * 60}ms`, ...(dragId === b.id ? { transform: `translateY(${dy}px)` } : {}) }}>
        <div className="edit-tools">
          <button type="button" className="edit-remove" aria-label={tr('Remove {name}', { name: b.label })} onClick={() => hide(b.id)}><Icon name="minus" size={14} strokeWidth={3} /></button>
          <span className="edit-name">{b.label}</span>
          <button type="button" className="edit-tool" aria-label={tr('Move {name} up', { name: b.label })} disabled={i === 0} onClick={() => move(b.id, -1)}><Icon name="arrowUp" size={14} strokeWidth={2.4} /></button>
          <button type="button" className="edit-tool" aria-label={tr('Move {name} down', { name: b.label })} disabled={i === visible.length - 1} onClick={() => move(b.id, 1)}><Icon name="arrowDown" size={14} strokeWidth={2.4} /></button>
          <button type="button" className="edit-tool edit-grip" aria-label={tr('Drag to move {name}', { name: b.label })} onPointerDown={e => down(e, b.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><Icon name="grip" size={16} /></button>
        </div>
        <div className="edit-frame">
          <div className="edit-content" inert="" style={sliding ? { transform: `translateX(${sliding * 0.6}px) scale(.97)`, opacity: Math.max(0.45, 1 - Math.abs(sliding) / 260) } : undefined}>{render(b, layout)}</div>
          {styles.length > 1 && <div className="edit-swipe" aria-hidden="true" onPointerDown={e => swipeDown(e, b)} onPointerMove={swipeMove} onPointerUp={e => swipeUp(e, b)} onPointerCancel={() => { swipe.current = null; setSwipeX({ id: '', x: 0 }); }} />}
          {allowed.length > 1 && <button type="button" className="edit-resize" aria-label={tr('Resize {name}: {size}', { name: b.label, size: tr(SIZE_NAMES[size]) })}
            onPointerDown={e => resizeDown(e, b)} onPointerMove={e => resizeMove(e, b)} onPointerUp={() => resizeUp(b)} onPointerCancel={() => { resize.current = null; }}
            onKeyDown={(e) => { const k = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[e.key]; if (k) { e.preventDefault(); const j = allowed.indexOf(size) + k; if (allowed[j]) setSize(b, allowed[j]); } }}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M20 8v4a8 8 0 0 1-8 8H8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
            <span className="edit-size">{tr(SIZE_NAMES[size])}</span>
          </button>}
        </div>
        {styles.length > 1 && <div className="edit-styles" role="group" aria-label={tr('Chart style: {name}', { name: tr(styleName) })}>
          <button type="button" className="edit-tool" aria-label={tr('Previous chart style')} onClick={() => stepStyle(b, -1)}><Icon name="back" size={14} strokeWidth={2.4} /></button>
          <span className="edit-dots">{styles.map(s => <i key={s[0]} className={s[0] === style ? 'on' : ''} />)}<b>{tr(styleName)}</b></span>
          <button type="button" className="edit-tool" aria-label={tr('Next chart style')} onClick={() => stepStyle(b, 1)}><Icon name="chevron" size={14} strokeWidth={2.4} /></button>
        </div>}
      </div>;
    })}
    <section className="edit-tray" aria-label={tr('Hidden boxes')}>
      <h3>{tr('Hidden')}</h3>
      {hidden.size ? <div className="edit-tray-list">{ordered.filter(b => hidden.has(b.id)).map(b => <button type="button" key={b.id} onClick={() => show(b.id)} aria-label={tr('Add {name}', { name: b.label })}><Icon name="plus" size={14} strokeWidth={2.4} />{b.label}</button>)}</div> : <p>{tr('Removed boxes appear here so you can add them back.')}</p>}
    </section>
  </>;
}
