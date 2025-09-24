import type { Subscription, AppSettings } from '../types';

/**
 * Calculates the final price for a given subscription based on app settings.
 * @param subscription The subscription object.
 * @param settings The application settings containing pricing info.
 * @returns The calculated price as a number.
 */
export const calculateSubscriptionPrice = (
    subscription: Partial<Subscription>,
    settings: Pick<AppSettings, 'price_standard' | 'price_vrienden' | 'price_erotiek_addon'>
): number => {
    if (!settings) return 0;

    const basePrice = subscription.payment_method === 'Vrienden prijs' 
        ? settings.price_vrienden 
        : settings.price_standard;
    
    const finalPrice = subscription.erotiek 
        ? basePrice + settings.price_erotiek_addon 
        : basePrice;

    return finalPrice;
};
