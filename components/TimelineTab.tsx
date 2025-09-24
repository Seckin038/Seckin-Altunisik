import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { fmtDate } from '../lib/utils';
// FIX: Corrected import path.
import { updateCustomer } from '../lib/data-mutations';
import { toast } from './ui/Toaster';

interface TimelineTabProps {
    // FIX: Changed prop from `customer` object to `customerId` string.
    customerId: string;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ customerId }) => {
    // FIX: Fetch customer data inside the component using customerId.
    const customer = useLiveQuery(() => db.customers.get(customerId), [customerId]);
    const [notes, setNotes] = useState('');

    // FIX: Use useEffect to set notes from fetched customer data.
    useEffect(() => {
        if (customer) {
            setNotes(customer.notes || '');
        }
    }, [customer]);

    const events = useLiveQuery(
        () => db.timeline.where('customer_id').equals(customerId).reverse().sortBy('timestamp'),
        [customerId]
    );

    const handleSaveNotes = async () => {
        if (!customer || customer.notes === notes) return;
        try {
            await updateCustomer(customerId, { notes });
            toast.success('Notities opgeslagen!');
        } catch (error) {
            toast.error('Kon notities niet opslaan.');
            console.error(error);
        }
    };

    if (!customer) {
        return <div>Laden...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Notities</h3>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    rows={10}
                    maxLength={2000}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Voeg hier notities over de klant toe..."
                />
                 <p className="text-xs text-right text-gray-400">{notes.length} / 2000</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Tijdlijn</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                    {events?.map(event => (
                        <div key={event.id} className="flex space-x-3">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
                                    {event.type.substring(0, 3)}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm">{event.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(event.timestamp)}</p>
                            </div>
                        </div>
                    ))}
                    {(!events || events.length === 0) && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Geen gebeurtenissen gevonden voor deze klant.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};