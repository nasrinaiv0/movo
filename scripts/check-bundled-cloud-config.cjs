'use strict';
// Fails when a built app (build/) does not contain MOVO's public Supabase origin, i.e. the iPhone or Android app
// would show "Secure cloud sign-in is not configured" (owner report, 2026-11-12). Public values only; prints nothing
// but the result.
const fs = require('fs');
const path = require('path');
const { MOVO_SUPABASE_ORIGIN } = require('./validate-android-auth-config.cjs');

const dir = path.join(process.argv[2] || 'build', 'static', 'js');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => name.endsWith('.js')) : [];
const found = files.some(name => fs.readFileSync(path.join(dir, name), 'utf8').includes(MOVO_SUPABASE_ORIGIN));
if (!found) {
  process.stderr.write('::error::The built app has no MOVO cloud connection; sign-in would say "not configured". Check .env.production.\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Built app includes the MOVO cloud connection.\n');
}
