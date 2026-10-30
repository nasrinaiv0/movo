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
    window.localStorage.removeItem('movo.ai.contextIsolation.v1.user-1');
    window.localStorage.removeItem('movo.ai.contextIsolation.v1.user-2');
    window.sessionStorage.removeItem('movo.ai.newConversation.user-2');
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
    window.sessionStorage.removeItem('movo.ai.newConversation.user-2');
    window.localStorage.removeItem('movo.ai.contextIsolation.v1.user-1');
    window.localStorage.removeItem('movo.ai.contextIsolation.v1.user-2');
    jest.clearAllMocks();
  });

  test('explains the exact consent boundary and keeps sending disabled until opt-in', () => {
    const disclosure = container.querySelector('#movo-ai-context-disclosure');
    const consent = container.querySelector('#movo-ai-consent');
    const sendButton = container.querySelector('button[aria-label="Send message"]');

    expect(disclosure.textContent).toContain('your message');
    expect(disclosure.textContent).toContain('recent transactions');
    expect(disclosure.textContent).toContain('A reply is accepted only when NasrinAI explicitly confirms the request stayed within the MOVO scope');
    expect(disclosure.textContent).not.toContain('Your account stays isolated.');
    expect(disclosure.textContent).toContain('Each message is processed independently');
    expect(disclosure.textContent).toContain('start a clean MOVO chat');
    expect(disclosure.textContent).toContain('separate from accepting the Terms of Service');
    expect(window.sessionStorage.getItem('movo.ai.newConversation.user-1')).toBe('true');
    expect(window.localStorage.getItem('movo.ai.contextIsolation.v1.user-1')).toBe('true');
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

  test('clears the previous account chat before loading another account history', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conversationId: 'conversation-user-1', reply: 'Private reply from account one.' })
    });
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    act(() => container.querySelector('#movo-ai-consent').click());

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(container.textContent).toContain('Private reply from account one.');

    window.localStorage.setItem('movo.ai.contextIsolation.v1.user-2', 'true');
    window.sessionStorage.removeItem('movo.ai.newConversation.user-2');
    let resolveHistory;
    global.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveHistory = resolve; }));
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: 'user-2-access-token' } },
      error: null
    });
    act(() => {
      root.render(<NasrinAIChat
        session={{ user: { id: 'user-2' }, access_token: 'user-2-access-token' }}
        cloudMode
        onOpenLegal={onOpenLegal}
      />);
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    expect(container.textContent).not.toContain('Private reply from account one.');
    expect(container.querySelectorAll('.movo-ai-message.assistant')).toHaveLength(0);

    await act(async () => {
      resolveHistory({ ok: true, json: async () => ({ conversationId: 'conversation-user-2', messages: [] }) });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  });

  test('ignores a late success from the previous account after switching accounts', async () => {
    let resolvePost;
    global.fetch.mockImplementationOnce((_url, options) => {
      if (options?.method === 'POST') return new Promise(resolve => { resolvePost = resolve; });
      return Promise.resolve({ ok: true, json: async () => ({ conversationId: null, messages: [] }) });
    });
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize account one spending');
    act(() => container.querySelector('#movo-ai-consent').click());

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(resolvePost).toBeDefined();

    window.localStorage.setItem('movo.ai.contextIsolation.v1.user-2', 'true');
    window.sessionStorage.removeItem('movo.ai.newConversation.user-2');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: 'user-2-access-token' } },
      error: null
    });
    act(() => {
      root.render(<NasrinAIChat
        session={{ user: { id: 'user-2' }, access_token: 'user-2-access-token' }}
        cloudMode
        onOpenLegal={onOpenLegal}
      />);
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    await act(async () => {
      resolvePost({ ok: true, json: async () => ({ conversationId: 'conversation-user-1', reply: 'Private reply from account one.' }) });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.textContent).not.toContain('Private reply from account one.');
    expect(container.textContent).not.toContain('Summarize account one spending');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('does not restore the previous account draft or error after a late failed response', async () => {
    let resolvePost;
    global.fetch.mockImplementationOnce((_url, options) => {
      if (options?.method === 'POST') return new Promise(resolve => { resolvePost = resolve; });
      return Promise.resolve({ ok: true, json: async () => ({ conversationId: null, messages: [] }) });
    });
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Private draft from account one');
    act(() => container.querySelector('#movo-ai-consent').click());

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(resolvePost).toBeDefined();

    window.localStorage.setItem('movo.ai.contextIsolation.v1.user-2', 'true');
    window.sessionStorage.removeItem('movo.ai.newConversation.user-2');
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: 'user-2-access-token' } },
      error: null
    });
    act(() => {
      root.render(<NasrinAIChat
        session={{ user: { id: 'user-2' }, access_token: 'user-2-access-token' }}
        cloudMode
        onOpenLegal={onOpenLegal}
      />);
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

    await act(async () => {
      resolvePost({ ok: false, json: async () => ({ error: 'nasrinai_auth_rejected' }) });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.querySelector('#movo-ai-prompt').value).toBe('');
    expect(container.textContent).not.toContain('Private draft from account one');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  test('fails closed when the upstream cannot confirm MOVO context isolation', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'nasrinai_scope_unconfirmed' })
    });
    setTextareaValue(container.querySelector('#movo-ai-prompt'), 'Summarize my spending');
    act(() => container.querySelector('#movo-ai-consent').click());

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.querySelector('[role="alert"]').textContent).toContain('could not verify that NasrinAI kept this request isolated to MOVO');
    expect(container.querySelectorAll('.movo-ai-message.assistant')).toHaveLength(0);
    expect(container.querySelector('#movo-ai-prompt').value).toBe('Summarize my spending');
    expect(global.fetch).toHaveBeenCalledTimes(1);
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
