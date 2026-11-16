import React from 'react';
import { t as tr } from '../lib/i18n';
import { PRIMARY, GROUPS } from '../lib/categories';
import './ReceiptBreakdown.css';

const asMoney = raw => {
  if (String(raw).trim() === '') return null;
  const value = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 0 || value >= 1e12) return null;
  return Math.round(value * 100) / 100;
};

function MoneyField({ label, value, onChange }) {
  return <label className="scan-field"><span>{tr(label)}</span>
    <input type="number" min="0" max="999999999999.99" step="0.01" inputMode="decimal"
      value={value ?? ''} onChange={event => onChange(asMoney(event.target.value))} placeholder="0.00" />
  </label>;
}

/** Editable, review-first extraction. Never automatically creates new financial transactions. */
export default function ReceiptBreakdown({ receipt, onChange }) {
  const items = Array.isArray(receipt.items) ? receipt.items : [];
  const set = (name, value) => onChange({ ...receipt, [name]: value });
  const updateItem = (index, patch) => onChange({ ...receipt, items: items.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const chargeMatches = receipt.cashTendered == null || receipt.change == null || !(Number(receipt.amount) > 0)
    || Math.abs(Math.round((receipt.cashTendered - receipt.change - Number(receipt.amount)) * 100)) <= 2;

  return <section className="scan-details" aria-label={tr('Receipt details')}>
    {!!receipt.warnings?.length && <div className="scan-alert" role="status">
      <strong>{tr('Review extracted details')}</strong>
      {receipt.warnings.map((message, index) => <p key={index}>{tr(message)}</p>)}
    </div>}
    {!chargeMatches && <p className="scan-alert" role="alert">{tr('Cash, change and total do not match. Check the receipt.')}</p>}
    <div className="scan-section-head"><h3>{tr('Receipt items')}</h3><span>{items.length}</span></div>
    {items.map((item, index) => <div className="scan-item" key={index}>
      <div className="scan-item-row">
        <label className="scan-item-name"><span>{tr('Item name')}</span>
          <input value={item.name} maxLength={90} onChange={event => updateItem(index, { name: event.target.value })} />
        </label>
        <label className="scan-item-qty"><span>{tr('Qty')}</span>
          <input type="number" min="1" max="999" inputMode="numeric" value={item.quantity}
            onChange={event => updateItem(index, { quantity: Math.max(1, Math.min(999, Math.round(Number(event.target.value) || 1))) })} />
        </label>
        <button type="button" className="scan-item-remove" aria-label={tr('Remove item')}
          onClick={() => set('items', items.filter((_, i) => i !== index))}>×</button>
      </div>
      <div className="scan-item-row">
        <MoneyField label="Line total" value={item.total} onChange={value => updateItem(index, { total: value ?? 0 })} />
        <label className="scan-item-options"><span>{tr('Included with item')}</span>
          <input value={(item.options || []).join(', ')} maxLength={240}
            onChange={event => updateItem(index, { options: event.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder={tr('Optional')} />
        </label>
      </div>
      <label className="scan-field"><span>{tr('Category')}</span>
        <select value={item.category || ''} onChange={event => updateItem(index, { category: event.target.value })}>
          <option value="">—</option>
          {PRIMARY.map(p => <option key={p.id} value={p.id}>{tr(p.label)}</option>)}
          {GROUPS.map(g => <optgroup key={g.id} label={tr(g.label)}>
            {g.subs.map(([sid, name]) => <option value={g.id + ':' + sid} key={sid}>{tr(name)}</option>)}
          </optgroup>)}
        </select>
      </label>
    </div>)}
    {!items.length && <p className="scan-hint-text">{tr('No items detected. Add or verify them manually.')}</p>}
    <button type="button" className="scan-add-item" onClick={() => set('items', [...items, { quantity: 1, name: '', unitPrice: null, total: 0, options: [] }])}>{tr('Add item')} +</button>

    <div className="scan-section-head"><h3>{tr('Payment and tax')}</h3></div>
    <div className="scan-detail-grid">
      <label className="scan-field"><span>{tr('Payment method')}</span>
        <select value={receipt.paymentMethod || ''} onChange={event => set('paymentMethod', event.target.value)}>
          <option value="">{tr('Unknown')}</option><option value="cash">{tr('Cash')}</option><option value="card">{tr('Card')}</option><option value="wallet">{tr('Wallet')}</option>
        </select>
      </label>
      <MoneyField label="Cash tendered" value={receipt.cashTendered} onChange={value => set('cashTendered', value)} />
      <MoneyField label="Change" value={receipt.change} onChange={value => set('change', value)} />
      <MoneyField label="VAT / tax" value={receipt.tax} onChange={value => set('tax', value)} />
      <MoneyField label="Taxable sales" value={receipt.taxableSales} onChange={value => set('taxableSales', value)} />
      <MoneyField label="VAT exempt sales" value={receipt.vatExemptSales} onChange={value => set('vatExemptSales', value)} />
      <MoneyField label="Zero-rated sales" value={receipt.zeroRatedSales} onChange={value => set('zeroRatedSales', value)} />
      <MoneyField label="Subtotal" value={receipt.subtotal} onChange={value => set('subtotal', value)} />
      <MoneyField label="Discount" value={receipt.discount} onChange={value => set('discount', value)} />
      <MoneyField label="Service charge" value={receipt.serviceCharge} onChange={value => set('serviceCharge', value)} />
    </div>
    <p className="scan-footnote">{tr('VAT and cash change are details, not additional expenses.')}</p>
  </section>;
}
