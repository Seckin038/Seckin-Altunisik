
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, Subscription, AppSettings } from '../types';
import type { View, NavigationParams } from '../App';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from './ui/Icons';
import { StreamForm } from './StreamForm';
import { toast } from './ui/Toaster';
import { saveSubscription, updateCustomer, deleteSubscription, deleteCustomer } from '../lib/data-mutations';
import { TimelineTab } from './TimelineTab';
import { RewardsTab } from './RewardsTab';
import { WhatsappComposer } from './WhatsAppComposer';
import { WhatsappArchiveTab } from './WhatsappArchiveTab';
import { PaymentsTab } from './PaymentsTab';
import { StreamCard } from './StreamCard';
import { ConfirmationModal } from './ui/ConfirmationModal';


interface DeleteCustomerModalProps {
    customerName: string;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}
const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({ customerName, isOpen, onClose, onConfirm }) => {
    const [confirmationText, setConfirmationText] = useState('');

    if (!isOpen) return null;

    const isMatch = confirmationText === customerName;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold text-red-700 dark:text-red-300">Klant Verwijderen</h2>
                <p className="text-gray-600 dark:text-gray-300 my-4">
                    Dit is een zeer gevaarlijke actie. U staat op het punt om <strong>{customerName}</strong> permanent te verwijderen. Dit wist de klant, al hun streams, betalingen, wervingen, en geschiedenis.
                </p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Om te bevestigen, typ de naam van de klant hieronder:
                </p>
                <input 
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 mb-6"
                />
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-lg">Annuleren</button>
                    <button 
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg disabled:bg-red-300 disabled:cursor-not-allowed"
                    >
                        Ik begrijp de gevolgen, verwijder deze klant
                    </button>
                </div>
            </div>
        </div>
    );
};


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
    const [streamToDelete, setStreamToDelete] = useState<Subscription | null>(null);
    const [isDeleteCustomerModalOpen, setIsDeleteCustomerModalOpen] = useState(false);

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
    
    const handleDeleteStream = async () => {
        if (!streamToDelete) return;
        try {
            await deleteSubscription(streamToDelete.id);
            toast.success(`Stream '${streamToDelete.label}' verwijderd.`);
        } catch (error) {
            toast.error("Kon stream niet verwijderen.");
        } finally {
            setStreamToDelete(null);
        }
    };

    const handleDeleteCustomer = async () => {
        try {
            await deleteCustomer(customer.id);
            toast.success(`Klant ${customer.name} en alle data zijn verwijderd.`);
            setIsDeleteCustomerModalOpen(false);
            onBack();
        } catch (error) {
            toast.error("Kon klant niet verwijderen.");
        }
    }
    
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
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{customer.name}</h1>
                            <p className="text-gray-500">{customer.phone}</p>
                        </div>
                        <div className="flex space-x-2">
                             <button onClick={() => setIsEditingCustomer(true)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><PencilIcon className="h-5 w-5"/></button>
                             <button onClick={() => setIsDeleteCustomerModalOpen(true)} className="p-2 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><TrashIcon className="h-5 w-5"/></button>
                        </div>
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
                                <StreamCard key={sub.id} subscription={sub} settings={settings} onEdit={() => setEditingStream(sub)} onDelete={() => setStreamToDelete(sub)} />
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

            <ConfirmationModal
                isOpen={!!streamToDelete}
                onClose={() => setStreamToDelete(null)}
                onConfirm={handleDeleteStream}
                title="Stream Verwijderen"
                message={`Weet je zeker dat je de stream '${streamToDelete?.label}' wilt verwijderen? Deze actie kan hersteld worden vanuit de geschiedenis.`}
            />

            <DeleteCustomerModal 
                isOpen={isDeleteCustomerModalOpen}
                onClose={() => setIsDeleteCustomerModalOpen(false)}
                onConfirm={handleDeleteCustomer}
                customerName={customer.name}
            />
        </div>
    );
};