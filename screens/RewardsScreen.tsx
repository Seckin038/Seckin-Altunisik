import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserPlusIcon } from '../components/ui/Icons';
import { GiftCodeManager } from '../components/GiftCodeManager';
import { getClaimableRewards } from '../lib/rewards';
import type { NavigationParams, View } from '../App';

interface RewardsScreenProps {
  params: NavigationParams;
  onNavigate: (view: View, params?: NavigationParams) => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({ params, onNavigate }) => {
    const claimableRewards = useLiveQuery(() => getClaimableRewards(), []);
    
    const filterIsActive = params.filter === 'claimable';

    const handleViewCustomer = (customerId: string) => {
        onNavigate('CUSTOMERS', { customerId, tab: 'rewards' });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Werving & Beloningen</h1>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                    <UserPlusIcon className="h-6 w-6 text-brand-600" />
                    <span>{filterIsActive ? 'Klanten met Beschikbare Beloningen' : 'Beloningen Overzicht'}</span>
                </h2>
                
                {!claimableRewards ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Laden...</div>
                ) : (
                    <div className="space-y-4">
                        {claimableRewards.length > 0 ? (
                            claimableRewards
                                // FIX: Defensive filter to prevent crashes from corrupted/incomplete reward objects.
                                .filter(reward => reward && reward.customer) 
                                .map(reward => (
                                <div key={reward.customer.id} className="p-4 rounded-lg bg-green-50 dark:bg-green-900/50 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-green-800 dark:text-green-200">{reward.customer.name}</p>
                                        <p className="text-sm text-green-700 dark:text-green-300">
                                            {reward.referralCount} wervingen - Beloning voor mijlpaal {reward.milestone} beschikbaar.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleViewCustomer(reward.customer.id)}
                                        className="bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm"
                                    >
                                        Bekijk & Claim
                                    </button>
                                </div>
                            ))
                        ) : (
                             <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Geen klanten met beloningen om te claimen.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <GiftCodeManager />
        </div>
    );
};