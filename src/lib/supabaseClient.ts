import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = "https://zrycwwcnzaoqhhqkrhig.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_t8cKhGdESXfoBRnc0awuOA_XcyOk7tl";

function getSanitizedSupabaseUrl(rawUrl?: any): string {
  if (typeof rawUrl !== 'string') return DEFAULT_SUPABASE_URL;
  let trimmed = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_URL;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

function getSanitizedSupabaseKey(rawKey?: any): string {
  if (typeof rawKey !== 'string') return DEFAULT_SUPABASE_KEY;
  let trimmed = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_KEY;
  }
  return trimmed;
}

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = getSanitizedSupabaseUrl(envUrl);
const supabaseKey = getSanitizedSupabaseKey(envKey);

export const supabase = (() => {
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('[SupabaseClient] Warning initializing client, falling back to default:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
  }
})();

