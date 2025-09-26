
// FIX: Restored the full content of this file, which was previously empty/corrupted.
// This file contains all the core functions for writing data to the database.

import { db } from './db';
import type { Customer, Subscription, GiftCode, TimelineEvent, AppSettings, Payment } from '../types';
import { generateId, computeRenewalDate } from './utils';
import { logTimelineEvent } from './timeline';
import { calculateSubscriptionPrice } from './price';

// CUSTOMER MUTATIONS
export const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const newCustomer: Customer = {
        ...customerData,
        id: generateId(),
        created_at: Date.now(),
        updated_at: Date.now(),
    };
    await db.transaction('rw', db.customers, db.timeline, async () => {
        await db.customers.add(newCustomer);
        await logTimelineEvent({
            customer_id: newCustomer.id,
            type: 'CUSTOMER_CREATED',
            message: `Klant aangemaakt: ${newCustomer.name}.`,
            meta: { before: true, customer: newCustomer }
        });
    });
    return newCustomer;
};

export const updateCustomer = async (id: string, updates: Partial<Pick<Customer, 'name' | 'phone' | 'notes'>>): Promise<void> => {
    const customer = await db.customers.get(id);
    if (!customer) throw new Error("Klant niet gevonden.");
    
    const beforeState = { ...customer };
    const changedFields = Object.keys(updates).filter(key => updates[key as keyof typeof updates] !== customer[key as keyof Customer]);

    if(changedFields.length === 0) return;

    await db.transaction('rw', db.customers, db.timeline, async () => {
        await db.customers.update(id, { ...updates, updated_at: Date.now() });
        
        await logTimelineEvent({
            customer_id: id,
            type: 'CUSTOMER_MODIFIED',
            message: `Klantgegevens bijgewerkt (${changedFields.join(', ')}).`,
            meta: { before: beforeState, after: { ...customer, ...updates } }
        });
    });
};

export const deleteCustomer = async (id: string): Promise<void> => {
    await db.transaction('rw', db.tables, async () => {
        const customer = await db.customers.get(id);
        if (!customer) return;
        
        const subscriptions = await db.subscriptions.where('customer_id').equals(id).toArray();
        const payments = await db.payments.where('customer_id').equals(id).toArray();
        const timeline = await db.timeline.where('customer_id').equals(id).toArray();
        const giftCodes = await db.giftCodes.where({ referrer_id: id }).or('used_by_customer_id').equals(id).toArray();
        const whatsappLogs = await db.whatsappLogs.where('customer_id').equals(id).toArray();
        
        const giftCodeIdsToDelete = giftCodes.map(gc => gc.id);

        await db.customers.delete(id);
        await db.subscriptions.where('customer_id').equals(id).delete();
        await db.payments.where('customer_id').equals(id).delete();
        await db.timeline.where('customer_id').equals(id).delete();
        await db.whatsappLogs.where('customer_id').equals(id).delete();
        if (giftCodeIdsToDelete.length > 0) {
            await db.giftCodes.bulkDelete(giftCodeIdsToDelete);
        }
        
        await logTimelineEvent({
            customer_id: id,
            type: 'CUSTOMER_DELETED',
            message: `Klant '${customer.name}' en alle bijbehorende data verwijderd.`,
            meta: { 
                before: { customer, subscriptions, payments, timeline, giftCodes, whatsappLogs },
            },
        });
    });
};


// SUBSCRIPTION MUTATIONS
export const saveSubscription = async (subData: Partial<Subscription>, giftCodeId?: string): Promise<Subscription> => {
    let savedSub: Subscription;
    await db.transaction('rw', db.subscriptions, db.timeline, db.giftCodes, db.payments, async () => {
        if (subData.id) { // Update
            const sub = await db.subscriptions.get(subData.id);
            if (!sub) throw new Error("Abonnement niet gevonden voor bijwerken.");
            
            const beforeState = { ...sub };
            await db.subscriptions.update(subData.id, { ...subData, updated_at: Date.now() });
            savedSub = { ...sub, ...subData, updated_at: Date.now() };

            await logTimelineEvent({
                customer_id: sub.customer_id,
                type: 'SUBSCRIPTION_MODIFIED',
                message: `Stream '${sub.label}' bijgewerkt.`,
                meta: { before: beforeState, after: savedSub }
            });

        } else { // Create
            const newSub: Subscription = {
                ...subData,
                id: generateId(),
                created_at: Date.now(),
                updated_at: Date.now(),
            } as Subscription;
            
            await db.subscriptions.add(newSub);
            savedSub = newSub;

            await logTimelineEvent({
                customer_id: newSub.customer_id,
                type: 'SUBSCRIPTION_CREATED',
                message: `Nieuwe stream '${newSub.label}' aangemaakt.`,
                meta: { before: true, subscription: newSub }
            });

            if (giftCodeId) {
                await db.giftCodes.update(giftCodeId, {
                    used_at: Date.now(),
                    used_by_customer_id: newSub.customer_id,
                    used_for_subscription_id: newSub.id
                });
                
                const payment: Omit<Payment, 'id'> = {
                    customer_id: newSub.customer_id,
                    subscription_id: newSub.id,
                    amount: 0,
                    payment_date: Date.now(),
                    payment_method: 'Gratis',
                    notes: `Geactiveerd met cadeaucode ${giftCodeId}`
                };
                await db.payments.add({ ...payment, id: generateId() } as Payment);
            }
        }
    });
    return savedSub!;
};

