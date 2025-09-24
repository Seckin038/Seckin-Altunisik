import { getSupabaseClient } from './supabase';
import { db } from './db';
import type { Customer, Subscription, TimelineEvent, CountryTemplate, WhatsappTemplate, GiftCode } from '../types';

const TABLES_TO_SYNC = [
    'customers',
    'subscriptions',
    'timeline',
    'countryTemplates',
    'whatsappTemplates',
    'giftCodes',
    'whatsappLogs'
] as const;

type TableName = (typeof TABLES_TO_SYNC)[number];

type TableTypeMap = {
    customers: Customer;
    subscriptions: Subscription;
    timeline: TimelineEvent;
    countryTemplates: CountryTemplate;
    whatsappTemplates: WhatsappTemplate;
    giftCodes: GiftCode;
    whatsappLogs: any; // Use any for simplicity
};

export const fullSync = async () => {
    const supabase = await getSupabaseClient();
    const CHUNK_SIZE = 100; // Process records in smaller batches for reliability

    // 1. PUSH local changes to Supabase in chunks
    for (const table of TABLES_TO_SYNC) {
        const localData = await db.table(table).toArray();
        if (localData.length === 0) continue;

        for (let i = 0; i < localData.length; i += CHUNK_SIZE) {
            const chunk = localData.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from(table).upsert(chunk);
            if (error) {
                console.error(`Error pushing chunk for ${table}:`, error);
                const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                console.error('Failing chunk data:', chunk); // Log the problematic data
                throw new Error(`Synchronisatie mislukt voor ${table} (deel ${i / CHUNK_SIZE + 1}): ${errorMessage}`);
            }
        }
    }

    // 2. PULL remote changes from Supabase
    for (const table of TABLES_TO_SYNC) {
        const { data, error } = await supabase.from(table).select();
        
        if (error) {
            console.error(`Error pulling ${table}:`, error);
            const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
            throw new Error(`Ophalen mislukt voor ${table}: ${errorMessage}`);
        }
        if (data) {
            await db.table(table).bulkPut(data as TableTypeMap[TableName][]);
        }
    }

    await db.settings.update('app', { last_sync: Date.now() });
};

export const restoreFromCloud = async () => {
    const supabase = await getSupabaseClient();

    await db.transaction('rw', db.tables, async () => {
        for (const table of TABLES_TO_SYNC) {
            // 1. Pull all data from Supabase for the current table
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error pulling ${table} for restore:`, error);
                const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                throw new Error(`Herstel mislukt bij ophalen van ${table}: ${errorMessage}`);
            }

            // 2. Clear the corresponding local table
            await db.table(table).clear();

            // 3. Populate the local table with the data from the cloud
            if (data && data.length > 0) {
                await db.table(table).bulkPut(data);
            }
        }
    });

    // After successfully restoring, update the last sync time
    await db.settings.update('app', { last_sync: Date.now() });
};
