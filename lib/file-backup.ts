
// FIX: Restored the full content of this file, which was previously empty/corrupted.
// This file contains functions for exporting and importing the entire local database to/from a file.

import { db } from './db';

const TABLES_TO_BACKUP = [
    'customers',
    'subscriptions',
    'settings',
    'timeline',
    'countryTemplates',
    'whatsappTemplates',
    'giftCodes',
    'whatsappLogs',
    'payments',
    'countries'
] as const;

type BackupData = {
    [key in typeof TABLES_TO_BACKUP[number]]?: any[];
};

export const exportToFile = async (): Promise<{ fileName: string, data: string }> => {
    const backup: BackupData = {};
    
    await db.transaction('r', db.tables, async () => {
        for (const tableName of TABLES_TO_BACKUP) {
            const tableData = await db.table(tableName).toArray();
            backup[tableName] = tableData;
        }
    });

    const jsonString = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `flmanager-backup-${date}.json`;
    
    return { fileName, data: jsonString };
};


export const importFromFile = async (fileContent: string): Promise<void> => {
    let data: BackupData;
    try {
        data = JSON.parse(fileContent);
    } catch (e) {
        throw new Error("Ongeldig JSON-bestand.");
    }

    if (!data || typeof data !== 'object') {
        throw new Error("Bestand heeft niet de juiste structuur.");
    }
    
    await db.transaction('rw', db.tables, async () => {
        for (const tableName of TABLES_TO_BACKUP) {
            await db.table(tableName).clear();
            const tableData = data[tableName];
            if (tableData && Array.isArray(tableData)) {
                await db.table(tableName).bulkAdd(tableData);
            }
        }
    });
};