export const deleteSubscription = async (id: string): Promise<void> => {
    await db.transaction('rw', db.subscriptions, db.timeline, async () => {
        const sub = await db.subscriptions.get(id);
        if (!sub) return;
        
        await db.subscriptions.delete(id);
        
        await logTimelineEvent({
            customer_id: sub.customer_id,
            type: 'SUBSCRIPTION_DELETED',
            message: `Stream '${sub.label}' verwijderd.`,
            meta: { before: sub }
        });
    });
};

export const renewSubscription = async (id: string, settings: AppSettings): Promise<void> => {
     await db.transaction('rw', db.subscriptions, db.timeline, db.payments, async () => {
        const sub = await db.subscriptions.get(id);
        if (!sub) throw new Error("Abonnement niet gevonden.");

        const beforeState = { ...sub };
        const newEndDate = computeRenewalDate(sub.end_at, settings);
        
        await db.subscriptions.update(id, {
            end_at: newEndDate,
            status: 'ACTIVE',
            paid: true,
            free: false,
            updated_at: Date.now()
        });

        const price = calculateSubscriptionPrice(sub, settings);
        const payment: Omit<Payment, 'id'> = {
            customer_id: sub.customer_id,
            subscription_id: sub.id,
            amount: price,
            payment_date: Date.now(),
            payment_method: sub.payment_method,
            notes: `Automatische betaling voor verlenging.`
        };
        await db.payments.add({ ...payment, id: generateId() } as Payment);

        await logTimelineEvent({
            customer_id: sub.customer_id,
            type: 'SUBSCRIPTION_RENEWED',
            message: `Stream '${sub.label}' verlengd. Nieuwe einddatum: ${new Date(newEndDate).toLocaleDateString()}.`,
            meta: { before: beforeState, after: { ...sub, end_at: newEndDate, status: 'ACTIVE', paid: true } }
        });
    });
};

// GIFT CODE MUTATIONS
export const addGiftCode = async (codeData: Omit<GiftCode, 'created_at'>): Promise<GiftCode> => {
    const newCode: GiftCode = {
        ...codeData,
        created_at: Date.now(),
    };
    
    await db.transaction('rw', db.giftCodes, db.timeline, async () => {
        await db.giftCodes.add(newCode);
        
        await logTimelineEvent({
            customer_id: newCode.referrer_id || 'SYSTEM',
            type: 'GIFT_CODE_CREATED',
            message: `Cadeaucode ${newCode.id} aangemaakt.`,
            meta: { before: true, giftCode: newCode }
        });
    });
    
    return newCode;
};

export const deleteGiftCode = async (id: string): Promise<void> => {
    await db.transaction('rw', db.giftCodes, db.timeline, async () => {
        const code = await db.giftCodes.get(id);
        if (!code) return;
        
        await db.giftCodes.delete(id);
        
        await logTimelineEvent({
            customer_id: code.referrer_id || 'SYSTEM',
            type: 'GIFT_CODE_DELETED',
            message: `Cadeaucode ${code.id} verwijderd.`,
            meta: { before: code }
        });
    });
};

// TIMELINE/REVERT MUTATIONS
export const revertTimelineEvent = async (eventId: string): Promise<void> => {
    const event = await db.timeline.get(eventId);
    if (!event) throw new Error("Gebeurtenis niet gevonden");
    if (!event.meta?.before) throw new Error("Gebeurtenis kan niet hersteld worden");

    await db.transaction('rw', db.tables, async () => {
        const metaBefore = event.meta.before;
        switch (event.type) {
            case 'CUSTOMER_DELETED':
                await db.customers.add(metaBefore.customer);
                if (metaBefore.subscriptions?.length) await db.subscriptions.bulkAdd(metaBefore.subscriptions);
                if (metaBefore.payments?.length) await db.payments.bulkAdd(metaBefore.payments);
                if (metaBefore.timeline?.length) await db.timeline.bulkAdd(metaBefore.timeline);
                if (metaBefore.giftCodes?.length) await db.giftCodes.bulkAdd(metaBefore.giftCodes);
                if (metaBefore.whatsappLogs?.length) await db.whatsappLogs.bulkAdd(metaBefore.whatsappLogs);
                break;
            case 'SUBSCRIPTION_CREATED':
                await db.subscriptions.delete(metaBefore.subscription.id);
                break;
            case 'SUBSCRIPTION_MODIFIED':
            case 'SUBSCRIPTION_RENEWED':
            case 'REWARD_YEAR_APPLIED':
                await db.subscriptions.put(metaBefore);
                break;
            case 'SUBSCRIPTION_DELETED':
                await db.subscriptions.add(metaBefore);
                break;
            case 'GIFT_CODE_CREATED':
                await db.giftCodes.delete(metaBefore.giftCode.id);
                break;
            case 'GIFT_CODE_DELETED':
                await db.giftCodes.add(metaBefore);
                break;
            case 'WHATSAPP_SENT':
                 await db.whatsappLogs.delete(metaBefore.whatsappLogId);
                 break;
            default:
                throw new Error(`Herstel-logica voor type '${event.type}' is niet geïmplementeerd.`);
        }
        
        await logTimelineEvent({
            customer_id: event.customer_id,
            type: 'ACTION_REVERTED',
            message: `Actie hersteld: "${event.message}"`,
            meta: { reverted_event_id: eventId }
        });
    });
};
