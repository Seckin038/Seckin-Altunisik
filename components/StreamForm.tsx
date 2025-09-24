import React, { useState, useEffect } from 'react';
import type { Subscription, AppSettings, PaymentMethod, SubscriptionStatus } from '../types';
import { CountrySelector } from './CountrySelector';
import { parseM3uUrl } from '../lib/utils';
import { calculateSubscriptionPrice } from '../lib/price';

interface StreamFormProps {
    subscription: Partial<Subscription>;
    settings: AppSettings;
    onSave: (subData: Partial<Subscription>) => void;
    onCancel: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Tikkie', 'Contant', 'Gratis', 'Vrienden prijs'];
const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TEST', 'EXPIRED', 'BLOCKED'];

export const StreamForm: React.FC<StreamFormProps> = ({ subscription, settings, onSave, onCancel }) => {
    const [formState, setFormState] = useState<Partial<Subscription>>({});
    const [m3uData, setM3uData] = useState<{ username: string | null; password: string | null; host: string | null } | null>(null);

    useEffect(() => {
        setFormState(subscription);
    }, [subscription]);

    useEffect(() => {
        setM3uData(parseM3uUrl(formState.m3u_url));
    }, [formState.m3u_url]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormState(s => ({ ...s, [name]: checked }));
        } else {
            setFormState(s => ({ ...s, [name]: value }));
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const timestamp = value ? new Date(value).getTime() : 0;
        setFormState(s => ({ ...s, [name]: timestamp }));
    };
    
    const formatTimestampForInput = (ts: number | undefined) => {
        if (!ts) return '';
        const d = new Date(ts);
        // Format to YYYY-MM-DDTHH:mm, correcting for timezone offset
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    const handleCountryChange = (codes: string[]) => {
        setFormState(s => ({ ...s, countries: codes }));
    };
    
    const finalPrice = calculateSubscriptionPrice(formState, settings);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formState);
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Stream Label" name="label" value={formState.label || ''} onChange={handleChange} required />
                <SelectField label="Status" name="status" value={formState.status || ''} onChange={handleChange} required>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </SelectField>
                <InputField label="Startdatum" type="datetime-local" value={formatTimestampForInput(formState.start_at)} onChange={handleDateChange} name="start_at" />
                <InputField label="Einddatum" type="datetime-local" name="end_at" value={formatTimestampForInput(formState.end_at)} onChange={handleDateChange} />
                <InputField label="MAC Adres" name="mac" value={formState.mac || ''} onChange={handleChange} />
                <InputField label="Apparaatsleutel" name="app_code" value={formState.app_code || ''} onChange={handleChange} />
                <div className="md:col-span-2">
                    <InputField label="M3U Link" name="m3u_url" value={formState.m3u_url || ''} onChange={handleChange} />
                     {m3uData && (
                        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-xs space-y-1 font-mono">
                            <p><span className="font-semibold text-gray-500">Username:</span> {m3uData.username || 'N/A'}</p>
                            <p><span className="font-semibold text-gray-500">Password:</span> {m3uData.password || 'N/A'}</p>
                            <p><span className="font-semibold text-gray-500">Host/URL:</span> {m3uData.host || 'N/A'}</p>
                        </div>
                    )}
                </div>
                 <SelectField label="Betaalmethode" name="payment_method" value={formState.payment_method || ''} onChange={handleChange}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </SelectField>
                 <InputField label="Berekende Prijs" type="text" value={`€${finalPrice}`} readOnly />

                <div className="flex items-center space-x-4">
                    <CheckboxField label="Betaald" name="paid" checked={!!formState.paid} onChange={handleChange} />
                    <CheckboxField label="Gratis (code)" name="free" checked={!!formState.free} onChange={handleChange} />
                    <CheckboxField label="Erotiek" name="erotiek" checked={!!formState.erotiek} onChange={handleChange} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Landen</label>
                    <CountrySelector selectedCountries={formState.countries || []} onChange={handleCountryChange} />
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Annuleren</button>
                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg">Opslaan</button>
            </div>
        </form>
    );
};


const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 read-only:bg-gray-200 dark:read-only:bg-gray-800" />
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

const CheckboxField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex items-center">
        <input type="checkbox" {...props} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
        <label className="ml-2 block text-sm text-gray-900 dark:text-gray-300">{label}</label>
    </div>
);