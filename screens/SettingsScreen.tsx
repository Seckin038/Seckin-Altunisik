

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { toast } from '../components/ui/Toaster';
import { CountryTemplatesSettings } from '../components/CountryTemplatesSettings';
import { WhatsappTemplatesSettings } from '../components/WhatsappTemplatesSettings';
import { SyncModal } from '../components/SyncModal';
import { fullSync, restoreFromCloud } from '../lib/backup';
import { exportToFile, importFromFile } from '../lib/file-backup'; // New import
import { formatNL, normalizeError } from '../lib/utils';
import type { AppSettings } from '../types';
import { deleteAllUserData, deleteTestCustomers } from '../lib/data-mutations';
import { MassDeleteModal } from '../components/MassDeleteModal';
import { RestoreModal } from '../components/RestoreModal';
import { DeleteTestCustomersModal } from '../components/DeleteTestCustomersModal';
import { initializeSupabaseClient, getSupabaseUrls } from '../lib/supabase';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} id={props.id || props.name} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <select {...props} id={props.id || props.name} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            {children}
        </select>
    </div>
);

const ToggleSwitch: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex justify-between items-center cursor-pointer">
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    <div className="relative inline-flex items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
    </div>
  </label>
);

const SupabaseSetupModal: React.FC<{
    onSave: (url: string, key: string) => void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

    const handleSaveClick = () => {
        if (!supabaseUrl || !supabaseAnonKey) {
            toast.error("Beide velden zijn verplicht.");
            return;
        }
        onSave(supabaseUrl, supabaseAnonKey);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
                 <h1 className="text-2xl font-bold text-center">Cloud Synchronisatie Instellen</h1>
                 <p className="text-center text-gray-600 dark:text-gray-300">
                    Configureer je Supabase project om je data veilig te stellen en te synchroniseren.
                 </p>
                 <div className="space-y-4">
                     <div>
                         <InputField 
                             label="Supabase URL" 
                             value={supabaseUrl} 
                             onChange={(e) => setSupabaseUrl(e.target.value)}
                             placeholder="https://your-project-ref.supabase.co"
                         />
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">Moet eindigen op .supabase.co (niet .functions.supabase.co)</p>
                    </div>
                     <InputField 
                         label="Supabase Anon Key" 
                         value={supabaseAnonKey} 
                         onChange={(e) => setSupabaseAnonKey(e.target.value)}
                         placeholder="eyJhbGciOi..."
                     />
                 </div>
                 <div className="flex justify-end space-x-2">
                     <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg">Annuleren</button>
                     <button onClick={handleSaveClick} className="bg-brand-600 text-white px-6 py-2 rounded-lg">
                         Opslaan
                     </button>
                 </div>
             </div>
        </div>
    );
};

