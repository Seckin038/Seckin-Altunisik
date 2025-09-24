
export type SubscriptionStatus = 'ACTIVE' | 'TEST' | 'EXPIRED' | 'BLOCKED';
export type PaymentMethod = 'Tikkie' | 'Contant' | 'Gratis' | 'Vrienden prijs';
export type GiftCodeReason = 'Promotie' | 'Compensatie' | 'Social' | 'Wervingsbeloning' | 'Anders';

export interface Customer {
    id: string; // generated
    name: string;
    phone?: string;
    notes?: string;
    referrer_id?: string;
    created_at: number; // timestamp
    updated_at: number; // timestamp
}

export interface Subscription {
    id: string; // generated
    customer_id: string;
    label: string;
    status: SubscriptionStatus;
    start_at: number; // timestamp
    end_at: number; // timestamp
    paid: boolean;
    free: boolean;
    erotiek: boolean;
    countries: string[]; // array of country codes
    payment_method: PaymentMethod;
    mac?: string;
    app_code?: string;
    m3u_url?: string;
    created_at: number; // timestamp
    updated_at: number; // timestamp
}

export interface AppSettings {
    id: 'app';
    test_hours: number;
    year_days: number;
    reward_milestones: number[];
    price_standard: number;
    price_vrienden: number;
    price_erotiek_addon: number;
    referral_reset_years: number;
    pin: string;
    pin_lock_enabled: boolean;
    security_questions?: { question: string; answer: string; }[];
    supabaseUrl: string;
    supabaseAnonKey: string;
    last_sync?: number;
}

export interface WhatsappTemplate {
    id: string;
    name: string;
    message: string;
}

export interface CountryTemplate {
    id: string;
    name: string;
    countryCodes: string[];
}

export type TimelineEventType = 'CUSTOMER_CREATED' | 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_RENEWED' | 'SUBSCRIPTION_MODIFIED' | 'SUBSCRIPTION_DELETED' | 'SUBSCRIPTION_STATUS_CHANGED' | 'REWARD_YEAR_APPLIED' | 'REWARD_GIFT_CODE_GENERATED' | 'NOTE_ADDED';

export interface TimelineEvent {
    id: string;
    customer_id: string;
    timestamp: number;
    type: TimelineEventType;
    message: string;
    meta?: any;
}

export interface GiftCode {
    id: string; // The code itself, e.g., FLM-XXXX-XXXX-XXXX
    created_at: number;
    expires_at: number;
    reason: GiftCodeReason;
    note?: string;
    referrer_id?: string; // Who earned this code
    milestone?: number; // Which milestone earned this code
    receiver_id?: string; // Who this code is intended for (optional)
    used_at?: number;
    used_by_customer_id?: string;
    used_for_subscription_id?: string;
}

export interface WhatsappLog {
    id: string;
    customer_id: string;
    timestamp: number;
    message: string;
    template_name?: string;
}

export interface Payment {
    id: string;
    customer_id: string;
    subscription_id: string;
    amount: number;
    payment_date: number;
    payment_method: PaymentMethod | 'Tikkie' | 'Contant';
    notes?: string;
}

export interface Country {
    code: string;
    name: string;
}
