import { createClient } from '@supabase/supabase-js';
import { isNativeApp } from './platform';
import { nativeSecureAuthStorage } from './nativeSecureAuthStorage';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', ...(isNativeApp() ? { storage: nativeSecureAuthStorage } : {}) },
      global: { headers: { 'X-Client-Info': 'movo-web' } },
    })
  : null;
