
import Dexie, { Table } from 'dexie';
// FIX: Corrected import path for types. The path was correct, but the target file was empty.
import type { Customer, Subscription, AppSettings, WhatsappTemplate, CountryTemplate, TimelineEvent, GiftCode, WhatsappLog, Payment, Country } from '../types';

// Add this interface for the new table
export interface FileHandleEntry {
    id: string;
    handle: any; // Storing FileSystemFileHandle, 'any' for compatibility
}

export class FLManagerDB extends Dexie {
    customers!: Table<Customer, string>;
    subscriptions!: Table<Subscription, string>;
    settings!: Table<AppSettings, string>;
    whatsappTemplates!: Table<WhatsappTemplate, string>;
    countryTemplates!: Table<CountryTemplate, string>;
    timeline!: Table<TimelineEvent, string>;
    giftCodes!: Table<GiftCode, string>;
    whatsappLogs!: Table<WhatsappLog, string>;
    payments!: Table<Payment, string>;
    countries!: Table<Country, string>;
    fileHandles!: Table<FileHandleEntry, string>; // New table for file handles

    constructor() {
        super('FLManagerDB');
        // FIX: In some TypeScript configurations, methods from the base `Dexie` class are not
        // correctly inferred on the subclass. Casting `this` to `Dexie` explicitly tells
        // the type checker that methods like `version()` are available, resolving the error.
        
        // FIX: Bumped database version to 10 to add fileHandles table.
        // FIX: Cast `this` to `Dexie` to fix: Property 'version' does not exist on type 'FLManagerDB'.
        (this as Dexie).version(10).stores({
            customers: 'id, name, referrer_id, created_at',
            subscriptions: 'id, customer_id, status, end_at, mac',
            settings: 'id',
            whatsappTemplates: 'id, name',
            countryTemplates: 'id, name',
            timeline: 'id, customer_id, timestamp, type',
            giftCodes: 'id, referrer_id, milestone, used_by_customer_id, created_at, reason, expires_at, used_for_subscription_id',
            whatsappLogs: 'id, customer_id, timestamp',
            payments: 'id, customer_id, subscription_id, payment_date',
            countries: 'code, name',
            fileHandles: 'id', // Add the new table schema
        });
    }
}

// FIX: To resolve similar type errors across the application where methods like `transaction()`,
// `table()`, and the `tables` property were not found, we explicitly cast the exported `db` instance.
// This ensures TypeScript recognizes the full Dexie API on the `db` object.
// FIX: Cast `db` instance to a type intersection to make Dexie methods available across the app.
export const db = new FLManagerDB() as FLManagerDB & Dexie;