import type { Customer, Subscription, AppSettings } from '../types';
import { formatNL, countriesToFlags, parseM3uUrl } from './utils';
import { calculateSubscriptionPrice } from './price';

/**
 * Picks the correct WhatsApp template name based on the subscription details.
 * This is typically used for new customer onboarding or expiration reminders.
 */
export const pickTemplateNameForStream = (subscription: Subscription): string => {
    if (subscription.status === 'TEST') {
        return subscription.erotiek ? 'A2. Test 6u (met erotiek)' : 'A1. Test 6u (geen erotiek)';
    }
    if (subscription.status === 'EXPIRED') {
         return 'A6. Jaar verlopen (EXPIRED)';
    }
    
    // Logic for expiring/expired subscriptions
    const now = Date.now();
    const fourteenDaysFromNow = now + (14 * 24 * 60 * 60 * 1000);
    
    if (subscription.end_at < now) {
        return 'A6. Jaar verlopen (EXPIRED)';
    }
    if (subscription.end_at <= fourteenDaysFromNow && subscription.status === 'ACTIVE') {
        return 'A5. Jaar bijna verlopen (reminder)';
    }
    
    if (subscription.status === 'ACTIVE') {
        return subscription.erotiek ? 'A4. Jaarabonnement (met erotiek)' : 'A3. Jaarabonnement (geen erotiek)';
    }
    
    // Default fallback
    return 'A3. Jaarabonnement (geen erotiek)';
};

const getStatusLine = (sub: Subscription, settings: AppSettings): string => {
    const now = Date.now();
    const isExpiringSoon = sub.end_at > now && sub.end_at < (now + 14 * 24 * 60 * 60 * 1000);

    switch (sub.status) {
        case 'TEST':
            return `❗ TEST ${settings.test_hours} uur`;
        case 'ACTIVE':
            if (isExpiringSoon) return '🟢 1 jaar abonnement (bijna verlopen)';
            return '🟢 1 jaar abonnement';
        case 'EXPIRED':
            return '⛔ VERLOPEN';
        case 'BLOCKED':
            return '🚫 GEBLOKKEERD';
        default:
            return 'Onbekend';
    }
};

const generateSubscriptionDetailsBlock = (sub: Subscription, index: number, settings: AppSettings): string => {
    const lines = [
        `Tv Flamingo Stream ${index + 1} — MAC: ${sub.mac || 'N/A'}`,
        `Status abonnement: ${getStatusLine(sub, settings)}`,
        `Geactiveerd: ${formatNL(sub.start_at)}`,
        `Loopt tot: ${formatNL(sub.end_at)}`,
        `Erotiek: ${sub.erotiek ? '🔞 Ja' : '➖ Nee'}`,
        `Betaald: ${sub.paid || sub.free ? '✅ JA' : '❌ NEE'}`,
        `Landen: ${countriesToFlags(sub.countries)}`
    ];
    return lines.join('\n');
};

const generateXtreamBlock = (sub: Subscription): string => {
    const m3uData = parseM3uUrl(sub.m3u_url);
    if (!m3uData || !m3uData.host || !m3uData.username || !m3uData.password) {
        return '— Xtream/M3U —\nKon M3U link niet verwerken of link is incompleet.';
    }
    
    const { username, password, host } = m3uData;
    
    const lines = [
        '— Xtream/M3U —',
        `Username: ${username}`,
        `Password: ${password}`,
        `Host/URL: ${host}`,
        '',
        'M3U LINK:',
        `http://${host}/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`,
        '',
        'EPG LINK:',
        `http://${host}/xmltv.php?username=${username}&password=${password}`,
        '',
        `EXPIRED: ${formatNL(sub.end_at).toUpperCase()} !!!`
    ];
    return lines.join('\n');
}

/**
 * Renders a WhatsApp message template with dynamic data.
 */
export const renderWhatsappTemplate = (
    template: string,
    customer: Partial<Customer>,
    settings: AppSettings,
    subscriptionOrSubs?: Subscription | Subscription[],
    extra?: Record<string, string>
): string => {
    let rendered = template;

    // Customer details
    rendered = rendered.replace(/{customer_name}/g, customer.name || 'klant');
    
    // Handle gift code expiry line
    if (extra?.expires_at) {
        const expiryDate = new Date(parseInt(extra.expires_at, 10));
        const expiry_datetime = formatNL(expiryDate.getTime());
        const expiry_line = `de code verloopt op ${expiry_datetime}`;
        rendered = rendered.replace(/{expiry_line}/g, expiry_line);
    } else if (rendered.includes('{expiry_line}')) {
        const expiry_line = 'deze code verloopt niet automatisch';
        rendered = rendered.replace(/{expiry_line}/g, expiry_line);
    }

    // Extra placeholders (for gift codes, milestones, etc.)
    if (extra) {
        Object.entries(extra).forEach(([key, value]) => {
            // Avoid re-processing expires_at
            if (key !== 'expires_at') {
                rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), value);
            }
        });
    }

    if (Array.isArray(subscriptionOrSubs)) {
        // Multi-stream template
        const block = subscriptionOrSubs.map((sub, i) => {
            const details = generateSubscriptionDetailsBlock(sub, i, settings);
            const xtream = generateXtreamBlock(sub);
            return `${details}\n\n${xtream}`;
        }).join('\n\n---\n\n');
        rendered = rendered.replace(/{MULTI_STREAM_BLOCK}/g, block);
    } else if (subscriptionOrSubs) {
        // Single stream template
        const sub = subscriptionOrSubs;
        const detailsBlock = generateSubscriptionDetailsBlock(sub, 0, settings);
        const xtreamBlock = generateXtreamBlock(sub);
        
        rendered = rendered.replace(/{SUBSCRIPTION_DETAILS}/g, detailsBlock);
        rendered = rendered.replace(/{XTREAM_BLOCK}/g, xtreamBlock);
    }
    
    return rendered;
};