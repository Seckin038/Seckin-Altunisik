import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Subscription, Customer, AppSettings, WhatsappTemplate } from '../types';
// FIX: Corrected import path.
import { renderWhatsappTemplate, pickTemplateNameForStream } from '../lib/whatsappRenderer';
// FIX: Corrected icon import.
import { CopyIcon } from './ui/Icons';
import { toast } from './ui/Toaster';

interface BulkWhatsappModalProps {
    subscriptions: Subscription[];
    onClose: () => void;
}

const MessagePreview: React.FC<{ message: string, customerName: string }> = ({ message, customerName }) => (
    <div className="p-4 border rounded-lg dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">{customerName}</h4>
            <button
                onClick={() => {
                    navigator.clipboard.writeText(message);
                    toast.success(`Bericht voor ${customerName} gekopieerd!`);
                }}
                className="p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
                <CopyIcon className="h-5 w-5"/>
            </button>
        </div>
        <textarea
            readOnly
            value={message}
            rows={8}
            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
        />
    </div>
);

export const BulkWhatsappModal: React.FC<BulkWhatsappModalProps> = ({ subscriptions, onClose }) => {
    const customers = useLiveQuery(() => db.customers.toArray());
    const templates = useLiveQuery(() => db.whatsappTemplates.toArray());
    const settings = useLiveQuery(() => db.settings.get('app'));

    const customersById = useMemo(() => {
        if (!customers) return {};
        return customers.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {} as Record<string, Customer>);
    }, [customers]);

    const generatedMessages = useMemo(() => {
        if (!templates || !settings || !customersById) return [];

        return subscriptions.map(sub => {
            const customer = customersById[sub.customer_id];
            if (!customer) return null;

            const templateName = pickTemplateNameForStream(sub);
            const template = templates.find(t => t.name === templateName);
            if (!template) return { customer, message: 'Geen passend sjabloon gevonden.' };
            
            const message = renderWhatsappTemplate(template.message, customer, settings, sub);
            return { customer, message };

        }).filter(Boolean);

    }, [subscriptions, templates, settings, customersById]);

    if (!templates || !settings) {
        return <div>Laden...</div>;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-40 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl my-8 space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Bulk WhatsApp Berichten ({generatedMessages.length})</h2>
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-3 py-1.5 rounded-lg">Sluiten</button>
                 </div>
                 
                 <p className="text-sm text-gray-600 dark:text-gray-300">
                    Hieronder staan de automatisch gegenereerde herinneringsberichten voor de geselecteerde klanten. Kopieer elk bericht en stuur het via WhatsApp.
                 </p>
                 
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {generatedMessages.map(item => (
                        item && <MessagePreview key={item.customer.id} customerName={item.customer.name} message={item.message} />
                    ))}
                 </div>
            </div>
        </div>
    );
};