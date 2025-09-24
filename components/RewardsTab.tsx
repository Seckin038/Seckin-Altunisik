import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, Subscription, TimelineEvent } from '../types';
import type { View, NavigationParams } from '../App';
import { getClaimableMilestones, ClaimableMilestone } from '../lib/rewards';
import { RewardClaimWizard } from './RewardClaimWizard';
import { formatNL, getStatusInfo } from '../lib/utils';
import { GiftCodeManager } from './GiftCodeManager';
// FIX: Corrected icon imports.
import { UserPlusIcon, ChevronRightIcon, ChevronDownIcon } from './ui/Icons';


interface RewardHistoryProps {
    customerId: string;
}
const RewardHistory: React.FC<RewardHistoryProps> = ({ customerId }) => {
    const events = useLiveQuery(() => db.timeline.where({ customer_id: customerId, type: 'REWARD_YEAR_APPLIED' }).or('type').equals('REWARD_GIFT_CODE_GENERATED').toArray(), [customerId]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Beloningsgeschiedenis</h3>
            {events && events.length > 0 ? (
                 <ul className="space-y-3 max-h-80 overflow-y-auto">
                    {events.sort((a,b) => b.timestamp - a.timestamp).map(event => (
                         <li key={event.id} className="p-2 text-sm">
                             <p className="font-medium">{event.message}</p>
                             <p className="text-xs text-gray-500">{formatNL(event.timestamp)}</p>
                         </li>
                    ))}
                 </ul>
            ) : (
                <p className="text-gray-500 dark:text-gray-400">Geen beloningsgeschiedenis gevonden.</p>
            )}
        </div>
    );
};

interface ReferralTreeProps {
    customerId: string;
    onNavigate: (view: View, params?: NavigationParams) => void;
}
const ReferralTree: React.FC<ReferralTreeProps> = ({ customerId, onNavigate }) => {
    const allCustomers = useLiveQuery(() => db.customers.toArray());
    const allSubscriptions = useLiveQuery(() => db.subscriptions.toArray());

    const { tree, total } = useMemo(() => {
        if (!allCustomers || !allSubscriptions) return { tree: [], total: 0 };
        
        const customersById = allCustomers.reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {} as Record<string, Customer>);

        const subsByCustomerId = allSubscriptions.reduce((acc, s) => {
            if (!acc[s.customer_id]) acc[s.customer_id] = [];
            acc[s.customer_id].push(s);
            return acc;
        }, {} as Record<string, Subscription[]>);

        const childrenByParentId: Record<string, Customer[]> = {};
        for (const c of allCustomers) {
            if (c.referrer_id) {
                if (!childrenByParentId[c.referrer_id]) childrenByParentId[c.referrer_id] = [];
                childrenByParentId[c.referrer_id].push(c);
            }
        }
        
        let count = 0;
        const buildTree = (parentId: string): any[] => {
            const children = childrenByParentId[parentId] || [];
            count += children.length;
            return children.map(child => ({
                ...child,
                subscriptions: subsByCustomerId[child.id] || [],
                children: buildTree(child.id),
            }));
        };
        
        const rootChildren = buildTree(customerId);
        return { tree: rootChildren, total: count };

    }, [allCustomers, allSubscriptions, customerId]);
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Referral Netwerk ({total})</h3>
            <div className="max-h-80 overflow-y-auto">
                {tree.length > 0 ? (
                     <ul className="space-y-2">
                        {tree.map(node => <ReferralNode key={node.id} node={node} onNavigate={onNavigate} />)}
                    </ul>
                ): (
                     <p className="text-gray-500">Deze klant heeft nog niemand geworven.</p>
                )}
            </div>
        </div>
    );
};

const ReferralNode: React.FC<{ node: any; onNavigate: (view: View, params?: NavigationParams) => void; }> = ({ node, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = node.children && node.children.length > 0;
    const activeSub = node.subscriptions.find((s: Subscription) => s.status === 'ACTIVE');

    return (
        <li>
            <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                {hasChildren ? (
                     <button onClick={() => setIsOpen(!isOpen)} className="p-1">
                        {isOpen ? <ChevronDownIcon className="h-4 w-4"/> : <ChevronRightIcon className="h-4 w-4"/>}
                    </button>
                ) : (
                    <div className="w-6"/>
                )}
                <button
                    onClick={() => onNavigate('CUSTOMERS', { customerId: node.id })}
                    className="w-full text-left"
                >
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{node.name}</span>
                        {activeSub && <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${getStatusInfo(activeSub.status).color}`}>{getStatusInfo(activeSub.status).text}</span>}
                    </div>
                     {activeSub && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>Eind: {formatNL(activeSub.end_at)}</span>
                        </div>
                    )}
                </button>
            </div>
            {isOpen && hasChildren && (
                 <ul className="pl-6 border-l ml-5 dark:border-gray-600">
                    {node.children.map((childNode: any) => <ReferralNode key={childNode.id} node={childNode} onNavigate={onNavigate} />)}
                </ul>
            )}
        </li>
    );
};


export const RewardsTab: React.FC<{ customerId: string; onNavigate: (view: View, params?: NavigationParams) => void; }> = ({ customerId, onNavigate }) => {
    const customer = useLiveQuery(() => db.customers.get(customerId), [customerId]);
    const claimableMilestones = useLiveQuery(() => getClaimableMilestones(customerId), [customerId]);
    const [claimingMilestone, setClaimingMilestone] = useState<ClaimableMilestone | null>(null);
    
    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                 <h3 className="text-lg font-semibold mb-4">Beschikbare Beloningen</h3>
                 {claimableMilestones && claimableMilestones.length > 0 ? (
                    <div className="space-y-3">
                    {claimableMilestones.map(milestone => (
                         <div key={milestone.milestone} className="p-4 rounded-lg bg-green-50 dark:bg-green-900/50 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-green-800 dark:text-green-200">Mijlpaal {milestone.milestone} bereikt!</p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    {milestone.referralCount} geldige wervingen.
                                </p>
                            </div>
                            <button 
                                onClick={() => setClaimingMilestone(milestone)}
                                className="bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm"
                            >
                                Start Wizard
                            </button>
                        </div>
                    ))}
                    </div>
                 ) : (
                    <p className="text-gray-500 dark:text-gray-400">Geen nieuwe beloningen om te claimen.</p>
                 )}
             </div>

            <ReferralTree customerId={customerId} onNavigate={onNavigate} />
            <RewardHistory customerId={customerId} />
            <GiftCodeManager customerId={customerId} />

            {claimingMilestone && customer && (
                <RewardClaimWizard 
                    customer={customer}
                    milestone={claimingMilestone}
                    onClose={() => setClaimingMilestone(null)}
                />
            )}
        </div>
    );
};