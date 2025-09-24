import { db } from './db';
import { generateId, computeRenewalDate } from './utils';
import type { Customer, Subscription, AppSettings, GiftCode, Payment } from '../types';
import { logTimelineEvent } from './timeline';

/**
 * Adds a new customer to the database.
 */
export const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const now = Date.now();
    const newCustomer: Customer = {
        ...customerData,
        id: generateId(),
        created_at: now,
        updated_at: now,
    };

    await db.transaction('rw', db.customers, db.timeline, async () => {
        await db.customers.add(newCustomer);
        await logTimelineEvent({
            customer_id: newCustomer.id,
            type: 'CUSTOMER_CREATED',
            message: `Klant ${newCustomer.name} aangemaakt.`
        });
    });

    return newCustomer;
};

/**
 * Updates an existing customer's data.
 */
export const updateCustomer = async (customerId: string, data: Partial<Omit<Customer, 'id'>>): Promise<void> => {
    await db.transaction('rw', db.customers, db.timeline, async () => {
        const updatedCount = await db.customers.update(customerId, { ...data, updated_at: Date.now() });
        if (updatedCount > 0) {
            await logTimelineEvent({
                customer_id: customerId,
                type: 'NOTE_ADDED', // Or a more generic type
                message: `Klantgegevens bijgewerkt.`,
                meta: { updatedFields: Object.keys(data) }
            });
        }
    });
};

/**
 * Saves a subscription (creates a new one or updates an existing one).
 * Also handles using a gift code if provided.
 */
export const saveSubscription = async (subData: Partial<Subscription>, giftCodeId?: string): Promise<Subscription> => {
    let savedSub: Subscription | undefined;
    
    await db.transaction('rw', db.subscriptions, db.timeline, db.giftCodes, async () => {
        const now = Date.now();
        if (subData.id) { // Update existing subscription
            await db.subscriptions.update(subData.id, { ...subData, updated_at: now });
            savedSub = await db.subscriptions.get(subData.id);
            if(savedSub){
                await logTimelineEvent({
                    customer_id: savedSub.customer_id,
                    type: 'SUBSCRIPTION_MODIFIED',
                    message: `Stream ${savedSub.label} bijgewerkt.`,
                    meta: { subscriptionId: savedSub.id }
                });
            }
        } else { // Create new subscription
            const newSub: Subscription = {
                id: generateId(),
                created_at: now,
                updated_at: now,
                ...subData,
            } as Subscription;
            await db.subscriptions.add(newSub);
            savedSub = newSub;
            await logTimelineEvent({
                customer_id: newSub.customer_id,
                type: 'SUBSCRIPTION_CREATED',
                message: `Nieuwe stream ${newSub.label} aangemaakt.`,
                meta: { subscriptionId: newSub.id }
            });
        }

        if (giftCodeId && savedSub) {
            const codeUpdateCount = await db.giftCodes.update(giftCodeId, {
                used_at: now,
                used_by_customer_id: savedSub.customer_id,
                used_for_subscription_id: savedSub.id,
            });
            if (codeUpdateCount === 0) {
                throw new Error("Cadeaucode kon niet worden gemarkeerd als gebruikt.");
            }
        }
    });

    if (!savedSub) {
        throw new Error("Kon stream niet opslaan.");
    }

    return savedSub;
};


/**
 * Deletes a subscription and logs the event.
 */
export const deleteSubscription = async (subscriptionId: string): Promise<void> => {
    const subToDelete = await db.subscriptions.get(subscriptionId);
    if (!subToDelete) return;
    
    await db.transaction('rw', db.subscriptions, db.timeline, async () => {
        await db.subscriptions.delete(subscriptionId);
        await logTimelineEvent({
            customer_id: subToDelete.customer_id,
            type: 'SUBSCRIPTION_DELETED',
            message: `Stream ${subToDelete.label} verwijderd.`,
            meta: { subscriptionId }
        });
    });
};

/**
 * Renews a subscription for another year.
 */
export const renewSubscription = async (subscriptionId: string, settings: Pick<AppSettings, 'year_days'>): Promise<void> => {
    await db.transaction('rw', db.subscriptions, db.timeline, async () => {
        const sub = await db.subscriptions.get(subscriptionId);
        if (!sub) throw new Error("Abonnement niet gevonden.");

        const newEndDate = computeRenewalDate(sub.end_at, settings);
        await db.subscriptions.update(subscriptionId, { 
            end_at: newEndDate,
            status: 'ACTIVE',
            paid: true, // Assuming renewal means it's paid
            updated_at: Date.now()
        });

        await logTimelineEvent({
            customer_id: sub.customer_id,
            type: 'SUBSCRIPTION_RENEWED',
            message: `Stream ${sub.label} verlengd tot ${new Date(newEndDate).toLocaleDateString()}.`,
            meta: { subscriptionId }
        });
    });
};


/**
 * Adds a new gift code to the database.
 */
export const addGiftCode = async (codeData: Omit<GiftCode, 'created_at'>): Promise<GiftCode> => {
    const newCode: GiftCode = {
        ...codeData,
        created_at: Date.now(),
    };
    await db.giftCodes.add(newCode);
    return newCode;
};


/**
 * Deletes all customer-related data from the local database.
 * This is a destructive operation.
 */
export const deleteAllUserData = async (): Promise<void> => {
    await db.transaction('rw', db.customers, db.subscriptions, db.timeline, db.giftCodes, db.whatsappLogs, db.payments, async () => {
        await db.customers.clear();
        await db.subscriptions.clear();
        await db.timeline.clear();
        await db.giftCodes.clear();
        await db.whatsappLogs.clear();
        await db.payments.clear();
    });
};

/**
 * Deletes all customers whose names start with "Test " and all their associated data.
 * This is a destructive operation intended for cleaning up seeded data.
 */
export const deleteTestCustomers = async (): Promise<number> => {
    let deletedCount = 0;
    await db.transaction('rw', db.customers, db.subscriptions, db.timeline, db.giftCodes, db.whatsappLogs, db.payments, async () => {
        const testCustomers = await db.customers.filter(c => c.name.startsWith('Test ')).toArray();
        if (testCustomers.length === 0) {
            return;
        }
        const testCustomerIds = testCustomers.map(c => c.id);
        deletedCount = testCustomerIds.length;

        // Delete all related data
        await db.subscriptions.where('customer_id').anyOf(testCustomerIds).delete();
        await db.timeline.where('customer_id').anyOf(testCustomerIds).delete();
        await db.giftCodes.where('referrer_id').anyOf(testCustomerIds).delete();
        await db.giftCodes.where('receiver_id').anyOf(testCustomerIds).delete();
        await db.giftCodes.where('used_by_customer_id').anyOf(testCustomerIds).delete();
        await db.whatsappLogs.where('customer_id').anyOf(testCustomerIds).delete();
        await db.payments.where('customer_id').anyOf(testCustomerIds).delete();
        
        // Finally, delete the customers themselves
        await db.customers.bulkDelete(testCustomerIds);
    });
    return deletedCount;
};