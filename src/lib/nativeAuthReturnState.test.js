import fs from 'fs';
import path from 'path';
import { viewAfterAuthenticatedSession, safeNativeOAuthStage } from './nativeAuthReturnState';

test.each([
  ['Sign in', 'owner-id', 'Home'],
  ['Sign in', 'same-owner-id', 'Home'],
  ['Home', 'owner-id', 'Home'],
  ['Wallet', 'owner-id', 'Wallet'],
  ['Transactions', 'owner-id', 'Transactions'],
  ['Sign in', null, 'Sign in'],
  ['Sign in', '', 'Sign in'],
])('authenticated session chooses safe destination for %s / %s', (view, userId, expected) => {
  expect(viewAfterAuthenticatedSession(view, userId)).toBe(expected);
});

test.each([
  ['provider', 'OA-PROVIDER'],
  ['no-code', 'OA-NO-CODE'],
  ['exchange', 'OA-EXCHANGE'],
  ['private OAuth error access_token=never-print-me', 'OA-OTHER'],
])('native OAuth diagnostics return fixed non-secret label for %s', (stage, expected) => {
  expect(safeNativeOAuthStage(stage)).toBe(expected);
});

test('App routes valid same-user callbacks to Home before the owner-identity fast path', () => {
  const app = fs.readFileSync(path.join(process.cwd(), 'src/App.js'), 'utf8');
  const start = app.indexOf('const applySession = async (nextSession) => {');
  const end = app.indexOf('getCurrentSession().then(applySession)', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const handler = app.slice(start, end);
  expect(handler).toContain('viewAfterAuthenticatedSession(current, nextUserId)');
  expect(handler.indexOf('viewAfterAuthenticatedSession(current, nextUserId)'))
    .toBeLessThan(handler.indexOf('cloudAuthUserRef.current === nextUserId'));
});

test('native callback failures show fixed stages without echoing provider details', () => {
  const app = fs.readFileSync(path.join(process.cwd(), 'src/App.js'), 'utf8');
  expect(app).toContain("safeNativeOAuthStage(failure ? 'provider' : 'no-code')");
  expect(app).toContain("safeNativeOAuthStage('exchange')");
  expect(app).not.toContain('setError(failure)');
});
