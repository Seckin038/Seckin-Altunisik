import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Payment, Subscription, AppSettings, PaymentMethod } from '../types';
import { generateId, fmtDate } from '../lib/utils';
import { toast } from './ui/Toaster';
import { calculateSubscriptionPrice } from '../lib/price';

interface PaymentsTabProps {
    customerId: string;
    subscriptions: Subscription[];
    settings: AppSettings;
}

const PAYMENT_METHODS: (PaymentMethod | 'Tikkie' | 'Contant')[] = ['Tikkie', 'Contant', 'Vrienden prijs', 'Gratis'];

const AddPaymentForm: React.FC<{
    customerId: string;
    subscriptions: Subscription[];
    settings: AppSettings;
    onPaymentAdded: () => void;
}> = ({ customerId, subscriptions, settings, onPaymentAdded }) => {
    const [subscriptionId, setSubscriptionId] = useState(subscriptions[0]?.id || '');
    const [amount, setAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'Tikkie' | 'Contant'>('Tikkie');
    const [notes, setNotes] = useState('');

    const handleAutoFillPrice = () => {
        const sub = subscriptions.find(s => s.id === subscriptionId);
        if (sub) {
            const price = calculateSubscriptionPrice(sub, settings);
            setAmount(String(price));
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subscriptionId || !amount || !paymentDate || !paymentMethod) {
            toast.error("Alle velden behalve notities zijn verplicht.");
            return;
        }

        const newPayment: Payment = {
            id: generateId(),
            customer_id: customerId,
            subscription_id: subscriptionId,
            amount: parseFloat(amount),
            payment_date: new Date(paymentDate).getTime(),
            payment_method: paymentMethod,
            notes: notes || undefined
        };

        try {
            await db.payments.add(newPayment);
            toast.success("Betaling succesvol toegevoegd!");
            onPaymentAdded();
            // Reset form could be added here
        } catch (error) {
            toast.error("Kon betaling niet toevoegen.");
            console.error(error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg dark:border-gray-700 space-y-4">
            <h4 className="font-semibold">Nieuwe Betaling Toevoegen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField label="Kies Stream" value={subscriptionId} onChange={e => setSubscriptionId(e.target.value)}>
                    {subscriptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </SelectField>
                <div className="flex items-end space-x-2">
                    <InputField label="Bedrag (€)" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                    <button type="button" onClick={handleAutoFillPrice} className="bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded-lg text-sm h-10">Auto</button>
                </div>
                <InputField label="Betaaldatum" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                <SelectField label="Betaalmethode" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </SelectField>
            </div>
            <InputField label="Notities (optioneel)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex justify-end">
                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg">Toevoegen</button>
            </div>
        </form>
    );
};


export const PaymentsTab: React.FC<PaymentsTabProps> = ({ customerId, subscriptions, settings }) => {
    const payments = useLiveQuery(() => db.payments.where('customer_id').equals(customerId).reverse().sortBy('payment_date'), [customerId]);
    const [isAdding, setIsAdding] = useState(false);

    const subsById = React.useMemo(() => subscriptions.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
    }, {} as Record<string, Subscription>), [subscriptions]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Betalingsgeschiedenis</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm">
                    {isAdding ? 'Annuleren' : '+ Nieuwe Betaling'}
                </button>
            </div>

            {isAdding && <AddPaymentForm customerId={customerId} subscriptions={subscriptions} settings={settings} onPaymentAdded={() => setIsAdding(false)} />}
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {payments && payments.length > 0 ? (
                    payments.map(p => (
                        <div key={p.id} className="p-3 border rounded-lg dark:border-gray-700">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">€{p.amount.toFixed(2)}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{p.payment_method} voor {subsById[p.subscription_id]?.label || 'Onbekende Stream'}</p>
                                </div>
                                <p className="text-sm font-medium">{fmtDate(p.payment_date)}</p>
                             </div>
                             {p.notes && <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">Notitie: {p.notes}</p>}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Geen betalingen gevonden voor deze klant.
                    </div>
                )}
            </div>
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex-1">
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
