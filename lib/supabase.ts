

import { createClient } from '@supabase/supabase-js';
// FIX: Corrected import path for db.
import { db } from './db';

// FIX: Use `any` type for supabase client to resolve strict type issue.
let supabase: any = null;

export const getSupabaseClient = async () => {
    if (supabase) return supabase;

    const settings = await db.settings.get('app');
    if (!settings || !settings.supabaseUrl || !settings.supabaseAnonKey) {
        throw new Error("Supabase settings not configured.");
    }
    supabase = createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
      db: { schema: 'public' }
    });
    return supabase;
};