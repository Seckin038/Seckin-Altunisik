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
        const localData = await db.table(table).toArray();
        if (localData.length === 0) continue;

        for (let i = 0; i < localData.length; i += CHUNK_SIZE) {
            const chunk = localData.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from(table).upsert(chunk);
            if (error) {
                console.error(`Error pushing chunk for ${table}:`, error);
                const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                console.error('Failing chunk data:', chunk);
                throw new Error(`Synchronisatie mislukt voor ${table} (deel ${i / CHUNK_SIZE + 1}): ${errorMessage}`);
            }
        }
    }

    for (const table of USER_TABLES) {
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
        for (const table of USER_TABLES) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) {
                console.error(`Error pulling ${table} for restore:`, error);
                const errorMessage = `${error.message}${error.details ? ` (${error.details})` : ''}`;
                throw new Error(`Herstel mislukt bij ophalen van ${table}: ${errorMessage}`);
            }

            await db.table(table).clear();

            if (data && data.length > 0) {
                await db.table(table).bulkPut(data);
            }
        }
    });

    await db.settings.update('app', { last_sync: Date.now() });
};

/**
 * Exports all user-related data from Dexie to a JSON file.
 */
export const exportLocalData = async (): Promise<void> => {
    const exportData: { [key: string]: any[] } = {};
    for (const tableName of USER_TABLES) {
        exportData[tableName] = await db.table(tableName).toArray();
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `flmanager_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Imports data from a JSON file into Dexie, overwriting existing data.
 */
export const importLocalData = async (file: File): Promise<void> => {
    const text = await file.text();
    const data = JSON.parse(text);

    await db.transaction('rw', ...USER_TABLES, async () => {
        for (const tableName of USER_TABLES) {
            if (data[tableName]) {
                await db.table(tableName).clear();
                await db.table(tableName).bulkPut(data[tableName]);
            }
        }
    });
};
