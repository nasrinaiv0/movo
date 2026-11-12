'use strict';

// Google Play AABs embed Create React App's REACT_APP_* values at build time.
// Vercel deployment variables are NOT automatically available in GitHub Actions.
// Only the public Supabase URL and public anon/publishable key belong in this bundle.
const MOVO_SUPABASE_PROJECT_REF = 'cjsjmorqvuvvwbfyztiz';
const MOVO_SUPABASE_ORIGIN = `https://${MOVO_SUPABASE_PROJECT_REF}.supabase.co`;

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
    } else if (parsed.origin !== MOVO_SUPABASE_ORIGIN) {
      errors.push('REACT_APP_SUPABASE_URL must point to the MOVO Supabase project (not another application).');
    }
  } catch {
    errors.push('REACT_APP_SUPABASE_URL must be the HTTPS Supabase project origin.');
  }
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) {
    // Current public key shape is safe to bundle, but the operator must still
    // copy this value from the matching MOVO project (opaque keys have no ref claim).
  } else if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    // Legacy JWT-style anon keys have readable role and sometimes project ref
    // claims. Reject service-role credentials and any project-ref mismatch.
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role !== 'anon') {
        errors.push('REACT_APP_SUPABASE_ANON_KEY must have the anon role.');
      }
      if (payload.ref && payload.ref !== MOVO_SUPABASE_PROJECT_REF) {
        errors.push('REACT_APP_SUPABASE_ANON_KEY belongs to a different Supabase project.');
      }
    } catch {
      errors.push('REACT_APP_SUPABASE_ANON_KEY JWT payload is invalid.');
    }
  } else {
    errors.push('REACT_APP_SUPABASE_ANON_KEY must be a valid public anon/publishable key.');
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

module.exports = { validateAndroidAuthConfig, MOVO_SUPABASE_PROJECT_REF, MOVO_SUPABASE_ORIGIN };
