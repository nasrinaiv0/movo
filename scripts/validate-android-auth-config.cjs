'use strict';

// Google Play AABs embed Create React App's REACT_APP_* values at build time.
// Vercel deployment variables are NOT automatically available in GitHub Actions.
// Only the public Supabase URL and public anon/publishable key belong in this bundle.
function validateAndroidAuthConfig(env = process.env) {
  const errors = [];
  const url = typeof env.REACT_APP_SUPABASE_URL === 'string' ? env.REACT_APP_SUPABASE_URL.trim() : '';
  const key = typeof env.REACT_APP_SUPABASE_ANON_KEY === 'string' ? env.REACT_APP_SUPABASE_ANON_KEY.trim() : '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.hostname === 'localhost'
      || parsed.username || parsed.password || parsed.search || parsed.hash
      || (parsed.pathname !== '/' && parsed.pathname !== '')
      || ![parsed.origin, parsed.origin + '/'].includes(url)) {
      errors.push('REACT_APP_SUPABASE_URL must be the HTTPS Supabase project origin.');
    }
  } catch {
    errors.push('REACT_APP_SUPABASE_URL must be the HTTPS Supabase project origin.');
  }
  if (key.length < 20 || /\s/.test(key) || /^sb_secret_/i.test(key)) {
    errors.push('REACT_APP_SUPABASE_ANON_KEY must be a public anon/publishable key.');
  } else if (key.split('.').length === 3) {
    // Legacy JWT-style anon keys have a readable role claim. Never embed service_role.
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role && payload.role !== 'anon') {
        errors.push('REACT_APP_SUPABASE_ANON_KEY contains a non-anon role.');
      }
    } catch {
      errors.push('REACT_APP_SUPABASE_ANON_KEY JWT payload is invalid.');
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = validateAndroidAuthConfig();
  if (errors.length) {
    for (const message of errors) process.stderr.write('::error::' + message + '\n');
    process.exitCode = 1;
  } else {
    process.stdout.write('Android release Supabase public configuration validated.\n');
  }
}

module.exports = { validateAndroidAuthConfig };
