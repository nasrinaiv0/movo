#!/usr/bin/env node
'use strict';

// Static guardrail for JSX controls and ARIA widgets. This catches common
// dead-control and missing-state regressions; it does not replace runtime or
// assistive-technology testing.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..', 'src');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'tab', 'menuitem', 'switch', 'checkbox', 'radio',
  'option', 'menuitemcheckbox', 'menuitemradio', 'treeitem'
]);
const CONTROL_TAGS = new Set(['button', 'a', 'form', 'input', 'select', 'textarea', 'option', 'summary']);
const EVENT_HANDLER_ATTRIBUTES = [
  'onClick', 'onSubmit', 'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onChange', 'onMouseDown', 'onPointerDown'
];
const ROLES_WITH_CHECKED_STATE = new Set([
  'switch', 'checkbox', 'radio', 'menuitemcheckbox', 'menuitemradio'
]);

function createAuditState() {
  return {
    errors: [],
    disabledReview: [],
    counts: { files: 0, buttons: 0, links: 0, forms: 0, disabledButtons: 0, ariaWidgets: 0, dialogs: 0 }
  };
}

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

function isObviousNoopHandler(attr) {
  if (!attr?.initializer || !ts.isJsxExpression(attr.initializer)) return false;
  const expression = attr.initializer.expression;
  if (!expression || (!ts.isArrowFunction(expression) && !ts.isFunctionExpression(expression))) return false;
  const body = expression.body;
  if (ts.isBlock(body)) return body.statements.length === 0;
  if (body.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isIdentifier(body) && body.text === 'undefined') return true;
  return ts.isVoidExpression(body)
    && ts.isNumericLiteral(body.expression)
    && body.expression.text === '0';
}

function literalTrue(map, name) {
  const attr = map.get(name);
  if (!attr?.initializer) return false;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text.toLowerCase() === 'true';
  if (ts.isJsxExpression(attr.initializer)) {
    return attr.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword;
  }
  return false;
}

function location(source, node) {
  const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
  return path.relative(path.resolve(__dirname, '..'), source.fileName) + ':' + (pos.line + 1);
}

