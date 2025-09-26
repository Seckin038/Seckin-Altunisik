import { db } from '../lib/db';
import type { AppSettings } from '../types';
import { DEFAULT_WHATSAPP_TEMPLATES, DEFAULT_COUNTRY_TEMPLATES } from './templates';
import { countries } from './countries';

export const seedDatabase = async (): Promise<void> => {
    const settingsCount = await db.settings.count();
    
    // If settings exist, we assume the DB has been seeded.
    if (settingsCount > 0) {
        return;
    }

    console.log("Database is empty, seeding with default data...");

    try {
        await db.transaction('rw', db.tables, async () => {
            // 1. Default App Settings
            const defaultSettings: AppSettings = {
                id: 'app',
                test_hours: 6,
                year_days: 365,
                reward_milestones: [5, 10, 15],
                price_standard: 55,
                price_vrienden: 40,
                price_erotiek_addon: 5,
                referral_reset_years: 1,
                pin: '0000', // Default PIN as requested
                pin_lock_enabled: false,
                // Hardcoded Supabase credentials as requested
                supabaseUrl: 'https://ovekxbwkzmodjztwdhyu.supabase.co',
                supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZWt4Yndrem1vZGp6dHdkaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTUzNzYsImV4cCI6MjA3Mzk5MTM3Nn0.M5DyB9lZUfumMiCRGdD3p5kBU-XQnJBaRWJUWAjpmCU',
                // Hardcoded security questions and answers as requested
                security_questions: [
                    { question: 'Geboorteplaats', answer: 'Zwolle' },
                    { question: 'Naam vader', answer: 'Isa' },
                    { question: 'Naam moeder', answer: 'Turkan' }
                ]
            };
            await db.settings.add(defaultSettings);

            // 2. Default WhatsApp Templates
            await db.whatsappTemplates.bulkAdd(
                DEFAULT_WHATSAPP_TEMPLATES.map((t, i) => ({ ...t, id: `w-template-${i}` }))
            );

            // 3. Default Country Templates
            await db.countryTemplates.bulkAdd(
                DEFAULT_COUNTRY_TEMPLATES.map((t, i) => ({ ...t, id: `c-template-${i}` }))
            );

            // 4. Countries list
            await db.countries.bulkAdd(countries);
        });
        console.log("Database seeding completed successfully.");
    } catch (error) {
        console.error("Failed to seed database:", error);
        // This is a critical error, might be worth throwing it
        // so the app can show a failure state.
        throw new Error("Database initialization failed.");
    }
};
