

import { getSupabaseClient } from './supabase';
import { db } from './db';
import type { Customer, Subscription, TimelineEvent, CountryTemplate, WhatsappTemplate, GiftCode, WhatsappLog, Payment } from '../types';

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

type TableName = (typeof USER_TABLES)[number];

type TableTypeMap = {
    customers: Customer;
    subscriptions: Subscription;
    timeline: TimelineEvent;
    countryTemplates: CountryTemplate;
    whatsappTemplates: WhatsappTemplate;
    giftCodes: GiftCode;
    whatsappLogs: WhatsappLog;
    payments: Payment;
};

export const fullSync = async () => {
    const supabase = await getSupabaseClient();
    const CHUNK_SIZE = 100;

    for (const table of USER_TABLES) {
        try {
            const localData = await db[table].toArray();
            if (localData.length === 0) continue;

            for (let i = 0; i < localData.length; i += CHUNK_SIZE) {
                const chunk = localData.slice(i, i + CHUNK_SIZE);
                const { error } = await supabase.from(table).upsert(chunk);
                if (error) {
                    console.error(`Error pushing chunk for ${table}:`, error);
                    const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                    console.error('Failing chunk data:', chunk);
                    throw new Error(`Uploaden mislukt voor ${table} (deel ${i / CHUNK_SIZE + 1}): ${errorMessage}`);
                }
            }
        } catch (e: any) {
             const finalMessage = e instanceof TypeError ? 'netwerkfout (mogelijk offline)' : (e.message || 'onbekende fout');
             throw new Error(`Fout bij uploaden van tabel '${table}': ${finalMessage}`, { cause: e });
        }
    }

    for (const table of USER_TABLES) {
        try {
            const { data, error } = await supabase.from(table).select();
            
            if (error) {
                console.error(`Error pulling ${table}:`, error);
                const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                throw new Error(`Ophalen mislukt voor ${table}: ${errorMessage}`);
            }
            if (data) {
                // FIX: Use `db.table(table)` to resolve TypeScript error where methods were not found on dynamic table.
                await db.table(table).bulkPut(data as TableTypeMap[TableName][]);
            }
        } catch (e: any) {
            const finalMessage = e instanceof TypeError ? 'netwerkfout (mogelijk offline)' : (e.message || 'onbekende fout');
            throw new Error(`Fout bij downloaden van tabel '${table}': ${finalMessage}`, { cause: e });
        }
    }

    await db.settings.update('app', { last_sync: Date.now() });
};

export const restoreFromCloud = async () => {
    const supabase = await getSupabaseClient();

    await db.transaction('rw', db.tables, async () => {
        for (const table of USER_TABLES) {
            try {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    console.error(`Error pulling ${table} for restore:`, error);
                    const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                    throw new Error(`Data ophalen voor '${table}' mislukt: ${errorMessage}`);
                }
    
                // FIX: Use `db.table(table)` to resolve TypeScript error where methods were not found on dynamic table.
                await db.table(table).clear();
    
                if (data && data.length > 0) {
                    // FIX: Use `db.table(table)` to resolve TypeScript error where methods were not found on dynamic table.
                    await db.table(table).bulkPut(data);
                }
            } catch (e: any) {
                const finalMessage = e instanceof TypeError ? 'netwerkfout (mogelijk offline)' : (e.message || 'onbekende fout');
                throw new Error(`Fout bij tabel '${table}': ${finalMessage}`, { cause: e });
            }
        }
    });

    await db.settings.update('app', { last_sync: Date.now() });
};