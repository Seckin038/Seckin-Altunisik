import { db } from './db';
import type { Customer, AppSettings } from '../types';

export interface ClaimableMilestone {
    milestone: number;
    referralCount: number;
}

export interface ClaimableReward {
    customer: Customer;
    referralCount: number;
    milestone: number;
}

export const getClaimableMilestones = async (customerId: string): Promise<ClaimableMilestone[]> => {
    // FIX: Wrap entire function in a try-catch block to prevent unhandled promise rejections,
    // which cause the `useLiveQuery` hook to throw and crash the app.
    try {
        const settings = await db.settings.get('app');
        // Add more robust checking for settings object and its properties.
        if (!settings || typeof settings !== 'object' || !Array.isArray(settings.reward_milestones) || settings.reward_milestones.length === 0) {
            console.warn("Settings or reward_milestones are missing/invalid. Returning no milestones.");
            return [];
        }

        const resetYears = settings.referral_reset_years || 1;
        let startDateThreshold = 0;
        if (resetYears > 0) {
            const resetDate = new Date();
            resetDate.setFullYear(resetDate.getFullYear() - resetYears);
            startDateThreshold = resetDate.getTime();
        }
        
        const referredCustomers = await db.customers.where('referrer_id').equals(customerId).toArray();
        const referredCustomerIds = referredCustomers.filter(c => c && c.id).map(c => c.id);

        if (referredCustomerIds.length === 0) {
            return [];
        }

        const validReferralCount = await db.subscriptions
            .where('customer_id').anyOf(referredCustomerIds)
            // FIX: Add even stricter type checks inside the query to handle deeply corrupt data.
            .and(sub => 
                sub &&
                typeof sub.status === 'string' &&
                sub.status === 'ACTIVE' && 
                typeof sub.start_at === 'number' && 
                sub.start_at >= startDateThreshold
            )
            .count();
        
        if (validReferralCount === 0) {
            return [];
        }

        const claimedEvents = await db.timeline
            .where('customer_id').equals(customerId)
            // FIX: Add stricter type and structure checks to prevent TypeErrors inside the query.
            .and(event => 
                event &&
                typeof event.type === 'string' &&
                (event.type === 'REWARD_YEAR_APPLIED' || event.type === 'REWARD_GIFT_CODE_GENERATED') &&
                event.meta != null &&
                typeof event.meta === 'object' &&
                !Array.isArray(event.meta) && // Ensure meta is an object, not an array
                'milestone' in event.meta && // Ensure the key exists
                typeof event.meta.milestone === 'number'
            )
            .toArray();
        
        const claimedSet = new Set(claimedEvents.map(event => event.meta!.milestone));
        
        const claimable: ClaimableMilestone[] = [];
        for (const milestone of settings.reward_milestones) {
            if (validReferralCount >= milestone && !claimedSet.has(milestone)) {
                claimable.push({ milestone, referralCount: validReferralCount });
            }
        }
        
        return claimable;
    } catch (error) {
        console.error(`Error calculating milestones for customer ${customerId}:`, error);
        // Return a safe empty array to prevent the app from crashing.
        return [];
    }
};

export const getClaimableRewards = async (): Promise<ClaimableReward[]> => {
    // FIX: Wrap entire function in a try-catch block to prevent unhandled promise rejections.
    // This catches errors from initial database queries before the loop starts.
    try {
        const settings = await db.settings.get('app');
        // Add more robust checking for settings object and its properties.
        if (!settings || typeof settings !== 'object' || !Array.isArray(settings.reward_milestones) || settings.reward_milestones.length === 0) {
            console.warn("Settings or reward_milestones are missing/invalid. Returning no rewards.");
            return [];
        }

        const allCustomers = await db.customers.toArray();
        const allRewards: ClaimableReward[] = [];

        for (const customer of allCustomers) {
            // This inner try-catch is still useful to prevent one bad customer from stopping the whole loop.
            try {
                // Defensive check in case a customer record is malformed
                if (!customer || !customer.id) continue;

                const milestones = await getClaimableMilestones(customer.id);
                // FIX: Loop through ALL available milestones instead of just taking the first one.
                for (const milestone of milestones) {
                     allRewards.push({
                        customer,
                        referralCount: milestone.referralCount,
                        milestone: milestone.milestone
                    });
                }
            } catch (error) {
                console.error(`Failed to process rewards for customer ${customer.id}`, error);
            }
        }

        return allRewards.sort((a,b) => a.customer.name.localeCompare(b.customer.name) || a.milestone - b.milestone);
    } catch (error) {
        console.error('A critical error occurred while fetching claimable rewards:', error);
        // Return a safe empty array to prevent the entire page from crashing.
        return [];
    }
};