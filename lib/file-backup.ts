import { db } from './db';
import type { AppSettings } from '../types';

// FIX: Add type definitions for File System Access API to resolve compilation errors
// in environments that might not include these DOM types by default.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}
interface FileSystemFileHandle {}

const TABLES_TO_BACKUP = [
    'customers', 'subscriptions', 'settings', 'timeline', 'countryTemplates',
    'whatsappTemplates', 'giftCodes', 'whatsappLogs', 'payments', 'countries'
] as const;

type BackupData = { [key in typeof TABLES_TO_BACKUP[number]]?: any[] };

// --- File Handle Management (for auto-backup) ---

const getFileHandle = async (key: string): Promise<FileSystemFileHandle | null> => {
    const entry = await db.fileHandles.get(key);
    return entry ? entry.handle : null;
};

const saveFileHandle = async (key: string, handle: FileSystemFileHandle): Promise<void> => {
    await db.fileHandles.put({ id: key, handle });
};

const verifyPermission = async (fileHandle: FileSystemFileHandle, readWrite: boolean): Promise<boolean> => {
    const options: FileSystemHandlePermissionDescriptor = readWrite ? { mode: 'readwrite' } : { mode: 'read' };
    if ((await (fileHandle as any).queryPermission(options)) === 'granted') return true;
    if ((await (fileHandle as any).requestPermission(options)) === 'granted') return true;
    return false;
};


// --- Automatic Backup Logic ---

let autoBackupEnabled = false;
let autoBackupHandle: FileSystemFileHandle | null = null;

export const initializeAutoBackup = async () => {
    const settings = await db.settings.get('app');
    autoBackupEnabled = settings?.auto_backup_enabled || false;
    if (autoBackupEnabled) {
        autoBackupHandle = await getFileHandle('auto_backup');
        if (autoBackupHandle) {
             const hasPermission = await verifyPermission(autoBackupHandle, true);
             if(!hasPermission) {
                console.warn("Permission denied for auto-backup file. Disabling feature.");
                autoBackupHandle = null;
                await db.settings.update('app', { auto_backup_enabled: false });
             }
        }
    }
};

// Call this on app start
initializeAutoBackup();

export const configureAutoBackup = async (): Promise<boolean> => {
    try {
        const handle = await (window as any).showSaveFilePicker({
            suggestedName: 'flmanager_autobackup.json',
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });
        await saveFileHandle('auto_backup', handle);
        autoBackupHandle = handle;
        autoBackupEnabled = true;
        await db.settings.update('app', { auto_backup_enabled: true });
        await performAutoBackup(); // Perform initial backup
        return true;
    } catch (err) {
        console.error("Auto-backup configuration cancelled or failed:", err);
        return false;
    }
};

export const disableAutoBackup = async () => {
    autoBackupEnabled = false;
    autoBackupHandle = null;
    await db.settings.update('app', { auto_backup_enabled: false });
    // Note: We don't delete the handle, just stop using it.
};

export const performAutoBackup = async (): Promise<void> => {
    if (!autoBackupEnabled || !autoBackupHandle) return;

    try {
        const writable = await (autoBackupHandle as any).createWritable();
        const backupData = await createBackupObject();
        await writable.write(JSON.stringify(backupData));
        await writable.close();
    } catch (err) {
        console.error("Automatic backup failed:", err);
    }
};

// --- Manual Export / Import Logic ---

const createBackupObject = async (): Promise<BackupData> => {
    const backup: BackupData = {};
    await db.transaction('r', db.tables, async () => {
        for (const tableName of TABLES_TO_BACKUP) {
            backup[tableName] = await db.table(tableName).toArray();
        }
    });
    return backup;
}

export const exportToFile = async () => {
    try {
        const backupData = await createBackupObject();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `flmanager_backup_${timestamp}.json`;

        const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });

        const writable = await (handle as any).createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (err) {
        console.error("Export failed:", err);
        throw new Error("Exporteren is geannuleerd of mislukt.");
    }
};


export const importFromFile = async (): Promise<void> => {
    try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
        });
        const file = await fileHandle.getFile();
        const fileContent = await file.text();
        
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

        // After a manual import, re-initialize settings dependent logic
        await initializeAutoBackup();
        
    } catch (err) {
        console.error("Import failed:", err);
        throw new Error("Importeren is geannuleerd of mislukt.");
    }
};