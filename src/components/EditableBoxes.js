import React, { useRef, useState } from 'react';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';

/** Applies a saved layout ({ order, hidden }) to a list of boxes, keeping any new boxes at their default spot. */
export function arrange(boxes, layout = {}) {
  const order = layout.order || [];
  const rank = (id) => { const i = order.indexOf(id); return i === -1 ? order.length + boxes.findIndex(b => b.id === id) : i; };
  return [...boxes].sort((a, b) => rank(a.id) - rank(b.id));
}

/**
 * Screen sections people can hide, restore and reorder, in the style of iOS Control Center editing:
 * a minus badge removes a box, arrows move it, and hidden boxes wait in a tray at the bottom.
 */
export default function EditableBoxes({ boxes, layout = {}, editing, onChange, onDone, title }) {
  const ordered = arrange(boxes.filter(b => b.node), layout);
  const hidden = new Set(layout.hidden || []);
  const visible = ordered.filter(b => !hidden.has(b.id));
  const save = (next) => onChange({ order: (next.order || ordered.map(b => b.id)), hidden: next.hidden ?? [...hidden] });
  const move = (id, dir) => {
    const ids = visible.map(b => b.id); const i = ids.indexOf(id); const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save({ order: [...ids, ...ordered.filter(b => hidden.has(b.id)).map(b => b.id)] });
  };
  const hide = (id) => save({ hidden: [...hidden, id] });
  const show = (id) => save({ hidden: [...hidden].filter(x => x !== id), order: [...visible.map(b => b.id), id, ...ordered.filter(b => hidden.has(b.id) && b.id !== id).map(b => b.id)] });

  /* Drag to reorder: the grip follows the finger; passing a neighbour's midpoint swaps the two boxes. */
  const els = useRef({});
  const drag = useRef(null);
  const [dragId, setDragId] = useState('');
  const [dy, setDy] = useState(0);
  const down = (e, id) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
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
        save({ order: [...d.ids, ...ordered.filter(b => hidden.has(b.id)).map(b => b.id)] });
      }
    }
    setDy(offset);
  };
  const endDrag = () => { drag.current = null; setDragId(''); setDy(0); };

  if (!editing) return visible.map(b => <React.Fragment key={b.id}>{b.node}</React.Fragment>);
  return <>
    <div className="edit-bar" role="toolbar" aria-label={tr('Customize {name}', { name: title })}>
      <span><strong>{tr('Customize {name}', { name: title })}</strong><small>{tr('Drag to move, tap − to remove.')}</small></span>
      <button type="button" className="primary-button" onClick={onDone}>{tr('Done')}</button>
    </div>
    {visible.map((b, i) => <div key={b.id} ref={el => { els.current[b.id] = el; }} className={`edit-box${dragId === b.id ? ' dragging' : ''}`} style={{ '--d': `${(i % 3) * 60}ms`, ...(dragId === b.id ? { transform: `translateY(${dy}px)` } : {}) }}>
      <div className="edit-tools">
        <button type="button" className="edit-remove" aria-label={tr('Remove {name}', { name: b.label })} onClick={() => hide(b.id)}><Icon name="minus" size={14} strokeWidth={3} /></button>
        <span className="edit-name">{b.label}</span>
        <button type="button" className="edit-tool" aria-label={tr('Move {name} up', { name: b.label })} disabled={i === 0} onClick={() => move(b.id, -1)}><Icon name="arrowUp" size={14} strokeWidth={2.4} /></button>
        <button type="button" className="edit-tool" aria-label={tr('Move {name} down', { name: b.label })} disabled={i === visible.length - 1} onClick={() => move(b.id, 1)}><Icon name="arrowDown" size={14} strokeWidth={2.4} /></button>
        <button type="button" className="edit-tool edit-grip" aria-label={tr('Drag to move {name}', { name: b.label })} onPointerDown={e => down(e, b.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><Icon name="grip" size={16} /></button>
      </div>
      <div className="edit-content" inert="">{b.node}</div>
    </div>)}
    <section className="edit-tray" aria-label={tr('Hidden boxes')}>
      <h3>{tr('Hidden')}</h3>
      {hidden.size ? <div className="edit-tray-list">{ordered.filter(b => hidden.has(b.id)).map(b => <button type="button" key={b.id} onClick={() => show(b.id)} aria-label={tr('Add {name}', { name: b.label })}><Icon name="plus" size={14} strokeWidth={2.4} />{b.label}</button>)}</div> : <p>{tr('Removed boxes appear here so you can add them back.')}</p>}
    </section>
  </>;
}
