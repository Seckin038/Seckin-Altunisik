
import { db } from '../lib/db';
// FIX: Corrected import paths.
import { DEFAULT_WHATSAPP_TEMPLATES, DEFAULT_COUNTRY_TEMPLATES } from './templates';
import { generateId, computeEndDate } from '../lib/utils';
import type { AppSettings, WhatsappTemplate, CountryTemplate, Customer, Subscription } from '../types';
import { countries as countriesData } from './countries';

const DEFAULT_SETTINGS: AppSettings = {
    id: 'app',
    test_hours: 6,
    year_days: 365,
    reward_milestones: [5, 10, 15, 20, 25, 50],
    price_standard: 55,
    price_vrienden: 40,
    price_erotiek_addon: 5,
    referral_reset_years: 1, // Reset every year
    pin: '0000',
    pin_lock_enabled: false,
    supabaseUrl: 'https://ovekxbwkzmodjztdwhyu.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZWt4Yndrem1vZGp6dHdkaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTUzNzYsImV4cCI6MjA3Mzk5MTM3Nn0.M5DyB9lZUfumMiCRGdD3p5kBU-XQnJBaRWJUWAjpmCU',
};

const createTestCustomer = (name: string, referrer_id?: string): Customer => {
    const now = Date.now();
    return {
        id: generateId(),
        name,
        created_at: now,
        updated_at: now,
        referrer_id,
        phone: `+316${Math.floor(10000000 + Math.random() * 90000000)}`
    };
};

const createTestSubscription = (customer_id: string, index: number, erotiek: boolean, paid: boolean, payment_method: 'Vrienden prijs' | 'Tikkie'): Subscription => {
    const now = Date.now();
    const settings = DEFAULT_SETTINGS;
    return {
        id: generateId(),
        customer_id,
        label: `Tv Flamingo Stream ${index + 1}`,
        status: 'ACTIVE',
        start_at: now,
        end_at: computeEndDate(now, 'ACTIVE', settings),
        paid,
        erotiek,
        free: false,
        countries: erotiek ? ['NL', 'TR', 'BE', 'DE'] : ['NL', 'BE'],
        payment_method,
        mac: `00:1A:79:${Math.floor(Math.random()*90)+10}:${Math.floor(Math.random()*90)+10}:${Math.floor(Math.random()*90)+10}`,
        created_at: now,
        updated_at: now,
    };
};


export const seedDatabase = async () => {
    const customerCount = await db.customers.count();
    
    // Ensure countries are seeded
    const countryCount = await db.countries.count();
    if (countryCount === 0) {
        console.log("Seeding countries list...");
        await db.countries.bulkAdd(countriesData);
    }
    
    if (customerCount > 0) {
        console.log("Database already contains customers. Ensuring settings are up-to-date.");
        const existingSettings = await db.settings.get('app');
        // Merge defaults with existing settings to safely add new fields
        const mergedSettings = { ...DEFAULT_SETTINGS, ...existingSettings, id: 'app' };
        await db.settings.put(mergedSettings);
        return;
    }

    console.log("Seeding database with 30 test customers...");
    
    await db.transaction('rw', db.tables, async () => {
        // Clear existing data just in case
        await Promise.all(db.tables.map(table => {
            // Do not clear countries table if it was just seeded
            if (table.name !== 'countries') {
                return table.clear();
            }
        }));

        // Add settings, templates
        await db.settings.add(DEFAULT_SETTINGS);
        await db.whatsappTemplates.bulkAdd(DEFAULT_WHATSAPP_TEMPLATES.map(t => ({...t, id: generateId()})));
        await db.countryTemplates.bulkAdd(DEFAULT_COUNTRY_TEMPLATES.map(t => ({...t, id: generateId()})));
        
        // Create 30 customers
        const customers: Customer[] = [];
        const subscriptions: Subscription[] = [];
        
        const referrer = createTestCustomer("Test 1");
        customers.push(referrer);
        subscriptions.push(createTestSubscription(referrer.id, 0, true, true, 'Tikkie'));

        // 16 referred by Test 1
        for (let i = 2; i <= 17; i++) {
            const customer = createTestCustomer(`Test ${i}`, referrer.id);
            customers.push(customer);
            subscriptions.push(createTestSubscription(customer.id, 0, i % 3 === 0, true, i % 4 === 0 ? 'Vrienden prijs' : 'Tikkie'));
        }
        
        // 13 more customers without referrer
        for (let i = 18; i <= 30; i++) {
             const customer = createTestCustomer(`Test ${i}`);
             customers.push(customer);
             subscriptions.push(createTestSubscription(customer.id, 0, i % 2 === 0, true, 'Tikkie'));
        }

        await db.customers.bulkAdd(customers);
        await db.subscriptions.bulkAdd(subscriptions);
    });
    
    console.log("Database seeding complete.");
};