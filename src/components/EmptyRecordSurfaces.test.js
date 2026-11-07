import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const css = fs.readFileSync(path.join(__dirname, '..', 'App.css'), 'utf8');
const rules = [];
postcss.parse(css).walkRules(rule => rules.push(rule));

const emptySurface = rules.find(rule => rule.selector.includes('/*') === false
  && rule.selector.includes('.card.list-card:has(> p.form-note:only-child)')
  && rule.selector.includes('.card:has(> p.empty:only-child)')
  && rule.selector.includes('.card.pad:has(> ul:empty + p.empty:last-child)')
  && !rule.selector.includes('::after'));
const declaration = (rule, property) => rule.nodes.find(node => node.type === 'decl' && node.prop === property);

test('record-list backgrounds are removed only when the card contains an empty-state message', () => {
  expect(emptySurface).toBeDefined();
  expect(emptySurface.selector).toContain('p.form-note:only-child');
  expect(emptySurface.selector).toContain('p.empty:only-child');
  expect(emptySurface.selector).toContain('ul:empty + p.empty:last-child');
  expect(declaration(emptySurface, 'background').value).toBe('transparent');
  expect(declaration(emptySurface, 'box-shadow').value).toBe('none');
  expect(declaration(emptySurface, 'padding').value).toBe('4px 2px 8px');
});

test('the empty-state rule disables card pseudo-hairlines, but never hides populated lists', () => {
  const after = rules.find(rule => rule.selector.includes('.card:has(> p.empty:only-child)')
    && rule.selector.includes('::after'));
  expect(declaration(after, 'content').value).toBe('none');
  const trulyEmpty = rules.find(rule => rule.selector === '.movo-app.movo-app .card.list-card:empty');
  expect(declaration(trulyEmpty, 'display').value).toBe('none');
  // The common card and actionable empty-call-to-action cards must remain unaffected.
  expect(emptySurface.selector).not.toContain('.empty-card');
  expect(emptySurface.selector).not.toContain('.budget-empty');
});

test('scheduled financial sections and cashback lists use an empty paragraph only when no records exist', () => {
  const schedule = fs.readFileSync(path.join(__dirname, '..', 'screens', 'ScheduledTransactions.js'), 'utf8');
  const cashback = fs.readFileSync(path.join(__dirname, '..', 'screens', 'Cashback.js'), 'utf8');
  ['No scheduled payments or transfers yet.', 'No upcoming or overdue bills, loans, subscriptions or card payments.', 'No reminder activity yet.'].forEach(text => {
    expect(schedule).toContain('<p className="form-note">{tr(\'' + text + '\')}</p>');
  });
  expect(cashback).toContain("manual.length ? manual.map(");
  expect(cashback).toContain("auto.length ? auto.map(");
});
