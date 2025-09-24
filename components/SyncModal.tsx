import React, { useState } from 'react';
import { toast } from './ui/Toaster';
// FIX: Corrected icon import.
import { RefreshIcon } from './ui/Icons';

interface SyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSync: () => Promise<void>;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onSync }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        const toastId = toast.loading('Synchroniseren...', { duration: Infinity });
        try {
            await onSync();
            toast.success('Synchronisatie voltooid!', { id: toastId, duration: 5000 });
            onClose();
        } catch (err: any) {
            const errorMessage = err.message || 'Er is een onbekende fout opgetreden.';
            setError(errorMessage);
            toast.error(`Synchronisatie mislukt: ${errorMessage}`, { id: toastId, duration: 5000 });
        } finally {
            setIsSyncing(false);
        }
    };
    
    const handleClose = () => {
        if (isSyncing) return;
        setError(null);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Synchroniseer met Cloud</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Dit zal je lokale data naar de cloud pushen en de laatste data van de cloud ophalen. 
                    Zorg dat je Supabase instellingen correct zijn.
                </p>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                        <p className="font-bold">Fout</p>
                        <p>{error}</p>
                    </div>
                )}
                
                <div className="flex justify-end space-x-2">
                    <button 
                        type="button" 
                        onClick={handleClose} 
                        disabled={isSyncing}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 disabled:opacity-50"
                    >
                        Annuleren
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center disabled:opacity-50"
                    >
                        {isSyncing && <RefreshIcon className="animate-spin h-5 w-5 mr-2" />}
                        {isSyncing ? 'Synchroniseren...' : 'Start Sync'}
                    </button>
                </div>
            </div>
        </div>
    );
};