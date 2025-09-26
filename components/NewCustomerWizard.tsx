import React, { useState, useEffect, useMemo } from 'react';
// FIX: Corrected import paths.
import type { Customer, Subscription, AppSettings, PaymentMethod, WhatsappTemplate, CountryTemplate, GiftCode } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
// FIX: Corrected import path.
import { addCustomer, saveSubscription } from '../lib/data-mutations';
import { computeEndDate, formatNL, parseM3uUrl } from '../lib/utils';
import { CountrySelector } from './CountrySelector';
import { toast } from './ui/Toaster';
// FIX: Corrected import path.
import { renderWhatsappTemplate, pickTemplateNameForStream } from '../lib/whatsappRenderer';
// FIX: Corrected icon imports.
import { CopyIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from './ui/Icons';
import { logWhatsappMessage } from '../lib/timeline';

interface NewCustomerWizardProps {
    onFinish: (customerId: string) => void;
    onCancel: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ['Tikkie', 'Contant', 'Gratis', 'Vrienden prijs'];
const INITIAL_STREAM: Partial<Subscription> = {
    status: 'TEST',
    paid: false,
    erotiek: false,
    free: false,
    payment_method: 'Tikkie',
    countries: [],
    mac: '',
    app_code: '',
    m3u_url: '',
};

const GiftCodeInput: React.FC<{
    onCodeValidated: (code: GiftCode) => void;
}> = ({ onCodeValidated }) => {
    const [giftCodeInput, setGiftCodeInput] = useState('');
    const [error, setError] = useState('');

    const handleValidate = async () => {
        setError('');
        if (!giftCodeInput.trim()) {
            setError("Voer een code in.");
            return;
        }
        try {
            const code = await db.giftCodes.get(giftCodeInput.trim());
            if (!code) {
                setError("Cadeaucode niet gevonden.");
                return;
            }
            if (code.used_at) {
                setError("Cadeaucode is al gebruikt.");
                return;
            }
            if (Date.now() > code.expires_at) {
                setError("Cadeaucode is verlopen.");
                return;
            }
            toast.success("Cadeaucode succesvol gevalideerd!");
            onCodeValidated(code);
        } catch (e) {
            setError("Fout bij valideren.");
        }
    };

    return (
        <div className="space-y-2">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cadeaucode (optioneel)</label>
             <div className="flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="FLM-XXXX-..."
                    value={giftCodeInput}
                    onChange={e => setGiftCodeInput(e.target.value.toUpperCase())}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
                <button type="button" onClick={handleValidate} className="bg-gray-200 dark:bg-gray-600 px-3 py-2 rounded-lg text-sm">Valideer</button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}


const WhatsappPreview: React.FC<{ customer: Partial<Customer>, stream: Partial<Subscription>, settings: AppSettings, templates: WhatsappTemplate[], isGifted: boolean }> = ({ customer, stream, settings, templates, isGifted }) => {
    const message = useMemo(() => {
        const status: 'TEST' | 'ACTIVE' = isGifted ? 'ACTIVE' : 'TEST';
        
        const tempSubForRender: Subscription = {
            ...stream,
            id: 'preview',
            customer_id: 'preview',
            label: 'Tv Flamingo Stream 1',
            status: status,
            start_at: Date.now(),
            end_at: computeEndDate(Date.now(), status, settings),
            free: isGifted,
            paid: isGifted,
        } as Subscription;

        let templateName = '';
        if (isGifted) {
            templateName = stream.erotiek ? 'A8. Welkom Cadeaucode (met erotiek)' : 'A7. Welkom Cadeaucode (geen erotiek)';
        } else {
            templateName = pickTemplateNameForStream(tempSubForRender);
        }
        
        const template = templates.find(t => t.name === templateName);
        
        if (template) {
            return renderWhatsappTemplate(
                template.message,
                customer as Customer,
                settings,
                tempSubForRender
            );
        }
        return `Kon geen passend WhatsApp sjabloon vinden voor: ${templateName}`;
    }, [customer, stream, settings, templates, isGifted]);

    return (
        <div className="relative">
            <textarea
                readOnly
                value={message}
                rows={12}
                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
            />
             <button 
                type="button"
                onClick={() => {
                    navigator.clipboard.writeText(message);
                    toast.success("Bericht gekopieerd!");
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
            >
                <CopyIcon className="h-5 w-5"/>
            </button>
        </div>
    );
};


export const NewCustomerWizard: React.FC<NewCustomerWizardProps> = ({ onFinish, onCancel }) => {
    const [step, setStep] = useState(1);
    const [customerData, setCustomerData] = useState<Partial<Customer>>({});
    const [streams, setStreams] = useState<Partial<Subscription>[]>([{ ...INITIAL_STREAM }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [validatedGiftCodes, setValidatedGiftCodes] = useState<Record<number, GiftCode>>({});
    const [parsedM3uParts, setParsedM3uParts] = useState<Array<ReturnType<typeof parseM3uUrl>>>([null]);

    const settings = useLiveQuery(() => db.settings.get('app'));
    const customers = useLiveQuery(() => db.customers.toArray());
    const allSubscriptions = useLiveQuery(() => db.subscriptions.toArray());
    const templates = useLiveQuery(() => db.whatsappTemplates.toArray());
    const countryTemplates = useLiveQuery(() => db.countryTemplates.toArray());

    useEffect(() => {
        const newParsedParts = streams.map(stream => parseM3uUrl(stream.m3u_url));
        setParsedM3uParts(newParsedParts);
    }, [streams]);


    const updateStream = (index: number, updatedStream: Partial<Subscription>) => {
        const newStreams = [...streams];
        newStreams[index] = updatedStream;
        setStreams(newStreams);
    };

    const addStream = () => {
        setStreams(s => [...s, { ...INITIAL_STREAM }]);
        setParsedM3uParts(p => [...p, null]);
    };

    const removeStream = (index: number) => {
        setStreams(s => s.filter((_, i) => i !== index));
        setParsedM3uParts(p => p.filter((_, i) => i !== index));

        // FIX: Replaced problematic Object.entries loop with a type-safe for...of loop over Object.keys
        // to correctly re-key the validatedGiftCodes record when a stream is removed. This resolves
        // multiple TypeScript errors related to type inference.
        const newCodes: Record<number, GiftCode> = {};
        for (const key of Object.keys(validatedGiftCodes)) {
            const numKey = parseInt(key, 10);
            const value = validatedGiftCodes[numKey];
            if (numKey < index) {
                newCodes[numKey] = value;
            } else if (numKey > index) {
                newCodes[numKey - 1] = value;
            }
        }
        setValidatedGiftCodes(newCodes);
    };

    const handleCodeValidated = (index: number, code: GiftCode) => {
        const stream = streams[index];
        updateStream(index, { ...stream, payment_method: 'Gratis', paid: true, free: true });
        setValidatedGiftCodes(c => ({...c, [index]: code }));
    }

    const validateStep1 = () => {
        if (!customerData.name?.trim()) {
            setErrors({ name: "Klantnaam is verplicht." });
            return false;
        }
        setErrors({});
        return true;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};
        streams.forEach((s, i) => {
            if (!s.m3u_url?.trim()) {
                 newErrors[`stream_${i}_m3u`] = "M3U Link is verplicht.";
            }
            if ((s.mac && !s.app_code) || (!s.mac && s.app_code)) {
                newErrors[`stream_${i}`] = "MAC Adres en Apparaatsleutel zijn beide verplicht als er één is ingevuld.";
            }
            if (s.mac && allSubscriptions?.some(sub => sub.mac === s.mac)) {
                 newErrors[`stream_${i}_mac`] = "Dit MAC adres is al in gebruik.";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTemplateChange = (index: number, templateId: string) => {
        const stream = streams[index];
        const template = countryTemplates?.find(t => t.id === templateId);
        if (template) {
            updateStream(index, { ...stream, countries: template.countryCodes });
        }
    };
    
    const handleSave = async () => {
        if (!settings || !templates) {
            toast.error("Instellingen of sjablonen konden niet geladen worden.");
            return;
        }

        try {
            const newCustomer = await addCustomer(customerData as any);
            const savedSubscriptions: Subscription[] = [];
            
            for (let i = 0; i < streams.length; i++) {
                const stream = streams[i];
                const startDate = Date.now();
                const giftCodeId = validatedGiftCodes[i]?.id;
                
                const status: 'TEST' | 'ACTIVE' = giftCodeId ? 'ACTIVE' : 'TEST';
                const endDate = computeEndDate(startDate, status, settings as AppSettings);
                
                const savedSub = await saveSubscription({
                    ...stream,
                    customer_id: newCustomer.id,
                    label: `Tv Flamingo Stream ${i + 1}`,
                    start_at: startDate,
                    end_at: endDate,
                    status: status
                }, giftCodeId);
                savedSubscriptions.push(savedSub);
            }

            // Archive the WhatsApp message for the first stream
            const firstStream = savedSubscriptions[0];
            const isGifted = !!validatedGiftCodes[0];
            let templateName = '';
            if (isGifted) {
                templateName = streams[0].erotiek ? 'A8. Welkom Cadeaucode (met erotiek)' : 'A7. Welkom Cadeaucode (geen erotiek)';
            } else {
                templateName = pickTemplateNameForStream(firstStream);
            }
            const template = templates.find(t => t.name === templateName);

            if (template) {
                const messageToLog = renderWhatsappTemplate(template.message, newCustomer, settings, firstStream);
                await logWhatsappMessage(newCustomer.id, messageToLog, template.name);
            }
            
            toast.success(`Klant ${newCustomer.name} aangemaakt!`);
            onFinish(newCustomer.id);

        } catch (error: any) {
            toast.error(error.message || "Kon klant niet aanmaken.");
            console.error(error);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold">Stap 1: Klantgegevens</h2>
            <InputField label="Naam Klant" name="name" value={customerData.name || ''} onChange={(e) => setCustomerData(c => ({...c, name: e.target.value}))} required error={errors.name}/>
            <InputField label="Telefoonnummer" name="phone" value={customerData.phone || ''} onChange={(e) => setCustomerData(c => ({...c, phone: e.target.value}))} />
            <SelectField label="Geworven door" name="referrer_id" value={customerData.referrer_id || ''} onChange={(e) => setCustomerData(c => ({...c, referrer_id: e.target.value}))}>
                <option value="">-- Niemand --</option>
                {customers?.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">Stap 2: Stream & M3U</h2>
            {streams.map((stream, index) => {
                const appliedCode = validatedGiftCodes[index];
                const streamM3uParsed = parsedM3uParts[index];
                return (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-4 relative">
                        {streams.length > 1 && (
                            <button type="button" onClick={() => removeStream(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                               <TrashIcon className="h-5 w-5"/>
                            </button>
                        )}
                        <h3 className="font-medium">Stream {index + 1}</h3>
                        <div className="p-2 border rounded-md bg-white dark:bg-gray-800 text-sm">
                            <p><strong>Status:</strong> ❗ TEST {settings?.test_hours || 6} uur</p>
                            <p><strong>Startdatum (read-only):</strong> {formatNL(Date.now())}</p>
                            <p><strong>Einddatum (read-only):</strong> {formatNL(computeEndDate(Date.now(), 'TEST', settings || {} as any))}</p>
                        </div>
                        <InputField 
                            label="M3U Link" 
                            name="m3u_url" 
                            value={stream.m3u_url || ''} 
                            onChange={(e) => updateStream(index, { ...stream, m3u_url: e.target.value })} 
                            placeholder="http://host:port/get.php?..." 
                            required 
                            error={errors[`stream_${index}_m3u`]} 
                        />
                        {streamM3uParsed && (
                            <div className="space-y-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Xtream Codes (automatisch ingevuld)</h4>
                                <InputField label="Host" name="host" value={streamM3uParsed.host || 'N/A'} readOnly />
                                <InputField label="Username" name="username" value={streamM3uParsed.username || 'N/A'} readOnly />
                                <InputField label="Password" name="password" value={streamM3uParsed.password || 'N/A'} readOnly />
                            </div>
                        )}
                        <InputField label="MAC Adres (optioneel)" name="mac" value={stream.mac || ''} onChange={(e) => updateStream(index, { ...stream, mac: e.target.value })} error={errors[`stream_${index}_mac`]} />
                        <InputField label="Apparaatsleutel (optioneel)" name="app_code" value={stream.app_code || ''} onChange={(e) => updateStream(index, { ...stream, app_code: e.target.value })} />
                        {errors[`stream_${index}`] && <p className="text-sm text-red-500">{errors[`stream_${index}`]}</p>}
                        
                        {appliedCode ? (
                            <div className="p-2 border rounded-md bg-green-50 dark:bg-green-900/50 text-sm">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircleIcon className="h-5 w-5 text-green-600"/>
                                        <p>Cadeaucode <strong>{appliedCode.id}</strong> toegepast.</p>
                                    </div>
                                    <button type="button" onClick={() => {
                                        const { [index]: _, ...rest } = validatedGiftCodes;
                                        setValidatedGiftCodes(rest);
                                        updateStream(index, { ...stream, payment_method: 'Tikkie', paid: false, free: false });
                                    }} className="text-red-500 hover:text-red-700">
                                        <XCircleIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                            </div>
                        ) : <GiftCodeInput onCodeValidated={(code) => handleCodeValidated(index, code)} /> }
                        
                        <SelectField label="Betaalmethode" name="payment_method" value={stream.payment_method || 'Tikkie'} onChange={(e) => updateStream(index, { ...stream, payment_method: e.target.value as PaymentMethod })} disabled={!!appliedCode}>
                            {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                        </SelectField>
                        <div className="space-y-2">
                            <SelectField label="Landen Sjabloon" name="country_template" onChange={(e) => handleTemplateChange(index, e.target.value)}>
                                <option value="">-- Handmatige selectie --</option>
                                {countryTemplates?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </SelectField>
                            <CountrySelector selectedCountries={stream.countries || []} onChange={codes => updateStream(index, { ...stream, countries: codes })} />
                        </div>
                        <CheckboxField label="Erotiek" name="erotiek" checked={stream.erotiek || false} onChange={(e) => updateStream(index, { ...stream, erotiek: e.target.checked })} />
                    </div>
                );
            })}
            <button type="button" onClick={addStream} className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center space-x-1">
                <PlusIcon className="h-4 w-4"/>
                <span>Stream toevoegen</span>
            </button>
        </div>
    );
    
    const renderStep3 = () => (
         <div className="space-y-4">
             <h2 className="text-xl font-semibold">Stap 3: Preview & Opslaan</h2>
             <div>
                <h3 className="font-semibold mb-2">Overzicht</h3>
                <p><strong>Klant:</strong> {customerData.name}</p>
                <p><strong>Aantal streams:</strong> {streams.length}</p>
             </div>
             <div>
                <h3 className="font-semibold mb-2">WhatsApp Bericht Preview</h3>
                {settings && templates && <WhatsappPreview customer={customerData} stream={streams[0]} settings={settings} templates={templates} isGifted={!!validatedGiftCodes[0]}/>}
             </div>
        </div>
    );


    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Nieuwe Klant Onboarding</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                
                <div className="flex justify-between items-center pt-6 border-t dark:border-gray-600 mt-6">
                    <div>
                        {step > 1 && <button type="button" onClick={() => setStep(s => s - 1)} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Terug</button>}
                    </div>
                    <div className="flex space-x-2">
                        <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Annuleren</button>
                        {step < 3 && <button type="button" onClick={() => (step === 1 ? validateStep1() && setStep(2) : validateStep2() && setStep(3))} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Volgende</button>}
                        {step === 3 && <button type="button" onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg">Alles Opslaan</button>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }> = ({ label, error, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} className={`mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 ${error ? 'border-red-500' : 'dark:border-gray-600'} read-only:bg-gray-200 dark:read-only:bg-gray-800`} />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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