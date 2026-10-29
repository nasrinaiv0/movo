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

  test('explains the exact consent boundary and keeps sending disabled until opt-in', () => {
    const disclosure = container.querySelector('#movo-ai-context-disclosure');
    const consent = container.querySelector('#movo-ai-consent');
    const sendButton = container.querySelector('button[aria-label="Send message"]');

    expect(disclosure.textContent).toContain('your message');
    expect(disclosure.textContent).toContain('recent transactions');
    expect(disclosure.textContent).toContain('separate from accepting the Terms of Service');
    expect(consent.checked).toBe(false);
    expect(consent.getAttribute('aria-describedby')).toBe('movo-ai-context-disclosure');

    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    expect(sendButton.disabled).toBe(true);
    expect(sendButton.getAttribute('aria-describedby')).toBe('movo-ai-send-disabled-reason');
    expect(container.querySelector('#movo-ai-send-disabled-reason').textContent).toContain('explicitly opt in');

    act(() => {
      Array.from(container.querySelectorAll('.movo-ai-legal-links button')).find(button => button.textContent === 'Privacy Policy').click();
      Array.from(container.querySelectorAll('.movo-ai-legal-links button')).find(button => button.textContent === 'Terms of Service').click();
    });
    expect(onOpenLegal).toHaveBeenNthCalledWith(1, 'PrivacyPolicy');
    expect(onOpenLegal).toHaveBeenNthCalledWith(2, 'TermsOfService');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('explains disabled Send when consent is accepted but the draft is empty', () => {
    const consent = container.querySelector('#movo-ai-consent');
    const sendButton = container.querySelector('button[aria-label="Send message"]');

    act(() => consent.click());

    expect(consent.checked).toBe(true);
    expect(sendButton.disabled).toBe(true);
    expect(sendButton.getAttribute('aria-describedby')).toBe('movo-ai-send-disabled-reason');
    expect(container.querySelector('#movo-ai-send-disabled-reason').textContent).toContain('Enter a message to enable Send.');
  });

  test('sends the chat only after explicit consent and includes the consent flag', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversationId: 'conversation-1', reply: 'Here is your summary.' })
    });
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    act(() => container.querySelector('#movo-ai-consent').click());
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
      consent: true
    });
    expect(container.textContent).toContain('Here is your summary.');
  });
});
