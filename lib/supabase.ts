// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These variables will hold the singleton instances and derived URLs.
let SUPABASE: SupabaseClient | null = null;
let REST_URL = '';
let FUNCTIONS_URL = '';

/**
 * Sanitizes a string by removing zero-width characters, trimming whitespace,
 * and removing any trailing slashes.
 * @param s The string to sanitize.
 */
const sanitize = (s?: string) =>
  (s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\/+$/, '');

/**
 * Initializes (or re-initializes) the singleton Supabase client.
 * This function validates the URLs and sets up the client with explicit routing for functions.
 * @param urlRaw The raw Supabase REST URL from user settings.
 * @param anonKeyRaw The raw Supabase Anon Key from user settings.
 * @returns The newly created Supabase client.
 */
export function initializeSupabaseClient(urlRaw: string, anonKeyRaw: string): SupabaseClient {
  const supabaseUrl = sanitize(urlRaw);
  const anonKey = sanitize(anonKeyRaw);

  // 1) Validate the URL format and extract the project reference.
  const match = supabaseUrl.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co$/i);
  if (!match) {
    throw new Error('Supabase URL ongeldig. Verwacht: https://<project-ref>.supabase.co');
  }

  // 2) Derive REST and Functions URLs.
  const projectRef = match[1];
  REST_URL = supabaseUrl;
  FUNCTIONS_URL = `https://${projectRef}.functions.supabase.co`;

  // 3) Create the client with explicit functions URL and custom headers.
  SUPABASE = createClient(REST_URL, anonKey, {
    functions: { url: FUNCTIONS_URL },
    global: { headers: { 'x-client-info': 'flm-apk' } },
  });
  
  console.log('Supabase client initialized with:', { rest: REST_URL, functions: FUNCTIONS_URL });

  return SUPABASE;
}

/**
 * Gets the singleton Supabase client instance.
 * Throws an error if the client has not been initialized yet.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE) {
    throw new Error('Supabase client is niet geïnitialiseerd. Roep initializeSupabaseClient aan na het instellen van de API keys.');
  }
  return SUPABASE;
}

/**
 * Gets the derived REST and Functions URLs.
 * Useful for health checks or manual fetch calls.
 */
export function getSupabaseUrls(): { REST_URL: string; FUNCTIONS_URL: string } {
  if (!REST_URL || !FUNCTIONS_URL) {
     throw new Error('Supabase URLs zijn niet beschikbaar. Roep eerst initializeSupabaseClient aan.');
  }
  return { REST_URL, FUNCTIONS_URL };
}