function auditSourceText(text, fileName = 'fixture.jsx', state = createAuditState()) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  state.counts.files += 1;
  const handledFormIds = new Set();

  function collectHandledForms(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (tagName(node) === 'form') {
        const formAttrs = attrs(node);
        const id = literalAttr(formAttrs, 'id');
        if (id && hasAny(formAttrs, ['onSubmit', 'action'])) handledFormIds.add(id);
      }
    }
    ts.forEachChild(node, collectHandledForms);
  }
  collectHandledForms(source);

  function visit(node, insideHandledForm = false) {
    let childFormHandled = insideHandledForm;

    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (tagName(opening) === 'form') {
        const formAttrs = attrs(opening);
        childFormHandled = hasAny(formAttrs, ['onSubmit', 'action']);
      }
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagName(node);
      const a = attrs(node);
      const where = location(source, node);
      const role = literalAttr(a, 'role');
      const disabledControl = a.has('disabled') || literalTrue(a, 'aria-disabled');

      if (!disabledControl && (CONTROL_TAGS.has(tag) || INTERACTIVE_ROLES.has(role))) {
        for (const handlerName of EVENT_HANDLER_ATTRIBUTES) {
          if (isObviousNoopHandler(a.get(handlerName))) {
            state.errors.push(where + ' ' + handlerName + ' is an empty/no-op inline handler.');
          }
        }
      }

      if (tag === 'button') {
        state.counts.buttons += 1;
        const disabled = a.has('disabled') || literalTrue(a, 'aria-disabled');
        const isSubmit = literalAttr(a, 'type') === 'submit';
        const hasHandler = hasAny(a, ['onClick', 'onKeyDown', 'onMouseDown', 'onPointerDown', 'onSubmit', 'onChange']);
        if (disabled) {
          state.counts.disabledButtons += 1;
          if (!hasAny(a, ['aria-describedby', 'title', 'aria-busy'])) {
            state.disabledReview.push(where + ' disabled button needs a human check for a visible, accessible reason.');
          }
        } else if (!hasHandler && !(isSubmit && (childFormHandled || handledFormIds.has(literalAttr(a, 'form'))))) {
          state.errors.push(where + ' <button> has no action handler, submit form, or disabled state.');
        }
      }

      if (tag === 'a') {
        state.counts.links += 1;
        if (!hasAny(a, ['href', 'onClick'])) {
          state.errors.push(where + ' <a> has neither href nor onClick.');
        }
        const href = literalAttr(a, 'href').trim().toLowerCase();
        if ((href === '#' || href.startsWith('javascript:')) && !a.has('onClick')) {
          state.errors.push(where + ' <a> uses a placeholder href without an action handler.');
        }
      }

      if (tag === 'form') {
        state.counts.forms += 1;
        if (!hasAny(a, ['onSubmit', 'action'])) {
          state.errors.push(where + ' <form> has no onSubmit handler or action.');
        }
      }

      if (INTERACTIVE_ROLES.has(role)) {
        state.counts.ariaWidgets += 1;
        const disabled = a.has('disabled') || literalTrue(a, 'aria-disabled');
        const nativeInteractive = ['button', 'a', 'input', 'select', 'textarea', 'option', 'summary'].includes(tag);
        if (!nativeInteractive && !disabled) {
          const hasClick = a.has('onClick');
          const hasKeyboard = hasAny(a, ['onKeyDown', 'onKeyUp', 'onKeyPress']);
          if (!hasClick || !hasKeyboard) {
            state.errors.push(where + ' non-native role="' + role + '" must provide click and keyboard handlers, or be disabled.');
          }
        }
        if (role === 'tab' && !a.has('aria-selected')) {
          state.errors.push(where + ' role="tab" must expose aria-selected state.');
        }
        if (ROLES_WITH_CHECKED_STATE.has(role) && !hasAny(a, ['aria-checked', 'checked'])) {
          state.errors.push(where + ' role="' + role + '" must expose checked state.');
        }
        if (role === 'option' && !hasAny(a, ['aria-selected', 'selected'])) {
          state.errors.push(where + ' role="option" must expose selected state.');
        }
        if (literalTrue(a, 'aria-disabled') && !hasAny(a, ['aria-describedby', 'title'])) {
          state.disabledReview.push(where + ' aria-disabled control needs a human check for a visible, accessible reason.');
        }
      }

      if (role === 'button' && tag !== 'button' && tag !== 'a') {
        const hasClick = a.has('onClick');
        const hasKeyboard = hasAny(a, ['onKeyDown', 'onKeyUp', 'onKeyPress']);
        if (!a.has('disabled') && !literalTrue(a, 'aria-disabled') && (!hasClick || !hasKeyboard)) {
          state.errors.push(where + ' non-native role="button" must provide click and keyboard handlers, or be disabled.');
        }
      }

      if (role === 'dialog' || role === 'alertdialog') {
        state.counts.dialogs += 1;
        if (!hasAny(a, ['aria-label', 'aria-labelledby'])) {
          state.errors.push(where + ' role="' + role + '" must have an accessible name via aria-label or aria-labelledby.');
        }
        if (!hasAny(a, ['aria-modal'])) {
          state.disabledReview.push(where + ' dialog needs a human check that modal/non-modal behavior is intentional and focus is managed.');
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, childFormHandled));
  }

  visit(source);
  return state;
}

function auditFile(file, state) {
  auditSourceText(fs.readFileSync(file, 'utf8'), file, state);
}

function runAudit() {
  const state = createAuditState();
  for (const file of listFiles(ROOT)) auditFile(file, state);

  if (state.disabledReview.length) {
    console.warn('Disabled-control/dialog review (' + state.disabledReview.length + '):');
    for (const item of state.disabledReview) console.warn('  - ' + item);
  }

  const c = state.counts;
  console.log(
    'UI control audit: ' + c.files + ' source files; ' +
    c.buttons + ' buttons (' + c.disabledButtons + ' disabled); ' +
    c.links + ' links; ' + c.forms + ' forms; ' +
    c.ariaWidgets + ' interactive ARIA widgets; ' + c.dialogs + ' dialogs.'
  );

  if (state.errors.length) {
    console.error('Potential dead or inaccessible controls (' + state.errors.length + '):');
    for (const item of state.errors) console.error('  - ' + item);
    process.exitCode = 1;
  } else {
    console.log('No obvious unhandled controls found. Disabled explanations and runtime interaction still require human verification.');
  }
  return state;
}

if (require.main === module) runAudit();

module.exports = { auditSourceText, createAuditState, runAudit };
