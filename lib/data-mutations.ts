import { db } from './db';
import { generateId, computeRenewalDate } from './utils';
import type { Customer, Subscription, AppSettings, GiftCode, Payment } from '../types';
import { logTimelineEvent } from './timeline';
import { calculateSubscriptionPrice } from './price';

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
        const beforeState = await db.customers.get(customerId);
        const updatedCount = await db.customers.update(customerId, { ...data, updated_at: Date.now() });
        if (updatedCount > 0) {
            await logTimelineEvent({
                customer_id: customerId,
                type: 'NOTE_ADDED', // Using this for any customer data change for simplicity
                message: `Klantgegevens bijgewerkt.`,
                meta: { updatedFields: Object.keys(data), before: beforeState }
            });
        }
    });
};


/**
 * Deletes a customer and all their associated data, logging the event for potential reversal.
 */
export const deleteCustomer = async (customerId: string): Promise<void> => {
     await db.transaction('rw', db.customers, db.subscriptions, db.timeline, db.giftCodes, db.whatsappLogs, db.payments, async () => {
        const customerToDelete = await db.customers.get(customerId);
        if (!customerToDelete) throw new Error("Klant niet gevonden.");

        // Capture all related data for the 'before' state
        const subscriptionsToDelete = await db.subscriptions.where('customer_id').equals(customerId).toArray();
        const timelineToDelete = await db.timeline.where('customer_id').equals(customerId).toArray();
        const giftCodesUsedToDelete = await db.giftCodes.where('used_by_customer_id').equals(customerId).toArray();
        const whatsappLogsToDelete = await db.whatsappLogs.where('customer_id').equals(customerId).toArray();
        const paymentsToDelete = await db.payments.where('customer_id').equals(customerId).toArray();

        const beforeState = {
            customer: customerToDelete,
            subscriptions: subscriptionsToDelete,
            timeline: timelineToDelete,
            giftCodesUsed: giftCodesUsedToDelete,
            whatsappLogs: whatsappLogsToDelete,
            payments: paymentsToDelete
        };

        // Log the deletion event with the full snapshot
        await logTimelineEvent({
            customer_id: customerId,
            type: 'CUSTOMER_DELETED',
            message: `Klant ${customerToDelete.name} en alle data verwijderd.`,
            meta: { before: beforeState }
        });

        // Delete all related data
        await db.subscriptions.where('customer_id').equals(customerId).delete();
        await db.timeline.where('customer_id').equals(customerId).delete();
        await db.giftCodes.where('used_by_customer_id').equals(customerId).delete();
        await db.whatsappLogs.where('customer_id').equals(customerId).delete();
        await db.payments.where('customer_id').equals(customerId).delete();
        
        // Finally, delete the customer
        await db.customers.delete(customerId);
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
            const beforeState = await db.subscriptions.get(subData.id);
            await db.subscriptions.update(subData.id, { ...subData, updated_at: now });
            savedSub = await db.subscriptions.get(subData.id);
            if(savedSub){
                await logTimelineEvent({
                    customer_id: savedSub.customer_id,
                    type: 'SUBSCRIPTION_MODIFIED',
                    message: `Stream ${savedSub.label} bijgewerkt.`,
                    meta: { subscriptionId: savedSub.id, before: beforeState }
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
                meta: { subscriptionId: newSub.id, before: true }
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
            meta: { subscriptionId, before: subToDelete }
        });
    });
};

/**
 * Renews a subscription for another year and automatically logs the payment.
 */
export const renewSubscription = async (subscriptionId: string, settings: AppSettings): Promise<void> => {
    await db.transaction('rw', db.subscriptions, db.timeline, db.payments, async () => {
        const sub = await db.subscriptions.get(subscriptionId);
        if (!sub) throw new Error("Abonnement niet gevonden.");
        const beforeState = { ...sub };

        const newEndDate = computeRenewalDate(sub.end_at, settings);
        const renewalPrice = calculateSubscriptionPrice(sub, settings);
        const now = Date.now();

        await db.subscriptions.update(subscriptionId, { 
            end_at: newEndDate,
            status: 'ACTIVE',
            paid: true,
            updated_at: now
        });

        const newPayment: Payment = {
            id: generateId(),
            customer_id: sub.customer_id,
            subscription_id: sub.id,
            amount: renewalPrice,
            payment_date: now,
            payment_method: sub.payment_method,
            notes: 'Automatisch gelogd bij verlenging'
        };
        await db.payments.add(newPayment);

        await logTimelineEvent({
            customer_id: sub.customer_id,
            type: 'SUBSCRIPTION_RENEWED',
            message: `Stream ${sub.label} verlengd tot ${new Date(newEndDate).toLocaleDateString()}.`,
            meta: { subscriptionId, before: beforeState }
        });
        await logTimelineEvent({
            customer_id: sub.customer_id,
            type: 'PAYMENT_ADDED',
            message: `Betaling van €${renewalPrice.toFixed(2)} gelogd voor verlenging.`,
        });
    });
};


/**
 * Adds a new gift code to the database and logs it.
 */
export const addGiftCode = async (codeData: Omit<GiftCode, 'created_at'>): Promise<GiftCode> => {
    const newCode: GiftCode = {
        ...codeData,
        created_at: Date.now(),
    };
    await db.transaction('rw', db.giftCodes, db.timeline, async () => {
        await db.giftCodes.add(newCode);
        
        // Log to the recipient's timeline if specified, otherwise the referrer's, or as a general system event (not implemented).
        const customer_id_for_log = newCode.receiver_id || newCode.referrer_id;
        if (customer_id_for_log) {
            await logTimelineEvent({
                customer_id: customer_id_for_log,
                type: 'GIFT_CODE_CREATED',
                message: `Cadeaucode ${newCode.id} aangemaakt (${newCode.reason}).`,
                meta: { giftCodeId: newCode.id, before: true }
            });
        }
    });
    return newCode;
};

/**
 * Deletes a gift code from the database and logs it.
 */
export const deleteGiftCode = async (giftCodeId: string): Promise<void> => {
    const codeToDelete = await db.giftCodes.get(giftCodeId);
    if (!codeToDelete) return;

    await db.transaction('rw', db.giftCodes, db.timeline, async () => {
        await db.giftCodes.delete(giftCodeId);
        
        const customer_id_for_log = codeToDelete.receiver_id || codeToDelete.referrer_id;
         if (customer_id_for_log) {
            await logTimelineEvent({
                customer_id: customer_id_for_log,
                type: 'GIFT_CODE_DELETED',
                message: `Cadeaucode ${codeToDelete.id} verwijderd.`,
                meta: { giftCodeId, before: codeToDelete }
            });
        }
    });
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

/**
 * Reverts a timeline event by restoring the 'before' state of the data.
 */
export const revertTimelineEvent = async (eventId: string): Promise<void> => {
    const event = await db.timeline.get(eventId);
    if (!event) {
        throw new Error("Gebeurtenis niet gevonden.");
    }
    if (!event.meta?.before) {
        throw new Error("Deze actie kan niet hersteld worden (geen 'voor' data opgeslagen).");
    }

    await db.transaction('rw', db.tables, async () => {
        switch (event.type) {
            case 'CUSTOMER_DELETED':
                const { customer, subscriptions, timeline, giftCodesUsed, whatsappLogs, payments } = event.meta.before;
                await db.customers.add(customer);
                if (subscriptions?.length) await db.subscriptions.bulkAdd(subscriptions);
                if (timeline?.length) await db.timeline.bulkAdd(timeline);
                if (giftCodesUsed?.length) await db.giftCodes.bulkPut(giftCodesUsed); // Use put in case they exist
                if (whatsappLogs?.length) await db.whatsappLogs.bulkAdd(whatsappLogs);
                if (payments?.length) await db.payments.bulkAdd(payments);
                break;
            
            case 'SUBSCRIPTION_CREATED':
            case 'GIFT_CODE_CREATED':
                const idToDelete = event.meta?.subscriptionId || event.meta?.giftCodeId;
                 if (!idToDelete) {
                    throw new Error("Kan ID niet vinden om te herstellen.");
                }
                if (event.type === 'SUBSCRIPTION_CREATED') {
                    await db.subscriptions.delete(idToDelete);
                } else {
                    await db.giftCodes.delete(idToDelete);
                }
                break;
            
            case 'NOTE_ADDED':
                const beforeStateCust = event.meta.before as Customer;
                await db.customers.put(beforeStateCust);
                break;

            case 'SUBSCRIPTION_MODIFIED':
            case 'SUBSCRIPTION_RENEWED':
            case 'REWARD_YEAR_APPLIED':
                const beforeStateSub = event.meta.before as Subscription;
                await db.subscriptions.put(beforeStateSub);
                break;
            
            case 'SUBSCRIPTION_DELETED':
            case 'GIFT_CODE_DELETED':
                const dataToAdd = event.meta.before;
                if (event.type === 'SUBSCRIPTION_DELETED') {
                    await db.subscriptions.add(dataToAdd as Subscription);
                } else {
                    await db.giftCodes.add(dataToAdd as GiftCode);
                }
                break;

            case 'REWARD_GIFT_CODE_GENERATED':
                const giftCodeId = event.meta?.giftCodeId;
                if (!giftCodeId) {
                    throw new Error("Kan cadeaucode ID niet vinden om te herstellen.");
                }
                const deletedCount = await db.giftCodes.delete(giftCodeId);
                if (deletedCount === 0) {
                    console.warn(`Poging tot herstellen van cadeaucode creatie, maar code ${giftCodeId} werd niet gevonden.`);
                }
                break;
            
            case 'WHATSAPP_SENT':
                const whatsappLogId = event.meta?.whatsappLogId;
                if (!whatsappLogId) {
                    throw new Error("Kan WhatsApp log ID niet vinden om te herstellen.");
                }
                await db.whatsappLogs.delete(whatsappLogId);
                break;

            default:
                throw new Error(`Herstel is niet ondersteund voor actie type: ${event.type}`);
        }
        
        // Log that an action was reverted
        await logTimelineEvent({
            customer_id: event.customer_id,
            type: 'ACTION_REVERTED',
            message: `Actie '${event.message}' hersteld.`,
            meta: { reverted_event_id: eventId }
        });
    });
};