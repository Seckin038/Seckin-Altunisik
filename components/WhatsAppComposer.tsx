import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, Subscription, AppSettings, WhatsappTemplate } from '../types';
// FIX: Corrected import path.
import { renderWhatsappTemplate } from '../lib/whatsappRenderer';
import { logWhatsappMessage } from '../lib/timeline';
import { toast } from './ui/Toaster';
// FIX: Corrected icon import.
import { CopyIcon } from './ui/Icons';

interface WhatsAppComposerProps {
    customer: Customer;
    subscriptions: Subscription[];
}

export const WhatsappComposer: React.FC<WhatsAppComposerProps> = ({ customer, subscriptions }) => {
    const templates = useLiveQuery(() => db.whatsappTemplates.orderBy('name').toArray());
    const settings = useLiveQuery(() => db.settings.get('app'));
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(subscriptions[0]?.id || '');
    const [customMessage, setCustomMessage] = useState('');
    
    const selectedTemplate = useMemo(() => templates?.find(t => t.id === selectedTemplateId), [templates, selectedTemplateId]);
    const selectedSubscription = useMemo(() => subscriptions.find(s => s.id === selectedSubscriptionId), [subscriptions, selectedSubscriptionId]);

    const isMultiStreamTemplate = selectedTemplate?.name.includes('Multi-stream');

    const finalMessage = useMemo(() => {
        if (selectedTemplate && settings) {
            // For multi-stream templates, pass all subscriptions. Otherwise, pass only the selected one.
            const subsForRender = isMultiStreamTemplate ? subscriptions : selectedSubscription;
            
            return renderWhatsappTemplate(
                selectedTemplate.message,
                customer,
                settings,
                subsForRender
            );
        }
        return customMessage;
    }, [selectedTemplate, selectedSubscription, customMessage, customer, settings, isMultiStreamTemplate, subscriptions]);
    
    const handleCopyAndLog = async () => {
        if (!finalMessage) {
            toast.error("Geen bericht om te kopiëren.");
            return;
        }
        navigator.clipboard.writeText(finalMessage);
        await logWhatsappMessage(customer.id, finalMessage, selectedTemplate?.name);
        toast.success("Bericht gekopieerd en gearchiveerd!");
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <h2 className="text-xl font-semibold">Stuur WhatsApp Bericht</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <SelectField label="Kies Sjabloon" value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                    <option value="">-- Handmatig bericht --</option>
                    {templates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </SelectField>
                 <SelectField label="Kies Stream" value={selectedSubscriptionId} onChange={e => setSelectedSubscriptionId(e.target.value)} disabled={isMultiStreamTemplate}>
                     {subscriptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                 </SelectField>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bericht Preview</label>
                <textarea
                    value={finalMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    readOnly={!!selectedTemplateId}
                    rows={10}
                    className="mt-1 w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
            </div>
             <div className="flex justify-end">
                <button 
                    onClick={handleCopyAndLog}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                    <CopyIcon className="h-5 w-5"/>
                    <span>Kopieer & Archiveer</span>
                </button>
            </div>
        </div>
    );
};

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <select {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50">
            {children}
        </select>
    </div>
);