
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, Subscription, AppSettings } from '../types';
import type { View, NavigationParams } from '../App';
// FIX: Corrected icon imports.
import { ArrowLeftIcon, PencilIcon } from './ui/Icons';
// FIX: Corrected import path for StreamForm.
import { StreamForm } from './StreamForm';
import { toast } from './ui/Toaster';
// FIX: Corrected import path for data-mutations.
import { saveSubscription, updateCustomer } from '../lib/data-mutations';
import { TimelineTab } from './TimelineTab';
import { RewardsTab } from './RewardsTab';
import { WhatsappComposer } from './WhatsAppComposer';
import { WhatsappArchiveTab } from './WhatsappArchiveTab';
// FIX: Corrected import path for PaymentsTab.
import { PaymentsTab } from './PaymentsTab';
// FIX: Import StreamCard component to resolve 'Cannot find name' error.
import { StreamCard } from './StreamCard';

interface CustomerDetailProps {
    customer: Customer;
    onBack: () => void;
    onNavigate: (view: View, params?: NavigationParams) => void;
    params: NavigationParams;
}

type Tab = 'streams' | 'timeline' | 'rewards' | 'whatsapp' | 'archive' | 'payments' | 'notes';

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onBack, onNavigate, params }) => {
    const [editingStream, setEditingStream] = useState<Partial<Subscription> | null>(null);
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [customerForm, setCustomerForm] = useState(customer);
    const [activeTab, setActiveTab] = useState<Tab>((params.tab as Tab) || 'streams');

    const subscriptions = useLiveQuery(() => db.subscriptions.where('customer_id').equals(customer.id).toArray(), [customer.id]);
    const settings = useLiveQuery(() => db.settings.get('app'));

    const handleSaveStream = async (subData: Partial<Subscription>) => {
        try {
            await saveSubscription({ ...subData, customer_id: customer.id });
            toast.success(`Stream ${subData.id ? 'bijgewerkt' : 'aangemaakt'}!`);
            setEditingStream(null);
        } catch (error: any) {
            toast.error(error.message || "Kon stream niet opslaan.");
        }
    };
    
    const handleSaveCustomer = async () => {
        if (!customerForm.name?.trim()) {
            toast.error("Naam is verplicht.");
            return;
        }
        try {
            await updateCustomer(customer.id, { name: customerForm.name, phone: customerForm.phone });
            toast.success("Klantgegevens opgeslagen.");
            setIsEditingCustomer(false);
        } catch (e) {
            toast.error("Kon klant niet opslaan.");
        }
    };
    
    const TabButton: React.FC<{ tab: Tab, label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === tab ? 'bg-brand-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    if (!settings) return <div>Laden...</div>;

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Terug naar lijst</span>
            </button>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                {isEditingCustomer ? (
                    <div className="space-y-4">
                        <input value={customerForm.name} onChange={e => setCustomerForm(c => ({...c, name: e.target.value}))} className="w-full text-2xl font-bold p-2 border rounded bg-gray-50 dark:bg-gray-700" />
                        <input value={customerForm.phone || ''} onChange={e => setCustomerForm(c => ({...c, phone: e.target.value}))} placeholder="Telefoonnummer" className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700" />
                        <div className="flex justify-end space-x-2">
                             <button onClick={() => setIsEditingCustomer(false)} className="bg-gray-200 dark:bg-gray-600 px-3 py-1.5 rounded-lg">Annuleren</button>
                             <button onClick={handleSaveCustomer} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg">Opslaan</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{customer.name}</h1>
                            <p className="text-gray-500">{customer.phone}</p>
                        </div>
                        <button onClick={() => setIsEditingCustomer(true)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><PencilIcon className="h-5 w-5"/></button>
                    </div>
                )}
            </div>
            
            <div className="flex space-x-2 overflow-x-auto pb-2">
                <TabButton tab="streams" label="Streams" />
                <TabButton tab="payments" label="Betalingen" />
                <TabButton tab="whatsapp" label="WhatsApp Sturen" />
                <TabButton tab="archive" label="WhatsApp Archief" />
                <TabButton tab="rewards" label="Werving" />
                <TabButton tab="timeline" label="Tijdlijn & Notities" />
            </div>

            <div>
                {activeTab === 'streams' && (
                     editingStream ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4">{editingStream.id ? 'Stream Bewerken' : 'Nieuwe Stream'}</h2>
                            <StreamForm subscription={editingStream} onSave={handleSaveStream} onCancel={() => setEditingStream(null)} settings={settings} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {subscriptions?.map(sub => (
                                <StreamCard key={sub.id} subscription={sub} settings={settings} onEdit={() => setEditingStream(sub)} />
                            ))}
                            <button onClick={() => setEditingStream({})} className="w-full p-4 border-2 border-dashed rounded-lg text-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                + Nieuwe Stream Toevoegen
                            </button>
                        </div>
                    )
                )}
                {activeTab === 'timeline' && <TimelineTab customerId={customer.id} />}
                {activeTab === 'rewards' && <RewardsTab customerId={customer.id} onNavigate={onNavigate} />}
                {activeTab === 'whatsapp' && <WhatsappComposer customer={customer} subscriptions={subscriptions || []} />}
                {activeTab === 'archive' && <WhatsappArchiveTab customerId={customer.id} />}
                {activeTab === 'payments' && <PaymentsTab customerId={customer.id} subscriptions={subscriptions || []} settings={settings} />}
            </div>
        </div>
    );
};