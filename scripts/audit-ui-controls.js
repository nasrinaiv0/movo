#!/usr/bin/env node
'use strict';

// Static guardrail for native JSX controls. This intentionally does not claim
// to prove runtime behavior; it catches common dead-control regressions and
// reports disabled controls that need a human check for visible explanations.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const errors = [];
const disabledReview = [];
const counts = { files: 0, buttons: 0, links: 0, forms: 0, disabledButtons: 0 };

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) return [];
    if (/\.(test|spec)\.[jt]sx?$/.test(entry.name)) return [];
    return [full];
  });
}

function tagName(node) {
  return ts.isIdentifier(node.tagName) ? node.tagName.text : '';
}

function attrs(node) {
  const result = new Map();
  for (const prop of node.attributes.properties) {
    if (ts.isJsxAttribute(prop)) result.set(prop.name.getText(), prop);
  }
  return result;
}

function hasAny(map, names) {
  return names.some((name) => map.has(name));
}

function literalAttr(map, name) {
  const attr = map.get(name);
  if (!attr || !attr.initializer) return '';
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression && ts.isStringLiteral(attr.initializer.expression)) {
    return attr.initializer.expression.text;
  }
  return '';
}

function location(source, node) {
  const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
  return path.relative(path.resolve(__dirname, '..'), source.fileName) + ':' + (pos.line + 1);
}

function auditFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  counts.files += 1;

  function visit(node, insideHandledForm = false) {
    let childFormHandled = insideHandledForm;

    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (tagName(opening) === 'form') {
        const formAttrs = attrs(opening);
        childFormHandled = hasAny(formAttrs, ['onSubmit', 'action']);
      }
    } else if (ts.isJsxSelfClosingElement(node) && tagName(node) === 'form') {
      const formAttrs = attrs(node);
      if (!hasAny(formAttrs, ['onSubmit', 'action'])) {
        errors.push(location(source, node) + ' <form /> has no onSubmit handler or action.');
      }
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagName(node);
      const a = attrs(node);
      const where = location(source, node);

      if (tag === 'button') {
        counts.buttons += 1;
        const disabled = a.has('disabled');
        const isSubmit = literalAttr(a, 'type') === 'submit';
        const hasHandler = hasAny(a, ['onClick', 'onKeyDown', 'onMouseDown', 'onPointerDown', 'onSubmit']);
        if (disabled) {
          counts.disabledButtons += 1;
          if (!hasAny(a, ['aria-describedby', 'title'])) {
            disabledReview.push(where + ' disabled button needs a human check for a visible, accessible reason.');
          }
        } else if (!hasHandler && !(isSubmit && childFormHandled)) {
          errors.push(where + ' <button> has no action handler, submit form, or disabled state.');
        }
      }

      if (tag === 'a') {
        counts.links += 1;
        if (!hasAny(a, ['href', 'onClick'])) {
          errors.push(where + ' <a> has neither href nor onClick.');
        }
      }

      if (tag === 'form') {
        counts.forms += 1;
        if (!hasAny(a, ['onSubmit', 'action'])) {
          errors.push(where + ' <form> has no onSubmit handler or action.');
        }
      }

      const role = literalAttr(a, 'role');
      if (role === 'button' && tag !== 'button' && tag !== 'a') {
        const hasClick = a.has('onClick');
        const hasKeyboard = hasAny(a, ['onKeyDown', 'onKeyUp', 'onKeyPress']);
        if (!a.has('disabled') && (!hasClick || !hasKeyboard)) {
          errors.push(where + ' non-native role="button" must provide click and keyboard handlers, or be natively disabled.');
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, childFormHandled));
  }

  visit(source);
}

for (const file of listFiles(ROOT)) auditFile(file);

if (disabledReview.length) {
  console.warn('Disabled-control explanation review (' + disabledReview.length + '):');
  for (const item of disabledReview) console.warn('  - ' + item);
}

console.log(
  'UI control audit: ' + counts.files + ' source files; ' +
  counts.buttons + ' buttons (' + counts.disabledButtons + ' disabled); ' +
  counts.links + ' links; ' + counts.forms + ' forms.'
);

if (errors.length) {
  console.error('Potential dead or inaccessible controls (' + errors.length + '):');
  for (const item of errors) console.error('  - ' + item);
  process.exitCode = 1;
} else {
  console.log('No obvious unhandled native buttons, anchors, or forms found. Disabled-control explanations still require visual/runtime review.');
}
