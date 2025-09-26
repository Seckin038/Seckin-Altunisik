import type { SubscriptionStatus, AppSettings } from '../types';

/**
 * Generates a short, somewhat unique ID.
 */
export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 10);
};

/**
 * A simple utility for conditionally joining class names.
 * @param classes - A list of strings or conditional objects.
 */
export const classNames = (...classes: (string | boolean | undefined | null)[]): string => {
    return classes.filter(Boolean).join(' ');
};

/**
 * Formats a timestamp into a localized date string (e.g., "25-09-2025").
 * @param timestamp - The timestamp to format.
 */
export const fmtDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formats a timestamp into a detailed localized string including time (dd-MM-yyyy HH:mm).
 * @param timestamp - The timestamp to format.
 */
export const formatNL = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    // Manually format to ensure dd-MM-yyyy HH:mm format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
};


/**
 * Computes the end date for a subscription.
 * @param startDate - The start timestamp.
 * @param status - The status of the subscription ('TEST' or 'ACTIVE').
 * @param settings - The application settings.
 * @returns The end timestamp.
 */
export const computeEndDate = (startDate: number, status: 'TEST' | 'ACTIVE', settings: Pick<AppSettings, 'test_hours' | 'year_days'>): number => {
    const start = new Date(startDate);
    if (status === 'TEST') {
        start.setHours(start.getHours() + (settings.test_hours || 6));
    } else {
        start.setDate(start.getDate() + (settings.year_days || 365));
    }
    return start.getTime();
};

/**
 * Computes the new end date for a subscription renewal.
 * @param currentEndDate - The current end timestamp.
 * @param settings - The application settings.
 * @returns The new end timestamp.
 */
export const computeRenewalDate = (currentEndDate: number, settings: Pick<AppSettings, 'year_days'>): number => {
    const now = Date.now();
    // If subscription has already expired, renew from today. Otherwise, extend from the end date.
    const startDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() + (settings.year_days || 365));
    return newEndDate.getTime();
};


/**
 * Gets UI-friendly text and color for a subscription status.
 */
export const getStatusInfo = (status: SubscriptionStatus): { text: string; color: string } => {
    switch (status) {
        case 'ACTIVE':
            return { text: 'Actief', color: 'bg-green-500' };
        case 'TEST':
            return { text: 'Test', color: 'bg-blue-500' };
        case 'EXPIRED':
            return { text: 'Verlopen', color: 'bg-red-500' };
        case 'BLOCKED':
            return { text: 'Geblokkeerd', color: 'bg-gray-700' };
        default:
            return { text: 'Onbekend', color: 'bg-gray-400' };
    }
};

/**
 * Converts an array of country codes to a string of flag emojis.
 * @param codes - Array of 2-letter country codes.
 * @returns A string of flag emojis.
 */
export const countriesToFlags = (codes: string[]): string => {
    if (!codes || codes.length === 0) return 'N/A';
    return codes.map(code => {
        if (code === 'KU') return '🏳️'; // Kurdistan has no official emoji flag
        if (code.length !== 2) return '❓';
        const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }).join(' ');
};

/**
 * Generates a formatted gift code string like "FLM-XXXX-XXXX-XXXX".
 */
export const generateGiftCodeString = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = (length: number) => Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    return `FLM-${randomPart(4)}-${randomPart(4)}-${randomPart(4)}`;
};

/**
 * Parses an M3U URL to extract username, password, and host.
 * @param url The M3U URL string.
 * @returns An object with any found parts (username, password, host), or null if parsing fails completely.
 */
export const parseM3uUrl = (url: string | undefined): { username: string | null; password: string | null; host: string | null } | null => {
    if (!url?.trim()) return null;
    try {
        // Ensure the URL has a protocol for the URL constructor to work.
        const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `http://${url}`;
        const urlObj = new URL(fullUrl);
        const username = urlObj.searchParams.get('username');
        const password = urlObj.searchParams.get('password');
        const host = urlObj.host;

        // As long as we can parse a host, return whatever we found.
        if (host) {
            return { username, password, host };
        }
        return null;
    } catch (e) {
        // This will catch truly malformed URLs that the constructor rejects.
        console.error("Invalid M3U URL for parsing:", url);
        return null;
    }
};

/**
 * Constructs an M3U URL from its host, username, and password components.
 * @param host The server host (e.g., my.server.com:8080).
 * @param username The username for the stream.
 * @param password The password for the stream.
 * @returns The fully constructed M3U URL string.
 */
export const constructM3uUrl = (host: string, username: string, password: string): string => {
    if (!host || !username || !password) return '';
    // Strip protocol if user adds it to the host
    const cleanHost = host.replace(/^(https?:\/\/)/, '');
    return `http://${cleanHost}/get.php?username=${username}&password=${password}&type=m3u_plus&output=m3u8`;
};
