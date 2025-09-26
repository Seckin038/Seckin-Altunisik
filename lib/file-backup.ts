

import { db } from './db';

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

const FILE_HANDLE_ID = 'backupFileHandle';

// Helper to get the stored file handle from Dexie
async function getFileHandle(): Promise<FileSystemFileHandle | null> {
    const entry = await db.fileHandles.get(FILE_HANDLE_ID);
    return entry ? entry.handle : null;
}

// Helper to save the file handle to Dexie
async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
    await db.fileHandles.put({ id: FILE_HANDLE_ID, handle });
}

// Helper to verify and request permissions
async function verifyPermission(fileHandle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> {
    const options: any = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    // FIX: Cast fileHandle to `any` to access experimental `queryPermission` method.
    if ((await (fileHandle as any).queryPermission(options)) === 'granted') {
        return true;
    }
    // FIX: Cast fileHandle to `any` to access experimental `requestPermission` method.
    if ((await (fileHandle as any).requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

/**
 * Exports all user-related data from Dexie to a JSON file using the File System Access API.
 * It tries to use a saved file handle first, otherwise prompts the user.
 */
export const exportToFile = async (): Promise<void> => {
    let fileHandle = await getFileHandle();

    if (!fileHandle) {
        // FIX: Cast window to `any` to access experimental `showSaveFilePicker` method.
        fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: `flmanager_backup_${new Date().toISOString().slice(0, 10)}.json`,
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
            }],
        });
        await saveFileHandle(fileHandle);
    }
    
    if (!(await verifyPermission(fileHandle, true))) {
        throw new Error("Toestemming om naar bestand te schrijven is geweigerd.");
    }

    const exportData: { [key: string]: any[] } = {};
    for (const tableName of USER_TABLES) {
        exportData[tableName] = await db[tableName].toArray();
    }
    
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(exportData, null, 2));
    await writable.close();
};

/**
 * Imports data from a JSON file into Dexie, overwriting existing data.
 * Prompts the user to select a file.
 */
export const importFromFile = async (): Promise<void> => {
    // FIX: Cast window to `any` to access experimental `showOpenFilePicker` method.
    const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [{
            description: 'JSON Backup File',
            accept: { 'application/json': ['.json'] },
        }],
        multiple: false,
    });
    
    if (!(await verifyPermission(fileHandle, false))) {
         throw new Error("Toestemming om bestand te lezen is geweigerd.");
    }
    
    const file = await fileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);

    // Basic validation
    if (typeof data !== 'object' || !data.customers) {
        throw new Error("Ongeldig back-up bestandsformaat.");
    }

    await db.transaction('rw', ...USER_TABLES, async () => {
        for (const tableName of USER_TABLES) {
            if (data[tableName]) {
                await db[tableName].clear();
                await db[tableName].bulkPut(data[tableName]);
            }
        }
    });
};