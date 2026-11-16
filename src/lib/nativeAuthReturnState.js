/** Pure auth-navigation and non-secret callback diagnostics. */
export function viewAfterAuthenticatedSession(currentView, userId) {
  return userId && currentView === 'Sign in' ? 'Home' : currentView;
}

/**
 * Expose only fixed diagnostic codes. Never display provider errors, query
 * strings, one-time OAuth codes, PKCE verifiers, or callback URLs.
 */
export function safeNativeOAuthStage(stage) {
  if (stage === 'provider') return 'OA-PROVIDER';
  if (stage === 'no-code') return 'OA-NO-CODE';
  if (stage === 'exchange') return 'OA-EXCHANGE';
  return 'OA-OTHER';
}
