import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { UserGroupIcon, ClockIcon, CurrencyEuroIcon, FireIcon } from './ui/Icons';
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
    const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
    
    const stats = useLiveQuery(() => {
        const now = Date.now();
        const fourteenDaysFromNow = now + (14 * 24 * 60 * 60 * 1000);
        
        return db.transaction('r', db.customers, db.subscriptions, db.payments, async () => {
            const totalCustomers = await db.customers.count();
            const activeSubscriptions = await db.subscriptions.where('status').equals('ACTIVE').count();
            const expiringSoon = await db.subscriptions.where('end_at').between(now, fourteenDaysFromNow).and(sub => sub.status === 'ACTIVE').toArray();
            const expired = await db.subscriptions.where('end_at').below(now).and(sub => sub.status !== 'TEST').count();
            
            const payments = await db.payments.toArray();
            const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

            return {
                totalCustomers,
                activeSubscriptions,
                expiringSoon,
                expired,
                totalRevenue,
            };
        });
    }, []);

    const handleExpiringClick = () => {
        if (stats && stats.expiringSoon.length > 0) {
            setIsBulkModalOpen(true);
        }
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
                    value={stats?.expiringSoon.length ?? '...'}
                    onClick={handleExpiringClick}
                    color="bg-yellow-500"
                />
                <StatCard 
                    icon={<CurrencyEuroIcon className="h-6 w-6 text-white"/>}
                    title="Totale Omzet"
                    value={`€${(stats?.totalRevenue ?? 0).toFixed(2)}`}
                    color="bg-purple-500"
                />
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <FinancialCharts />
            </div>

            {isBulkModalOpen && stats && (
                <BulkWhatsappModal 
                    subscriptions={stats.expiringSoon}
                    onClose={() => setIsBulkModalOpen(false)}
                />
            )}
        </div>
    );
};
