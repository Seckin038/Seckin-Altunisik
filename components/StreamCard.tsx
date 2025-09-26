import React from 'react';
// FIX: Corrected import path.
import type { Subscription, AppSettings } from '../types';
import { getStatusInfo, formatNL, countriesToFlags } from '../lib/utils';
// FIX: Corrected icon imports.
import { CalendarIcon, CheckCircleIcon, CurrencyEuroIcon, GlobeAltIcon, HashtagIcon, PencilIcon, XCircleIcon, TrashIcon, RefreshIcon } from './ui/Icons';
import { calculateSubscriptionPrice } from '../lib/price';

interface StreamCardProps {
    subscription: Subscription;
    settings: AppSettings;
    onEdit: () => void;
    onDelete: () => void;
    onRenew: () => void;
}

export const StreamCard: React.FC<StreamCardProps> = ({ subscription, settings, onEdit, onDelete, onRenew }) => {
    
    const statusInfo = getStatusInfo(subscription.status);
    const finalPrice = calculateSubscriptionPrice(subscription, settings);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className={`p-4 flex justify-between items-center ${statusInfo.color}`}>
                <h3 className="text-lg font-bold text-white">{subscription.label}</h3>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-white/30 text-white">
                    {statusInfo.text}
                </span>
            </div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <InfoItem icon={<CalendarIcon className="h-5 w-5 text-gray-400" />} label="Startdatum" value={formatNL(subscription.start_at)} />
                    <InfoItem icon={<CalendarIcon className="h-5 w-5 text-gray-400" />} label="Einddatum" value={formatNL(subscription.end_at)} />
                    <InfoItem icon={<HashtagIcon className="h-5 w-5 text-gray-400" />} label="MAC Adres" value={subscription.mac || 'N/A'} />
                    <InfoItem icon={<HashtagIcon className="h-5 w-5 text-gray-400" />} label="Apparaatsleutel" value={subscription.app_code || 'N/A'} />
                     <InfoItem 
                        icon={subscription.paid ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />} 
                        label="Betaald" 
                        value={subscription.paid ? 'Ja' : 'Nee'} 
                    />
                     <InfoItem 
                        icon={subscription.erotiek ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-red-500" />} 
                        label="Erotiek" 
                        value={subscription.erotiek ? 'Ja' : 'Nee'} 
                    />
                    <InfoItem icon={<CurrencyEuroIcon className="h-5 w-5 text-gray-400" />} label="Prijs" value={`€${finalPrice} (${subscription.payment_method})`} />
                    <InfoItem icon={<GlobeAltIcon className="h-5 w-5 text-gray-400" />} label="Landen" value={countriesToFlags(subscription.countries)} />
                </div>
                 <div className="pt-4 mt-4 border-t dark:border-gray-700 flex justify-end items-center space-x-2">
                     <button 
                        onClick={onRenew} 
                        className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-2 rounded-lg flex items-center space-x-1"
                    >
                        <RefreshIcon className="h-4 w-4"/>
                        <span>Verleng</span>
                    </button>
                    <button 
                        onClick={onDelete} 
                        className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 rounded-lg flex items-center space-x-1"
                    >
                        <TrashIcon className="h-4 w-4"/>
                        <span>Verwijder</span>
                    </button>
                    <button 
                        onClick={onEdit} 
                        className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-500 p-2 rounded-lg flex items-center space-x-1"
                    >
                        <PencilIcon className="h-4 w-4"/>
                        <span>Bewerk</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 pt-0.5">{icon}</div>
        <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
            <p className="text-gray-600 dark:text-gray-400">{value}</p>
        </div>
    </div>
);