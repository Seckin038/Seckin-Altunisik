import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
// FIX: Corrected import paths.
import type { Customer, Subscription } from '../types';
import type { NavigationParams } from '../App';
import { UserPlusIcon } from './ui/Icons';
import { getStatusInfo, fmtDate, classNames } from '../lib/utils';
import { SubscriptionStatus } from '../types';

interface CustomerListProps {
  onSelectCustomer: (customerId: string) => void;
  onAddNewCustomer: () => void;
  filters: NavigationParams;
  onClearFilters: () => void;
}

type SortKey = 'name' | 'end_at' | 'referrals';
type SortOrder = 'asc' | 'desc';

export const CustomerList: React.FC<CustomerListProps> = ({ onSelectCustomer, onAddNewCustomer, filters, onClearFilters }) => {
    const [searchTerm, setSearchTerm] = useState(filters.q || '');
    const [advFilters, setAdvFilters] = useState({
        endsBefore: '',
        erotiek: 'any',
        paid: 'any',
        minReferrals: '',
    });
    const [sort, setSort] = useState<{ key: SortKey; order: SortOrder }>({ key: 'name', order: 'asc' });

    const customers = useLiveQuery(() => db.customers.toArray());
    const subscriptions = useLiveQuery(() => db.subscriptions.toArray());
    
    const referralCounts = useMemo(() => {
        if (!customers) return {};
        const counts: Record<string, number> = {};
        for (const c of customers) {
            if (c.referrer_id) {
                counts[c.referrer_id] = (counts[c.referrer_id] || 0) + 1;
            }
        }
        return counts;
    }, [customers]);

    const filteredData = useMemo(() => {
        if (!customers || !subscriptions) return [];

        const customersById = customers.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {} as Record<string, Customer>);
        
        let items: { customer: Customer; subscription: Subscription }[] = subscriptions.map(sub => {
            const customer = customersById[sub.customer_id];
            return customer ? { customer, subscription: sub } : null;
        }).filter(Boolean) as { customer: Customer; subscription: Subscription }[];

        // Main status filter from dashboard click
        if (filters.status) {
            items = items.filter(item => item.subscription.status === filters.status);
        }
        
        // Search term filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            items = items.filter(({ customer, subscription }) => 
                customer.name.toLowerCase().includes(lowerSearch) ||
                (subscription.mac && subscription.mac.toLowerCase().includes(lowerSearch))
            );
        }

        // Advanced filters
        if (advFilters.endsBefore) {
            const endsBeforeTimestamp = new Date(advFilters.endsBefore).getTime();
            items = items.filter(item => item.subscription.end_at <= endsBeforeTimestamp);
        }
        if (advFilters.erotiek !== 'any') {
            items = items.filter(item => String(item.subscription.erotiek) === advFilters.erotiek);
        }
        if (advFilters.paid !== 'any') {
            const isPaid = advFilters.paid === 'true';
            const isFree = advFilters.paid === 'free';

            items = items.filter(item => {
                if(isFree) return item.subscription.free;
                return item.subscription.paid === isPaid && !item.subscription.free
            });
        }
        if (advFilters.minReferrals) {
            const min = parseInt(advFilters.minReferrals, 10);
            if (!isNaN(min) && min > 0) {
                items = items.filter(({ customer }) => (referralCounts[customer.id] || 0) >= min);
            }
        }
        
        // Sorting
        items.sort((a, b) => {
            if (sort.key === 'name') {
                const comparison = a.customer.name.localeCompare(b.customer.name);
                return sort.order === 'asc' ? comparison : -comparison;
            }
            if (sort.key === 'end_at') {
                const comparison = a.subscription.end_at - b.subscription.end_at;
                return sort.order === 'asc' ? comparison : -comparison;
            }
            if (sort.key === 'referrals') {
                const countA = referralCounts[a.customer.id] || 0;
                const countB = referralCounts[b.customer.id] || 0;
                const comparison = countA - countB;
                return sort.order === 'asc' ? comparison : -comparison;
            }
            return 0;
        });

        return items;

    }, [customers, subscriptions, filters, searchTerm, advFilters, sort, referralCounts]);

    const activeFilterText = filters.status ? `Status: ${filters.status}` : (filters.view === 'customers' ? 'Alle Klanten' : '');

    const handleAdvFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAdvFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleSortChange = (key: SortKey) => {
        setSort(s => ({
            key,
            order: s.key === key && s.order === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Klanten</h1>
                <button
                    onClick={onAddNewCustomer}
                    className="bg-brand-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-brand-700"
                >
                    <UserPlusIcon className="h-5 w-5" />
                    <span>Nieuwe Klant</span>
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
                <input
                    type="text"
                    placeholder="Zoek op naam of MAC..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <InputField type="date" name="endsBefore" label="Verloopt voor" onChange={handleAdvFilterChange} value={advFilters.endsBefore} />
                    <SelectField name="erotiek" label="Erotiek" onChange={handleAdvFilterChange} value={advFilters.erotiek}>
                        <option value="any">Alles</option>
                        <option value="true">Ja</option>
                        <option value="false">Nee</option>
                    </SelectField>
                    <SelectField name="paid" label="Betaalstatus" onChange={handleAdvFilterChange} value={advFilters.paid}>
                        <option value="any">Alles</option>
                        <option value="true">Betaald</option>
                        <option value="false">Niet Betaald</option>
                        <option value="free">Gratis (Code)</option>
                    </SelectField>
                    <InputField type="number" name="minReferrals" label="Min. Wervingen" onChange={handleAdvFilterChange} value={advFilters.minReferrals} placeholder="bv. 5" />
                </div>
                
                 {activeFilterText && (
                    <div className="flex items-center space-x-2 pt-2">
                        <span className="text-sm font-medium">Actief filter:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full dark:bg-blue-900 dark:text-blue-200">{activeFilterText}</span>
                        <button onClick={onClearFilters} className="text-sm text-brand-600 hover:underline">Wissen</button>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => handleSortChange('name')}>Klantnaam {sort.key === 'name' && (sort.order === 'asc' ? '▲' : '▼')}</th>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => handleSortChange('end_at')}>Einddatum {sort.key === 'end_at' && (sort.order === 'asc' ? '▲' : '▼')}</th>
                            <th className="px-6 py-3">Startdatum</th>
                            <th className="px-6 py-3 cursor-pointer text-center" onClick={() => handleSortChange('referrals')}>Geworven {sort.key === 'referrals' && (sort.order === 'asc' ? '▲' : '▼')}</th>
                            <th className="px-6 py-3">MAC Adres</th>
                            <th className="px-6 py-3">Stream</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData?.map(({customer, subscription}) => (
                            <tr key={subscription.id} onClick={() => onSelectCustomer(customer.id)} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                <td className="px-6 py-4 font-medium">{customer.name}</td>
                                <td className="px-6 py-4 text-sm whitespace-nowrap">{fmtDate(subscription.end_at)}</td>
                                <td className="px-6 py-4 text-sm whitespace-nowrap">{fmtDate(subscription.start_at)}</td>
                                <td className="px-6 py-4 text-center font-medium">{referralCounts[customer.id] || 0}</td>
                                <td className="px-6 py-4 font-mono text-xs">{subscription.mac || 'N/A'}</td>
                                <td className="px-6 py-4">{subscription.label}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                  {(!filteredData || filteredData.length === 0) && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Geen resultaten gevonden voor de huidige filters.
                    </div>
                )}
            </div>
        </div>
    );
};


const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <input {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <select {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm">
            {children}
        </select>
    </div>
);