export const SettingsScreen: React.FC<{ settings: AppSettings }> = ({ settings: liveSettings }) => {
    const [settings, setSettings] = useState<Partial<AppSettings>>({});
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [isSupabaseSetupOpen, setIsSupabaseSetupOpen] = useState(false);
    const [isMassDeleteOpen, setIsMassDeleteOpen] = useState(false);
    const [isRestoreOpen, setIsRestoreOpen] = useState(false);
    const [isDeleteTestOpen, setIsDeleteTestOpen] = useState(false);
    const [derivedUrls, setDerivedUrls] = useState<{ rest: string, functions: string } | null>(null);
    
    useEffect(() => {
        if (liveSettings) {
            setSettings(liveSettings);
            if (liveSettings.supabaseUrl && liveSettings.supabaseAnonKey) {
                try {
                    initializeSupabaseClient(liveSettings.supabaseUrl, liveSettings.supabaseAnonKey);
                    const { REST_URL, FUNCTIONS_URL } = getSupabaseUrls();
                    setDerivedUrls({ rest: REST_URL, functions: FUNCTIONS_URL });
                } catch (e: any) {
                    toast.error(normalizeError(e));
                    setDerivedUrls(null);
                }
            }
        }
    }, [liveSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const parsedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setSettings(s => ({ ...s, [name]: parsedValue }));
    };

    const handleSave = async (section: string) => {
        try {
            const updatedSettings = { ...liveSettings, ...settings } as AppSettings;
            await db.settings.put(updatedSettings);
            
            if (section === 'API Keys' && updatedSettings.supabaseUrl && updatedSettings.supabaseAnonKey) {
                 initializeSupabaseClient(updatedSettings.supabaseUrl, updatedSettings.supabaseAnonKey);
                 const { REST_URL, FUNCTIONS_URL } = getSupabaseUrls();
                 setDerivedUrls({ rest: REST_URL, functions: FUNCTIONS_URL });
            }
            toast.success(`${section} opgeslagen!`);
        } catch (error: any) {
            toast.error(normalizeError(error));
            setDerivedUrls(null);
            console.error(error);
        }
    };
    
    const handleSaveKeys = async (supabaseUrl: string, supabaseAnonKey: string) => {
        try {
            initializeSupabaseClient(supabaseUrl, supabaseAnonKey);
            const updatedSettings = {
                ...liveSettings,
                ...settings,
                supabaseUrl,
                supabaseAnonKey,
            } as AppSettings;
            await db.settings.put(updatedSettings);
            const { REST_URL, FUNCTIONS_URL } = getSupabaseUrls();
            setDerivedUrls({ rest: REST_URL, functions: FUNCTIONS_URL });
            toast.success("Synchronisatie instellingen opgeslagen!");
            setIsSupabaseSetupOpen(false);
        } catch (error: any) {
            toast.error(normalizeError(error));
            setDerivedUrls(null);
            console.error(error);
        }
    }
    
    const handleMassDelete = async (pin: string) => {
        if (pin !== liveSettings.pin) {
            toast.error("Incorrecte pincode. Actie geannuleerd.");
            return;
        }
        try {
            await deleteAllUserData();
            toast.success("Alle klantdata is succesvol verwijderd. De app wordt opnieuw geladen.");
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            toast.error("Kon de data niet verwijderen.");
            console.error(error);
        } finally {
            setIsMassDeleteOpen(false);
        }
    }

    const handleRestore = async (pin: string) => {
         if (pin !== liveSettings.pin) {
            toast.error("Incorrecte pincode. Actie geannuleerd.");
            return;
        }
        const toastId = toast.loading("Herstellen vanaf cloud...", { duration: Infinity });
        try {
            await restoreFromCloud();
            toast.success("Herstel voltooid! De app wordt opnieuw geladen.", { id: toastId, duration: 5000 });
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            const errorMessage = normalizeError(error);
            toast.error(`Herstel mislukt. ${errorMessage}`, { id: toastId, duration: 5000 });
            console.error(error);
        } finally {
            setIsRestoreOpen(false);
        }
    }

    const handleDeleteTestCustomers = async (pin: string) => {
        if (pin !== liveSettings.pin) {
            toast.error("Incorrecte pincode. Actie geannuleerd.");
            return;
        }
        try {
            const count = await deleteTestCustomers();
            if (count > 0) {
                toast.success(`${count} testklant(en) en hun data zijn succesvol verwijderd.`);
            } else {
                toast("Geen testklanten gevonden om te verwijderen.");
            }
        } catch (error) {
            toast.error("Kon de testklanten niet verwijderen.");
            console.error(error);
        } finally {
            setIsDeleteTestOpen(false);
        }
    };

    const handleFileExport = async () => {
        const toastId = toast.loading("Back-up maken...", { duration: Infinity });
        try {
            await exportToFile();
            toast.success("Back-up bestand succesvol opgeslagen!", { id: toastId });
        } catch (error: any) {
            if (error.name !== 'AbortError') { // User cancelling is not an error
                toast.error(`Exporteren mislukt: ${error.message}`, { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        }
    };

    const handleFileImport = async () => {
        const toastId = toast.loading("Data importeren...", { duration: Infinity });
        try {
            await importFromFile();
            toast.success("Data succesvol geïmporteerd! De app wordt opnieuw geladen.", { id: toastId, duration: 5000 });
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
             if (error.name !== 'AbortError') {
                toast.error(`Importeren mislukt: ${error.message}`, { id: toastId });
            } else {
                 toast.dismiss(toastId);
            }
        }
    };

    const handlePinLockToggle = async (enabled: boolean) => {
        setSettings(s => ({...s, pin_lock_enabled: enabled }));
         try {
            await db.settings.update('app', { pin_lock_enabled: enabled });
            toast.success(`Inlogscherm ${enabled ? 'ingeschakeld' : 'uitgeschakeld'}.`);
        } catch (error) {
            toast.error("Kon instelling niet opslaan.");
        }
    };

    if (!liveSettings) {
        return (
             <div className="flex items-center justify-center h-screen">
                <div className="text-2xl font-semibold">Instellingen laden...</div>
            </div>
        );
    }
    
    const areKeysMissing = !liveSettings.supabaseUrl || !liveSettings.supabaseAnonKey;
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Instellingen</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Eenvoudige Back-up & Herstel</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Maak een handmatige back-up naar een .json-bestand op uw computer of in een cloudmap (zoals Google Drive). Ideaal voor snelle, losse back-ups.</p>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleFileExport} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Maak Back-up (.json)
                    </button>
                    <button onClick={handleFileImport} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900">
                        Herstel van Back-up (.json)
                    </button>
                </div>
            </div>

             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Beveiliging</h2>
                <div className="space-y-4">
                    <ToggleSwitch
                        label="Pincode Inlogscherm"
                        checked={!!settings.pin_lock_enabled}
                        onChange={handlePinLockToggle}
                    />
                     <p className="text-xs text-gray-500 dark:text-gray-400">
                        Indien ingeschakeld, moet u bij het opstarten van de app een pincode invoeren. De standaard pincode is 0000.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Abonnementen & Prijzen</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Test duur (uren)" name="test_hours" type="number" value={settings.test_hours ?? ''} onChange={handleChange} />
                    <InputField label="Abonnement duur (dagen)" name="year_days" type="number" value={settings.year_days ?? ''} onChange={handleChange} />
                    <InputField label="Standaard Prijs (€)" name="price_standard" type="number" value={settings.price_standard ?? ''} onChange={handleChange} />
                    <InputField label="Vrienden Prijs (€)" name="price_vrienden" type="number" value={settings.price_vrienden ?? ''} onChange={handleChange} />
                    <InputField label="Erotiek Toeslag (€)" name="price_erotiek_addon" type="number" value={settings.price_erotiek_addon ?? ''} onChange={handleChange} />
                </div>
                 <div className="flex justify-end mt-4">
                    <button onClick={() => handleSave('Prijzen')} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Prijzen Opslaan</button>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Werving & Beloningen</h2>
                <SelectField label="Werving Reset Periode" name="referral_reset_years" value={settings.referral_reset_years ?? 1} onChange={handleChange}>
                    <option value="1">Elk jaar</option>
                    <option value="2">Elke 2 jaar</option>
                    <option value="3">Elke 3 jaar</option>
                    <option value="0">Nooit resetten</option>
                </SelectField>
                 <div className="flex justify-end mt-4">
                    <button onClick={() => handleSave('Werving')} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Werving Opslaan</button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                 <h2 className="text-xl font-semibold mb-2">Real-time Synchronisatie (voor meerdere apparaten)</h2>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Gebruik Supabase om uw data automatisch te synchroniseren tussen bijvoorbeeld uw PC en mobiel.</p>
                {areKeysMissing ? (
                    <div className="text-center p-4 border-2 border-dashed rounded-lg dark:border-gray-600">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Real-time synchronisatie is nog niet geconfigureerd.</p>
                        <button onClick={() => setIsSupabaseSetupOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg">
                            Configureer Nu
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Laatst gesynchroniseerd: {settings.last_sync ? formatNL(settings.last_sync) : 'Nooit'}</p>
                             <button onClick={() => setIsSyncModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg">Synchroniseer</button>
                        </div>
                        <div>
                            <InputField label="Supabase URL" name="supabaseUrl" value={settings.supabaseUrl || ''} onChange={handleChange} />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">Moet eindigen op .supabase.co</p>
                        </div>
                        <InputField label="Supabase Anon Key" name="supabaseAnonKey" value={settings.supabaseAnonKey || ''} onChange={handleChange} />
                         <div className="flex justify-end mt-2">
                            <button onClick={() => handleSave('API Keys')} className="bg-brand-600 text-white px-4 py-2 rounded-lg">API Keys Opslaan</button>
                        </div>
                        {derivedUrls && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs space-y-1">
                                <p><strong>Gevalideerde REST URL:</strong> {derivedUrls.rest}</p>
                                <p><strong>Afgeleide Functions URL:</strong> {derivedUrls.functions}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <CountryTemplatesSettings />
            <WhatsappTemplatesSettings />
            
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg shadow p-6">
                 <h2 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">Gevarenzone</h2>
                 <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Gevaarlijke acties die data kunnen verwijderen of overschrijven. Ga voorzichtig te werk.
                 </p>
                 <div className="flex flex-wrap justify-end gap-2">
                     <button onClick={() => setIsDeleteTestOpen(true)} className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
                         Verwijder Testklanten
                     </button>
                     <button onClick={() => setIsRestoreOpen(true)} className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">
                         Herstel Vanaf Cloud (Supabase)
                     </button>
                     <button onClick={() => setIsMassDeleteOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                         Verwijder Alle Data
                     </button>
                 </div>
            </div>

            <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} onSync={fullSync} />
            {isSupabaseSetupOpen && <SupabaseSetupModal onSave={handleSaveKeys} onClose={() => setIsSupabaseSetupOpen(false)} />}
            <MassDeleteModal isOpen={isMassDeleteOpen} onClose={() => setIsMassDeleteOpen(false)} onConfirm={handleMassDelete} />
            <RestoreModal isOpen={isRestoreOpen} onClose={() => setIsRestoreOpen(false)} onConfirm={handleRestore} />
            <DeleteTestCustomersModal isOpen={isDeleteTestOpen} onClose={() => setIsDeleteTestOpen(false)} onConfirm={handleDeleteTestCustomers} />
        </div>
    );
};