import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import NasrinAIChat from './NasrinAIChat';
import { supabase } from '../lib/supabaseClient';

jest.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() } }
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

function setTextareaValue(textarea, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('NasrinAI consent and legal links', () => {
  let container;
  let root;
  let onOpenLegal;
  let originalFetch;

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ conversationId: null, messages: [] })
    });
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null
    });
    window.sessionStorage.removeItem('movo.ai.newConversation.user-1');
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onOpenLegal = jest.fn();
    await act(async () => {
      root.render(<NasrinAIChat
        session={{ user: { id: 'user-1' }, access_token: 'test-access-token' }}
        cloudMode
        onOpenLegal={onOpenLegal}
      />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    global.fetch.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    global.fetch = originalFetch;
    window.sessionStorage.removeItem('movo.ai.newConversation.user-1');
    jest.clearAllMocks();
  });

  const button = (label) => Array.from(container.querySelectorAll('button')).find(b => b.textContent.trim() === label || b.getAttribute('aria-label') === label);

  test('explains the exact consent boundary and keeps sending disabled until opt-in', () => {
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const disclosure = container.querySelector('#movo-ai-context-disclosure');
    expect(dialog.getAttribute('aria-describedby')).toBe('movo-ai-context-disclosure');
    expect(disclosure.textContent).toContain('limited, account-scoped snapshot');
    expect(disclosure.textContent).toContain('recent transactions');
    expect(disclosure.textContent).toContain('separate from accepting the Terms of Service');
    expect(dialog.textContent).not.toContain('can never access');

    act(() => button('Not now').click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull(); // trying to send asks for consent again

    act(() => {
      button('Privacy Policy').click();
      button('Terms').click();
    });
    expect(onOpenLegal).toHaveBeenNthCalledWith(1, 'PrivacyPolicy');
    expect(onOpenLegal).toHaveBeenNthCalledWith(2, 'TermsOfService');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('keeps Send disabled when consent is accepted but the draft is empty', () => {
    act(() => button('I understand').click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Send message"]').disabled).toBe(true);
  });

  test('sends the chat only after explicit consent and includes the consent flag and language', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversationId: 'conversation-1', reply: 'Here is your summary.' })
    });
    act(() => button('I understand').click());
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    expect(container.querySelector('button[aria-label="Send message"]').disabled).toBe(false);

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const post = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(post).toBeTruthy();
    expect(JSON.parse(post[1].body)).toEqual({
      message: 'Summarize my spending',
      conversationId: null,
      consent: true,
      language: 'en'
    });
    expect(container.textContent).toContain('Here is your summary.');
  });
});
