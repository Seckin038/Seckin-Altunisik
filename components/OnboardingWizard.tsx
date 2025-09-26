
import React, { useState } from 'react';
import { db } from '../lib/db';
import { toast } from './ui/Toaster';
// FIX: Corrected import path for types.
import type { AppSettings } from '../types';

interface OnboardingWizardProps {
    onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

    const handleSave = async () => {
        if (!supabaseUrl || !supabaseAnonKey) {
            toast.error("Beide velden zijn verplicht.");
            return;
        }

        try {
            await db.settings.where('id').equals('app').modify({
                supabaseUrl,
                supabaseAnonKey,
            });
            toast.success("Instellingen opgeslagen!");
            onComplete();
        } catch (error) {
            toast.error("Kon instellingen niet opslaan.");
            console.error(error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-lg space-y-6">
                <h1 className="text-2xl font-bold text-center">Welkom bij FLManager!</h1>
                <p className="text-center text-gray-600 dark:text-gray-300">
                    Om te beginnen, configureer je Cloud Synchronisatie. Dit is nodig om je data veilig te stellen en te synchroniseren.
                    Je hebt hiervoor een Supabase project nodig.
                </p>
                
                <div className="space-y-4">
                    <div>
                        <InputField 
                            label="Supabase URL" 
                            value={supabaseUrl} 
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            placeholder="https://your-project-ref.supabase.co"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">Moet eindigen op .supabase.co (niet .functions.supabase.co)</p>
                    </div>
                    <InputField 
                        label="Supabase Anon Key" 
                        value={supabaseAnonKey} 
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                    />
                </div>
                
                <div className="flex justify-end">
                     <button onClick={handleSave} className="bg-brand-600 text-white px-6 py-2 rounded-lg w-full">
                        Opslaan en Doorgaan
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
    </div>
);