import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SetupAgreement from './SetupAgreement';
global.IS_REACT_ACT_ENVIRONMENT = true;

test('adult self-declaration and terms/privacy acknowledgement require a fresh affirmative action', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const accept = jest.fn();
  act(() => root.render(<SetupAgreement onAccept={accept} onOpenLegal={() => {}} />));
  const checkbox = container.querySelector('input[type="checkbox"]');
  const button = container.querySelector('.setup-agreement-accept');
  expect(container.textContent).toContain('I am at least 18 years old.');
  expect(container.textContent).toContain('acknowledge the Privacy Policy');
  expect(checkbox.checked).toBe(false);
  expect(button.disabled).toBe(true);
  act(() => checkbox.click());
  expect(button.disabled).toBe(false);
  act(() => button.click());
  expect(accept).toHaveBeenCalledTimes(1);
  act(() => root.unmount()); container.remove();
});

test('a signed-in owner can request deletion without accepting or declaring adult eligibility', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const accept = jest.fn(); const remove = jest.fn();
  act(() => root.render(<SetupAgreement onAccept={accept} onOpenLegal={() => {}} onDeleteAccount={remove} />));
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);
  expect(container.querySelector('.setup-agreement-accept').disabled).toBe(true);
  const deletion = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Delete Account');
  act(() => deletion.click());
  expect(remove).toHaveBeenCalledTimes(1);
  expect(accept).not.toHaveBeenCalled();
  act(() => root.unmount()); container.remove();
});

test('a signed-in owner can request deletion without accepting revised terms or declaring adult eligibility', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const accept = jest.fn(); const remove = jest.fn();
  act(() => root.render(<SetupAgreement onAccept={accept} onOpenLegal={() => {}} onDeleteAccount={remove} />));
  const deletion = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Delete Account');
  expect(container.querySelector('.setup-agreement-accept').disabled).toBe(true);
  act(() => deletion.click());
  expect(remove).toHaveBeenCalledTimes(1);
  expect(accept).not.toHaveBeenCalled();
  act(() => root.unmount()); container.remove();
});
