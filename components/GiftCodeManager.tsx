import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { fmtDate, generateGiftCodeString } from '../lib/utils';
// FIX: Corrected import path.
import { addGiftCode } from '../lib/data-mutations';
import { toast } from './ui/Toaster';
import type { GiftCode, Customer, GiftCodeReason, WhatsappTemplate } from '../types';
// FIX: Corrected icon imports.
import { CopyIcon, PlusIcon } from './ui/Icons';
// FIX: Corrected import path.
import { renderWhatsappTemplate } from '../lib/whatsappRenderer';
import { logWhatsappMessage } from '../lib/timeline';

const REASONS: GiftCodeReason[] = ['Promotie', 'Compensatie', 'Social', 'Wervingsbeloning', 'Anders'];

interface AddGiftCodeModalProps {
    onClose: () => void;
    customerId?: string;
}

const AddGiftCodeModal: React.FC<AddGiftCodeModalProps> = ({ onClose, customerId }) => {
    const [reason, setReason] = useState<GiftCodeReason>('Promotie');
    const [note, setNote] = useState('');
    const [receiverId, setReceiverId] = useState(customerId || '');
    const [referrerId, setReferrerId] = useState('');
    const [validityDays, setValidityDays] = useState(365);
    const [createdCode, setCreatedCode] = useState<GiftCode | null>(null);
    
    const customers = useLiveQuery(() => db.customers.orderBy('name').toArray());
    const templates = useLiveQuery(() => db.whatsappTemplates.toArray());
    const settings = useLiveQuery(() => db.settings.get('app'));


    const handleCreateCode = async () => {
        try {
            const newCodeData: Omit<GiftCode, 'created_at' | 'id'> = {
                reason,
                note: note || undefined,
                receiver_id: receiverId || undefined,
                referrer_id: referrerId || undefined,
                expires_at: Date.now() + validityDays * 24 * 60 * 60 * 1000,
            };
            const newCode = await addGiftCode({ id: generateGiftCodeString(), ...newCodeData });

            toast.success(`Cadeaucode ${newCode.id} aangemaakt!`);
            setCreatedCode(newCode);

            // Archive the message if a recipient is set
            if (newCode.receiver_id && templates && settings) {
                const template = templates.find(t => t.name === 'G. Cadeaucode (handmatig)');
                const receiver = customers?.find(c => c.id === newCode.receiver_id);
                if (template && receiver) {
                    // FIX: Removed extra `undefined` argument to match function signature.
                    const messageToLog = renderWhatsappTemplate(
                        template.message,
                        receiver,
                        settings,
                        undefined,
                        { gift_code: newCode.id }
                    );
                    await logWhatsappMessage(receiver.id, messageToLog, template.name);
                }
            }

        } catch(e) {
            toast.error("Kon code niet aanmaken.");
        }
    }

    const whatsAppMessage = useMemo(() => {
        if (!createdCode || !templates || !settings) return '';
        
        const template = templates.find(t => t.name === 'G. Cadeaucode (handmatig)');
        if (!template) return 'WhatsApp sjabloon voor cadeaucode niet gevonden.';
        
        const receiver = customers?.find(c => c.id === createdCode.receiver_id);
        const customerForTemplate = receiver ? { name: receiver.name } : { name: 'klant' };
        
        // FIX: Removed extra `undefined` argument to match function signature.
        return renderWhatsappTemplate(
            template.message,
            customerForTemplate,
            settings,
            undefined, // no subscription context
            { gift_code: createdCode.id }
        );

    }, [createdCode, customers, templates, settings]);

    if (createdCode) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
                     <h2 className="text-xl font-bold">Stap 2: Stuur Bericht</h2>
                     <p className="text-sm text-gray-600 dark:text-gray-300">Code succesvol aangemaakt. Kopieer het onderstaande bericht en stuur het naar de klant.</p>
                     <div className="relative">
                        <textarea
                            readOnly
                            value={whatsAppMessage}
                            rows={8}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
                        />
                         <button 
                            onClick={() => {
                                navigator.clipboard.writeText(whatsAppMessage);
                                toast.success("Bericht gekopieerd!");
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                            <CopyIcon className="h-5 w-5"/>
                        </button>
                    </div>
                     <div className="flex justify-end pt-4">
                        <button onClick={onClose} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Sluiten</button>
                     </div>
                </div>
            </div>
        );
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
                 <h2 className="text-xl font-bold">Nieuwe Cadeaucode</h2>
                 <SelectField label="Reden" value={reason} onChange={e => setReason(e.target.value as GiftCodeReason)}>
                     {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                 </SelectField>
                 <InputField label="Notitie (optioneel)" value={note} onChange={e => setNote(e.target.value)} />
                 <SelectField label="Ontvanger (optioneel)" value={receiverId} onChange={e => setReceiverId(e.target.value)}>
                     <option value="">-- Niemand --</option>
                     {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </SelectField>
                 <SelectField label="Gekoppelde Werver (optioneel)" value={referrerId} onChange={e => setReferrerId(e.target.value)}>
                     <option value="">-- Niemand --</option>
                     {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </SelectField>
                 <InputField label="Geldigheid (dagen)" type="number" value={String(validityDays)} onChange={e => setValidityDays(Number(e.target.value))} />

                 <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Annuleren</button>
                    <button onClick={handleCreateCode} className="bg-green-600 text-white px-4 py-2 rounded-lg">Aanmaken</button>
                 </div>
            </div>
        </div>
    );
};

interface GiftCodeManagerProps {
    customerId?: string;
}

export const GiftCodeManager: React.FC<GiftCodeManagerProps> = ({ customerId }) => {
    const giftCodes = useLiveQuery(() => db.giftCodes.orderBy('created_at').reverse().toArray(), []);
    const customers = useLiveQuery(() => db.customers.toArray(), []);
    const [isAdding, setIsAdding] = useState(false);

    const customersById = useMemo(() => {
        if (!customers) return {};
        return customers.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {} as Record<string, Customer>)
    }, [customers]);

    const getStatus = (code: GiftCode): { text: string; color: string } => {
        const now = Date.now();
        if (code.used_at) return { text: 'Gebruikt', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' };
        if (now > code.expires_at) return { text: 'Verlopen', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' };
        return { text: 'Open', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' };
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold">Cadeaucodes</h3>
                 <button onClick={() => setIsAdding(true)} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-brand-700">
                    <PlusIcon className="h-5 w-5" />
                    <span>Nieuwe Code</span>
                </button>
            </div>
           
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {giftCodes?.map(code => {
                    const status = getStatus(code);
                    return (
                        <div key={code.id} className="p-3 border rounded-lg dark:border-gray-700">
                            <div className="flex justify-between items-start">
                               <div>
                                    <div className="flex items-center space-x-2">
                                        <p className="font-mono font-bold">{code.id}</p>
                                        <button onClick={() => navigator.clipboard.writeText(code.id)} className="text-gray-400 hover:text-gray-600">
                                            <CopyIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">{code.reason} {code.note ? `- ${code.note}` : ''}</p>
                               </div>
                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.color}`}>
                                    {status.text}
                               </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                                {code.referrer_id && <p>Werf-bron: {customersById[code.referrer_id]?.name || 'Onbekend'}</p>}
                                {code.receiver_id && <p>Bestemd voor: {customersById[code.receiver_id]?.name || 'Onbekend'}</p>}
                                {code.used_at && <p>Gebruikt door: {customersById[code.used_by_customer_id!]?.name || 'Onbekend'} op {fmtDate(code.used_at)}</p>}
                                <p>Vervalt op: {fmtDate(code.expires_at)}</p>
                            </div>
                        </div>
                    );
                })}
                {(!giftCodes || giftCodes.length === 0) && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Geen cadeaucodes gevonden.</p>
                )}
            </div>
            {isAdding && <AddGiftCodeModal onClose={() => setIsAdding(false)} customerId={customerId} />}
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <select {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
            {children}
        </select>
    </div>
);