import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Subscription } from '../types';
// FIX: Import XCircleIcon to resolve reference error.
import { UserGroupIcon, ClockIcon, CurrencyEuroIcon, FireIcon, XCircleIcon } from './ui/Icons';
import type { View, NavigationParams } from '../App';
import { BulkWhatsappModal } from './BulkWhatsappModal';
import { FinancialCharts } from './FinancialCharts';

interface DashboardProps {
  onNavigate: (view: View, params?: NavigationParams) => void;
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    onClick?: () => void;
    color: string;
}> = ({ icon, title, value, onClick, color }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4 transition-transform hover:scale-105 ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [subsForBulkWhatsapp, setSubsForBulkWhatsapp] = useState<Subscription[]>([]);
    
    const stats = useLiveQuery(() => {
        const now = Date.now();
        const fourteenDaysFromNow = now + (14 * 24 * 60 * 60 * 1000);
        
        return db.transaction('r', db.customers, db.subscriptions, db.payments, async () => {
            const totalCustomers = await db.customers.count();
            const activeSubscriptions = await db.subscriptions.where('status').equals('ACTIVE').count();
            const expiringSoonCount = await db.subscriptions.where('end_at').between(now, fourteenDaysFromNow).and(sub => sub.status === 'ACTIVE').count();
            const expiredCount = await db.subscriptions.where('end_at').below(now).and(sub => sub.status === 'ACTIVE' || sub.status === 'EXPIRED').count();
            
            const payments = await db.payments.toArray();
            const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

            return {
                totalCustomers,
                activeSubscriptions,
                expiringSoonCount,
                expiredCount,
                totalRevenue,
            };
        });
    }, []);

    const handleOpenBulkWhatsapp = async () => {
        const now = Date.now();
        const fourteenDaysFromNow = now + (14 * 24 * 60 * 60 * 1000);
        const expiring = await db.subscriptions.where('end_at').between(now, fourteenDaysFromNow).and(sub => sub.status === 'ACTIVE').toArray();
        setSubsForBulkWhatsapp(expiring);
        setIsBulkModalOpen(true);
    };


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<UserGroupIcon className="h-6 w-6 text-white"/>}
                    title="Totaal Klanten"
                    value={stats?.totalCustomers ?? '...'}
                    onClick={() => onNavigate('CUSTOMERS', {})}
                    color="bg-blue-500"
                />
                <StatCard 
                    icon={<FireIcon className="h-6 w-6 text-white"/>}
                    title="Actieve Streams"
                    value={stats?.activeSubscriptions ?? '...'}
                    onClick={() => onNavigate('CUSTOMERS', { status: 'ACTIVE' })}
                    color="bg-green-500"
                />
                 <StatCard 
                    icon={<ClockIcon className="h-6 w-6 text-white"/>}
                    title="Verloopt Binnen 14 Dagen"
                    value={stats?.expiringSoonCount ?? '...'}
                    onClick={() => onNavigate('CUSTOMERS', { status: 'EXPIRING_SOON' })}
                    color="bg-yellow-500"
                />
                <StatCard 
                    icon={<XCircleIcon className="h-6 w-6 text-white"/>}
                    title="Verlopen Streams"
                    value={stats?.expiredCount ?? '...'}
                    onClick={() => onNavigate('CUSTOMERS', { status: 'EXPIRED' })}
                    color="bg-red-500"
                />
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Snelle Acties</h2>
                <button
                    onClick={handleOpenBulkWhatsapp}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:bg-green-400 dark:disabled:bg-green-800 disabled:cursor-not-allowed"
                    disabled={!stats || stats.expiringSoonCount === 0}
                >
                    Stuur WhatsApp Herinneringen ({stats?.expiringSoonCount ?? 0})
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <FinancialCharts />
            </div>

            {isBulkModalOpen && (
                <BulkWhatsappModal 
                    subscriptions={subsForBulkWhatsapp}
                    onClose={() => setIsBulkModalOpen(false)}
                />
            )}
        </div>
    );
};