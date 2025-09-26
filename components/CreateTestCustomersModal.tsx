import React, { useState } from 'react';
import { db } from '../lib/db';
import { toast } from './ui/Toaster';
import { addCustomer, saveSubscription } from '../lib/data-mutations';
import { computeEndDate } from '../lib/utils';
import type { AppSettings } from '../types';

interface CreateTestCustomersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateTestCustomersModal: React.FC<CreateTestCustomersModalProps> = ({ isOpen, onClose }) => {
    const [count, setCount] = useState(10);
    const [isCreating, setIsCreating] = useState(false);
    
    const handleCreate = async () => {
        setIsCreating(true);
        const toastId = toast.loading(`Bezig met aanmaken van ${count} testklanten...`, { duration: Infinity });

        try {
            const settings = await db.settings.get('app');
            if (!settings) throw new Error("App settings not found.");
            
            for (let i = 1; i <= count; i++) {
                const customerData = {
                    name: `Test Klant ${Date.now() + i}`,
                    phone: `+316${String(Math.floor(10000000 + Math.random() * 90000000)).padStart(8, '0')}`,
                };
                const newCustomer = await addCustomer(customerData);

                // FIX: Explicitly type `status` to prevent it being widened to `string`.
                const status: 'ACTIVE' | 'TEST' = Math.random() > 0.5 ? 'ACTIVE' : 'TEST';
                const subData = {
                    customer_id: newCustomer.id,
                    label: 'Test Stream',
                    status: status,
                    paid: Math.random() > 0.3,
                    erotiek: Math.random() > 0.7,
                    mac: `00:1A:79:${Math.floor(Math.random()*255).toString(16).padStart(2, '0')}:${Math.floor(Math.random()*255).toString(16).padStart(2, '0')}:${Math.floor(Math.random()*255).toString(16).padStart(2, '0')}`.toUpperCase(),
                    start_at: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000), // Random start date in last 30 days
                    m3u_url: `http://test.server.com/get.php?username=test${i}&password=test${i}&type=m3u`
                };
                
                const endDate = computeEndDate(subData.start_at, subData.status, settings as AppSettings);
                await saveSubscription({ ...subData, end_at: endDate });
            }

            toast.success(`${count} testklanten succesvol aangemaakt!`, { id: toastId, duration: 5000 });
            onClose();

        } catch (error: any) {
            toast.error(`Fout: ${error.message}`, { id: toastId, duration: 5000 });
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Testklanten Aanmaken</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Creëer een aantal willekeurige klanten om de app te testen. Dit helpt bij het vullen van de database voor development.
                </p>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aantal klanten</label>
                    <input
                        type="number"
                        value={count}
                        onChange={e => setCount(Math.max(1, parseInt(e.target.value, 10)))}
                        className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    />
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                    <button onClick={onClose} disabled={isCreating} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg disabled:opacity-50">
                        Annuleren
                    </button>
                    <button onClick={handleCreate} disabled={isCreating} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                        {isCreating ? 'Aanmaken...' : 'Aanmaken'}
                    </button>
                </div>
            </div>
        </div>
    );
};