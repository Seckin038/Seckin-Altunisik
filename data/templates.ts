// FIX: Replaced corrupted file content with valid TypeScript definitions for default templates.
import type { WhatsappTemplate, CountryTemplate } from '../types';

export const DEFAULT_WHATSAPP_TEMPLATES: Omit<WhatsappTemplate, 'id'>[] = [
    {
        name: 'A1. Test 6u (geen erotiek)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

Wil je verder kijken met een 1 jaar abonnement voor €55?
Stuur me even een berichtje.

ℹ️ Betalen kan via: Tikkie

{XTREAM_BLOCK}`
    },
    {
        name: 'A2. Test 6u (met erotiek)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

Wil je verder kijken met een 1 jaar abonnement voor €60?
Stuur me even een berichtje.

ℹ️ Betalen kan via: Tikkie

{XTREAM_BLOCK}`
    },
    {
        name: 'A3. Jaarabonnement (geen erotiek)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

{XTREAM_BLOCK}`
    },
    {
        name: 'A4. Jaarabonnement (met erotiek)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

{XTREAM_BLOCK}`
    },
    {
        name: 'A5. Jaar bijna verlopen (reminder)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

❗ Dit abonnement verloopt binnenkort.
Wil je verlengen met 1 jaar voor €55/€60?
Stuur me even een berichtje.

ℹ️ Betalen kan via: Tikkie

{XTREAM_BLOCK}`
    },
    {
        name: 'A6. Jaar verlopen (EXPIRED)',
        message: `📺 Beste {customer_name},

{SUBSCRIPTION_DETAILS}

⚠️ Let op: dit abonnement is verlopen.
Je kunt verlengen met 1 jaar abonnement voor €55/€60.
Na betaling activeer ik direct opnieuw.

ℹ️ Betalen kan via: Tikkie

{XTREAM_BLOCK}`
    },
    {
        name: 'B. Multi-stream Overzicht',
        message: `📺 Beste {customer_name},

Hierbij een kort overzicht van jouw IPTV-abonnementen bij TV Flamingo:

{MULTI_STREAM_BLOCK}

ℹ️ Betalen kan via: Tikkie`
    },
    {
        name: 'F4. Werving Beloning (Zelf)',
        message: `🎉 Gefeliciteerd!
Je hebt {milestone} klanten succesvol aangebracht.
Daarom krijg jij nu 1 jaar gratis verlenging van je eigen abonnement.
Je hoeft zelf niets te doen – de einddatum is aangepast.
Bedankt voor je inzet! 🙌`
    },
    {
        name: 'F5. Werving Beloning (Code)',
        message: `🎉 Gefeliciteerd!
Je hebt {milestone} klanten succesvol aangebracht.
Daarom krijg jij nu een cadeaucode van 1 jaar gratis stream.

Cadeaucode: {gift_code}

Je kunt deze code weggeven aan wie je wilt.
Die persoon kan hem inwisselen bij ons en krijgt meteen 1 jaar toegang.
Bedankt voor je inzet! 🙌`
    },
    {
        name: 'G. Cadeaucode',
        message: `🎁 Beste {customer_name},

Je ontvangt een cadeaucode: {gift_code}
Gebruik: stuur deze code terug samen met je MAC en Apparaatsleutel. Dan activeer ik direct een gratis jaarabonnement.

Let op: {expiry_line}`
    },
];

export const DEFAULT_COUNTRY_TEMPLATES: Omit<CountryTemplate, 'id'>[] = [
    {
        name: 'Nederland Standaard',
        countryCodes: ['NL', 'BE', 'DE', 'TR']
    },
    {
        name: 'Europa Basis',
        countryCodes: ['NL', 'BE', 'DE', 'FR', 'ES', 'IT', 'GB', 'PT']
    },
    {
        name: 'Volledig Pakket',
        countryCodes: ['NL', 'BE', 'DE', 'TR', 'FR', 'ES', 'IT', 'GB', 'PT', 'MA', 'PL', 'US', 'CA']
    }
];