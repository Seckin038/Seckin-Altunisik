import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, TimelineEvent, TimelineEventType } from '../types';
import type { View, NavigationParams } from '../App';
import { formatNL } from '../lib/utils';
import { toast } from '../components/ui/Toaster';
import { revertTimelineEvent } from '../lib/data-mutations';
import { UserPlusIcon, FireIcon, GiftIcon, RefreshIcon, PencilIcon, TrashIcon, PlusCircleIcon, UserMinusIcon, CurrencyEuroIcon, ChatBubbleLeftRightIcon } from '../components/ui/Icons';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const REVERTABLE_TYPES: TimelineEventType[] = [
    'CUSTOMER_DELETED',
    'SUBSCRIPTION_CREATED',
    'SUBSCRIPTION_MODIFIED', 
    'SUBSCRIPTION_RENEWED', 
    'SUBSCRIPTION_DELETED',
    'REWARD_YEAR_APPLIED',
    'REWARD_GIFT_CODE_GENERATED',
    'NOTE_ADDED',
    'GIFT_CODE_CREATED',
    'GIFT_CODE_DELETED',
    'WHATSAPP_SENT'
];

const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
        case 'CUSTOMER_CREATED':
            return <UserPlusIcon className="h-5 w-5 text-white" />;
        case 'CUSTOMER_DELETED':
            return <UserMinusIcon className="h-5 w-5 text-white" />;
        case 'SUBSCRIPTION_CREATED':
            return <PlusCircleIcon className="h-5 w-5 text-white" />;
        case 'SUBSCRIPTION_MODIFIED':
        case 'SUBSCRIPTION_RENEWED':
        case 'SUBSCRIPTION_STATUS_CHANGED':
            return <FireIcon className="h-5 w-5 text-white" />;
        case 'SUBSCRIPTION_DELETED':
             return <TrashIcon className="h-5 w-5 text-white" />;
        case 'REWARD_YEAR_APPLIED':
        case 'REWARD_GIFT_CODE_GENERATED':
        case 'GIFT_CODE_CREATED':
        case 'GIFT_CODE_DELETED':
            return <GiftIcon className="h-5 w-5 text-white" />;
        case 'NOTE_ADDED':
            return <PencilIcon className="h-5 w-5 text-white" />;
        case 'ACTION_REVERTED':
            return <RefreshIcon className="h-5 w-5 text-white" />;
        case 'PAYMENT_ADDED':
            return <CurrencyEuroIcon className="h-5 w-5 text-white" />;
        case 'WHATSAPP_SENT':
            return <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />;
        default:
            return <PencilIcon className="h-5 w-5 text-white" />;
    }
}

const getIconBgColor = (type: TimelineEventType) => {
     switch (type) {
        case 'CUSTOMER_CREATED':
        case 'SUBSCRIPTION_CREATED':
             return 'bg-green-500';
        case 'CUSTOMER_DELETED':
        case 'SUBSCRIPTION_DELETED':
        case 'GIFT_CODE_DELETED':
            return 'bg-red-500';
        case 'SUBSCRIPTION_MODIFIED':
        case 'SUBSCRIPTION_RENEWED':
        case 'NOTE_ADDED':
            return 'bg-blue-500';
        case 'REWARD_YEAR_APPLIED':
        case 'REWARD_GIFT_CODE_GENERATED':
        case 'GIFT_CODE_CREATED':
            return 'bg-purple-500';
        case 'ACTION_REVERTED':
            return 'bg-yellow-500';
        case 'PAYMENT_ADDED':
            return 'bg-teal-500';
        case 'WHATSAPP_SENT':
            return 'bg-cyan-500';
        default:
            return 'bg-gray-500';
    }
}

export const HistoryScreen: React.FC<{ onNavigate: (view: View, params?: NavigationParams) => void; }> = ({ onNavigate }) => {
    const [eventToRevert, setEventToRevert] = useState<TimelineEvent | null>(null);

    const history = useLiveQuery(() => db.timeline.orderBy('timestamp').reverse().toArray(), []);
    const customers = useLiveQuery(() => db.customers.toArray());

    const customersById = useMemo(() => {
        if (!customers) return {};
        return customers.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {} as Record<string, Customer>);
    }, [customers]);

    const revertedEventIds = useMemo(() => {
        if (!history) return new Set();
        return new Set(
            history
                .filter(e => e.type === 'ACTION_REVERTED' && e.meta?.reverted_event_id)
                .map(e => e.meta.reverted_event_id)
        );
    }, [history]);

    const handleRevertClick = (event: TimelineEvent) => {
        setEventToRevert(event);
    };
    
    const handleConfirmRevert = async () => {
        if (!eventToRevert) return;
        
        try {
            await revertTimelineEvent(eventToRevert.id);
            toast.success("Actie succesvol hersteld!");
        } catch (error: any) {
            toast.error(`Kon actie niet herstellen: ${error.message}`);
        } finally {
            setEventToRevert(null);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Geschiedenis</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <ul className="divide-y dark:divide-gray-700">
                    {history?.map(event => {
                        const customer = customersById[event.customer_id];
                        const isRevertable = REVERTABLE_TYPES.includes(event.type) && !!event.meta?.before;
                        const isReverted = revertedEventIds.has(event.id);
                        
                        let customerName = 'Verwijderde Klant';
                        if (customer) {
                            customerName = customer.name;
                        } else if (event.type === 'CUSTOMER_DELETED' && event.meta?.before?.customer?.name) {
                            customerName = event.meta.before.customer.name;
                        }

                        return (
                            <li key={event.id} className="p-4 flex items-start space-x-4">
                                <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${getIconBgColor(event.type)}`}>
                                    {getEventIcon(event.type)}
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm">{event.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Klant: 
                                        {customer ? (
                                            <button onClick={() => onNavigate('CUSTOMERS', { customerId: customer.id })} className="text-brand-600 hover:underline ml-1">
                                                {customerName}
                                            </button>
                                        ) : (
                                            <span className="ml-1 italic">{customerName}</span>
                                        )}
                                        <span className="mx-2">|</span>
                                        {formatNL(event.timestamp)}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    {isRevertable && (
                                        <button 
                                            onClick={() => handleRevertClick(event)}
                                            disabled={isReverted}
                                            className="text-xs px-2 py-1 rounded bg-yellow-400 text-yellow-900 hover:bg-yellow-500 disabled:bg-gray-400 disabled:text-gray-700 disabled:cursor-not-allowed dark:disabled:bg-gray-600 dark:disabled:text-gray-300"
                                        >
                                            {isReverted ? 'Hersteld' : 'Herstel'}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                {(!history || history.length === 0) && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Geen activiteiten gevonden.
                    </div>
                )}
            </div>
            
            <ConfirmationModal
                isOpen={!!eventToRevert}
                onClose={() => setEventToRevert(null)}
                onConfirm={handleConfirmRevert}
                title="Actie Herstellen"
                message={`Weet je zeker dat je de volgende actie wilt herstellen? Dit kan niet ongedaan worden gemaakt: "${eventToRevert?.message}"`}
            />
        </div>
    );
};