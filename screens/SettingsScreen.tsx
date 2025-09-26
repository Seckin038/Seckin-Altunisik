
// FIX: Restored the full content of this file, which was previously empty/corrupted.
// This component renders the main settings page for the application.
import React, { useState, useEffect } from 'react';
import type { AppSettings } from '../types';
import { db } from '../lib/db';
import { toast } from '../components/ui/Toaster';
import { WhatsappTemplatesSettings } from '../components/WhatsappTemplatesSettings';
import { CountryTemplatesSettings } from '../components/CountryTemplatesSettings';
import { SyncModal } from '../components/SyncModal';
import { MassDeleteModal } from '../components/MassDeleteModal';
import { RestoreModal } from '../components/RestoreModal';
import { DeleteTestCustomersModal } from '../components/DeleteTestCustomersModal';
import { CreateTestCustomersModal } from '../components/CreateTestCustomersModal';
import { fullSync, restoreFromCloud } from '../lib/backup';
import { initializeSupabaseClient } from '../lib/supabase';

interface SettingsScreenProps {
    settings: AppSettings;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="space-y-4">{children}</div>
    </div>
);

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }> = ({ label, description, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
        {description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ settings }) => {
    const [formState, setFormState] = useState(settings);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isMassDeleteModalOpen, setIsMassDeleteModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isDeleteTestModalOpen, setIsDeleteTestModalOpen] = useState(false);
    const [isCreateTestModalOpen, setIsCreateTestModalOpen] = useState(false);
    
    useEffect(() => {
        setFormState(settings);
    }, [settings]);

    useEffect(() => {
        if(settings.supabaseUrl && settings.supabaseAnonKey) {
            try {
                initializeSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
            } catch(e) {
                console.error("Kon Supabase niet initialiseren bij laden van instellingen:", e);
            }
        }
    }, [settings.supabaseUrl, settings.supabaseAnonKey]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormState(s => ({
            ...s,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
        }));
    };
    
    const handleMilestonesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
         const milestones = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
         setFormState(s => ({ ...s, reward_milestones: milestones }));
    };
    
    const handleSaveAll = async () => {
         try {
            await db.settings.put(formState);
            toast.success("Alle instellingen opgeslagen!");
        } catch (e) {
            toast.error("Opslaan mislukt.");
        }
    }
    
    const handleMassDelete = async (pin: string) => {
        if (pin !== settings.pin) {
            toast.error("Incorrecte pincode.");
            return;
        }
        const toastId = toast.loading("Alle data wordt verwijderd...", { duration: Infinity });
        try {
            await db.transaction('rw', db.customers, db.subscriptions, db.timeline, db.giftCodes, db.whatsappLogs, db.payments, async () => {
                await db.customers.clear();
                await db.subscriptions.clear();
                await db.timeline.clear();
                await db.giftCodes.clear();
                await db.whatsappLogs.clear();
                await db.payments.clear();
            });
            toast.success("Alle klantdata is succesvol verwijderd.", { id: toastId, duration: 5000 });
            setIsMassDeleteModalOpen(false);
        } catch (e) {
             toast.error("Verwijderen mislukt.", { id: toastId, duration: 5000 });
        }
    };

    const handleRestore = async (pin: string) => {
        if (pin !== settings.pin) {
            toast.error("Incorrecte pincode.");
            return;
        }
        const toastId = toast.loading("Herstellen vanaf cloud...", { duration: Infinity });
        try {
            await restoreFromCloud();
            toast.success("Herstellen vanaf cloud voltooid!", { id: toastId, duration: 5000 });
            setIsRestoreModalOpen(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
            toast.error(`Herstellen mislukt: ${e.message}`, { id: toastId, duration: 5000 });
        }
    };

    const handleDeleteTestCustomers = async (pin: string) => {
        if (pin !== settings.pin) {
            toast.error("Incorrecte pincode.");
            return;
        }
        const toastId = toast.loading("Testklanten worden verwijderd...", { duration: Infinity });
        try {
            const testCustomers = await db.customers.filter(c => c.name.startsWith("Test ")).toArray();
            if (testCustomers.length === 0) {
                toast.success("Geen testklanten gevonden om te verwijderen.", { id: toastId });
                setIsDeleteTestModalOpen(false);
                return;
            }
            const customerIds = testCustomers.map(c => c.id);

            await db.transaction('rw', db.customers, db.subscriptions, db.timeline, db.payments, db.whatsappLogs, async () => {
                await db.customers.bulkDelete(customerIds);
                await db.subscriptions.where('customer_id').anyOf(customerIds).delete();
                await db.timeline.where('customer_id').anyOf(customerIds).delete();
                await db.payments.where('customer_id').anyOf(customerIds).delete();
                await db.whatsappLogs.where('customer_id').anyOf(customerIds).delete();
            });
            
            toast.success(`${testCustomers.length} testklant(en) verwijderd.`, { id: toastId, duration: 5000 });
            setIsDeleteTestModalOpen(false);
        } catch(e) {
            toast.error("Verwijderen van testklanten is mislukt.", { id: toastId, duration: 5000 });
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Instellingen</h1>
            
            <SettingsCard title="Algemeen">
                <InputField label="Testperiode (uren)" type="number" name="test_hours" value={formState.test_hours} onChange={handleChange} />
                <InputField label="Dagen per jaar" type="number" name="year_days" value={formState.year_days} onChange={handleChange} />
                <InputField label="Reset wervingen na (jaren)" type="number" name="referral_reset_years" value={formState.referral_reset_years} onChange={handleChange} />
                <InputField label="Werving mijlpalen" description="Komma-gescheiden, bv. 5,10,15" value={formState.reward_milestones.join(', ')} onChange={handleMilestonesChange} />
            </SettingsCard>

             <SettingsCard title="Prijzen (€)">
                <InputField label="Standaard Prijs" type="number" name="price_standard" value={formState.price_standard} onChange={handleChange} />
                <InputField label="Vriendenprijs" type="number" name="price_vrienden" value={formState.price_vrienden} onChange={handleChange} />
                <InputField label="Erotiek Toeslag" type="number" name="price_erotiek_addon" value={formState.price_erotiek_addon} onChange={handleChange} />
            </SettingsCard>
            
            <SettingsCard title="Beveiliging">
                <InputField label="4-cijferige pincode" type="password" name="pin" maxLength={4} value={formState.pin} onChange={handleChange} />
                <div className="flex items-center">
                    <input type="checkbox" id="pin_lock_enabled" name="pin_lock_enabled" checked={formState.pin_lock_enabled} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <label htmlFor="pin_lock_enabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Pincode bij opstarten vereisen</label>
                </div>
            </SettingsCard>
            
            <SettingsCard title="Cloud & Backup">
                <InputField label="Supabase URL" name="supabaseUrl" value={formState.supabaseUrl} onChange={handleChange} />
                <InputField label="Supabase Anon Key" type="password" name="supabaseAnonKey" value={formState.supabaseAnonKey} onChange={handleChange} />
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsSyncModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg">Synchroniseer</button>
                </div>
                 <p className="text-xs text-gray-500">Laatste sync: {formState.last_sync ? new Date(formState.last_sync).toLocaleString() : 'Nooit'}</p>
            </SettingsCard>
            
             <div className="flex justify-end pt-4">
                <button onClick={handleSaveAll} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-lg">Alle Instellingen Opslaan</button>
            </div>
            
            <WhatsappTemplatesSettings />
            <CountryTemplatesSettings />

             <SettingsCard title="Gevaarlijke Acties">
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsRestoreModalOpen(true)} className="bg-yellow-600 text-white px-4 py-2 rounded-lg">Herstel Vanaf Cloud</button>
                    <button onClick={() => setIsMassDeleteModalOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg">Verwijder Alle Klantdata</button>
                </div>
            </SettingsCard>
            
            <SettingsCard title="Development">
                <div className="flex flex-wrap gap-2">
                     <button onClick={() => setIsCreateTestModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Maak Testklanten</button>
                     <button onClick={() => setIsDeleteTestModalOpen(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg">Verwijder Testklanten</button>
                </div>
            </SettingsCard>

            <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} onSync={fullSync} />
            <MassDeleteModal isOpen={isMassDeleteModalOpen} onClose={() => setIsMassDeleteModalOpen(false)} onConfirm={handleMassDelete} />
            <RestoreModal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} onConfirm={handleRestore} />
            <DeleteTestCustomersModal isOpen={isDeleteTestModalOpen} onClose={() => setIsDeleteTestModalOpen(false)} onConfirm={handleDeleteTestCustomers} />
            <CreateTestCustomersModal isOpen={isCreateTestModalOpen} onClose={() => setIsCreateTestModalOpen(false)} />

        </div>
    );
};
