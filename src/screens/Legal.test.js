import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TermsOfService, PrivacyPolicy } from './Legal';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MOVO legal pages', () => {
  let container;
  let root;
  let context;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    context = {
      go: jest.fn(),
      legalReturnView: 'Profile',
      openLegal: jest.fn(),
    };
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    root = null;
  });

  test('Terms page has an accessible title, publication notice, and working privacy navigation', () => {
    act(() => root.render(<TermsOfService c={context} />));

    expect(container.querySelector('article[aria-labelledby="legal-title"]')).toBeTruthy();
    expect(container.querySelector('#legal-title').textContent).toBe('Terms of Service');
    expect(container.querySelector('[aria-label="Important publication notice"]').textContent)
      .toContain('Do not enter real or highly sensitive financial information');
    expect(container.querySelector('nav[aria-label="Legal documents"] [aria-current="page"]').textContent)
      .toBe('Terms of Service');

    const privacyNavigation = Array.from(container.querySelectorAll('.legal-nav button'))
      .find(button => button.textContent.trim() === 'Privacy Policy');
    const inlinePrivacy = container.querySelector('.inline-legal-link');
    act(() => { privacyNavigation.click(); inlinePrivacy.click(); });

    expect(context.openLegal).toHaveBeenNthCalledWith(1, 'PrivacyPolicy');
    expect(context.openLegal).toHaveBeenNthCalledWith(2, 'PrivacyPolicy');
  });

  test('Privacy page exposes retention information and keeps missing legal disclosures explicit', () => {
    act(() => root.render(<PrivacyPolicy c={context} />));

    expect(container.querySelector('#legal-title').textContent).toBe('Privacy Policy');
    expect(container.textContent).toContain('6. Retention and deletion');
    expect(container.textContent).toContain('The legal name and registered address of the MOVO data controller are not yet displayed');
    expect(container.querySelector('[aria-label="Important publication notice"]')).toBeTruthy();
    expect(container.querySelector('a[href="mailto:support@nasrinai.com"]')).toBeTruthy();
  });
});
