import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { formatNL } from '../lib/utils';
// FIX: Corrected icon import.
import { CopyIcon } from './ui/Icons';
import { toast } from './ui/Toaster';

interface WhatsappArchiveTabProps {
    customerId: string;
}

export const WhatsappArchiveTab: React.FC<WhatsappArchiveTabProps> = ({ customerId }) => {
    const logs = useLiveQuery(
        () => db.whatsappLogs.where('customer_id').equals(customerId).reverse().sortBy('timestamp'),
        [customerId]
    );

    const handleCopy = (message: string) => {
        navigator.clipboard.writeText(message);
        toast.success("Bericht gekopieerd!");
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Gearchiveerde WhatsApp Berichten</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {logs && logs.length > 0 ? (
                    logs.map(log => (
                        <div key={log.id} className="p-4 border rounded-lg dark:border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    <p><strong>Verzonden op:</strong> {formatNL(log.timestamp)}</p>
                                    {log.template_name && <p><strong>Sjabloon:</strong> {log.template_name}</p>}
                                </div>
                                <button 
                                    onClick={() => handleCopy(log.message)}
                                    className="p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                                >
                                    <CopyIcon className="h-5 w-5"/>
                                </button>
                            </div>
                            <textarea
                                readOnly
                                value={log.message}
                                rows={10}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
                            />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Geen gearchiveerde berichten gevonden voor deze klant.
                    </div>
                )}
            </div>
        </div>
    );
};