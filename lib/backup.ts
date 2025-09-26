import { db } from './db';
import { getSupabaseClient, getSupabaseUrls } from './supabase';
import { withRetry } from './utils';
import type { SupabaseClient } from '@supabase/supabase-js';

const USER_TABLES = [
    'customers',
    'subscriptions',
    'timeline',
    'countryTemplates',
    'whatsappTemplates',
    'giftCodes',
    'whatsappLogs',
    'payments'
] as const;


/**
 * Performs critical pre-flight checks before any sync operation.
 * 1. Verifies connectivity to both REST and Functions endpoints.
 * 2. Runs the flm_bootstrap RPC to ensure the DB schema is correct.
 * @returns The initialized and verified Supabase client.
 */
export const bootstrapAndHealthCheck = async (anonKey: string): Promise<SupabaseClient> => {
    const supabase = getSupabaseClient();
    const { REST_URL, FUNCTIONS_URL } = getSupabaseUrls();
    
    // Health Check 1: REST endpoint (for RPC, auth, etc.)
    const restOk = await fetch(`${REST_URL}/auth/v1/health`, {
       headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    }).then(r => r.status === 200).catch(() => false);

    if (!restOk) {
        throw new Error('REST onbereikbaar');
    }

    // Health Check 2: Functions endpoint (for sync-push/pull)
    const { error: fnError } = await supabase.functions.invoke('ping', { body: {} });
    if (fnError) {
        console.warn(`Waarschuwing: Functions ping mislukt: ${fnError.message}. Synchronisatie kan alsnog falen.`);
    }

    // Schema Bootstrap via RPC (uses REST endpoint)
    const { data, error: rpcError } = await supabase.rpc('flm_bootstrap');
    if (rpcError || (data && (data as any).ok === false)) {
        const errorMessage = rpcError?.message || (data as any)?.error || 'Onbekende RPC fout';
        throw new Error(`flm_bootstrap failed: ${errorMessage}`);
    }
    
    console.log("Bootstrap en health checks succesvol afgerond.");
    return supabase;
};


export const fullSync = async () => {
    const settings = await db.settings.get('app');
    if (!settings) throw new Error("Instellingen niet gevonden");
    
    const supabase = await bootstrapAndHealthCheck(settings.supabaseAnonKey);
    
    const CHUNK_SIZE = 50;

    // PUSH PHASE
    for (const table of USER_TABLES) {
        try {
            const localData = await db.table(table).toArray();
            if (localData.length === 0) continue;

            for (let i = 0; i < localData.length; i += CHUNK_SIZE) {
                const chunk = localData.slice(i, i + CHUNK_SIZE);

                await withRetry(async () => {
                    const { error } = await supabase.functions.invoke('sync-push', {
                        body: { table, data: chunk },
                    });

                    if (error) {
                         throw new Error(`sync-push: ${error.message || 'Onbekende serverfout'}`);
                    }
                });
            }
        } catch (e: any) {
             const finalMessage = e.message || 'onbekende fout';
             throw new Error(`Fout bij uploaden van tabel '${table}': ${finalMessage}`);
        }
    }

    // PULL PHASE
    for (const table of USER_TABLES) {
        try {
             await withRetry(async () => {
                const { data, error } = await supabase.functions.invoke('sync-pull', {
                    body: { table },
                });

                if (error) {
                    throw new Error(`sync-pull: ${error.message || 'Onbekende serverfout'}`);
                }
                
                if (data && Array.isArray(data)) {
                    await db.table(table).bulkPut(data);
                }
            });
        } catch (e: any) {
            const finalMessage = e.message || 'onbekende fout';
            throw new Error(`Fout bij downloaden van tabel '${table}': ${finalMessage}`);
        }
    }

    await db.settings.update('app', { last_sync: Date.now() });
};


export const restoreFromCloud = async () => {
    const settings = await db.settings.get('app');
    if (!settings) throw new Error("Instellingen niet gevonden");

    const supabase = await bootstrapAndHealthCheck(settings.supabaseAnonKey);

    await db.transaction('rw', db.tables, async () => {
        for (const table of USER_TABLES) {
            try {
                 await withRetry(async () => {
                    const { data, error } = await supabase.functions.invoke('sync-pull', {
                        body: { table },
                    });

                    if (error) {
                       throw new Error(`sync-pull: Data ophalen voor '${table}' mislukt: ${error.message || 'Onbekende serverfout'}`);
                    }
        
                    await db.table(table).clear();
    
                    if (data && data.length > 0) {
                        await db.table(table).bulkPut(data);
                    }
                });
            } catch (e: any) {
                const finalMessage = e.message || 'onbekende fout';
                throw new Error(`Fout bij tabel '${table}': ${finalMessage}`);
            }
        }
    });

    await db.settings.update('app', { last_sync: Date.now() });
};