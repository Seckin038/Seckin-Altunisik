import React, { useState } from 'react';
import type { AppSettings } from '../types';
import { toast } from './ui/Toaster';
import { db } from '../lib/db';

interface PinLockScreenProps {
    onUnlock: (pin: string) => boolean;
    settings: AppSettings;
}

const SECURITY_QUESTIONS = [
    "Geboorteplaats",
    "Naam vader",
    "Naam moeder",
];

const PinRecovery: React.FC<{ settings: AppSettings; onBack: () => void; }> = ({ settings, onBack }) => {
    const [answers, setAnswers] = useState(['', '', '']);
    
    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handleVerify = async () => {
        const storedAnswers = settings.security_questions?.map(q => q.answer.toLowerCase().trim());
        if (!storedAnswers || storedAnswers.length === 0) {
            toast.error("Geen beveiligingsvragen ingesteld. Kan pincode niet herstellen.");
            return;
        }

        const providedAnswers = answers.map(a => a.toLowerCase().trim());

        if (JSON.stringify(storedAnswers) === JSON.stringify(providedAnswers)) {
            toast.success("Antwoorden correct! Pincode is hersteld naar 0000 en het inlogscherm is uitgeschakeld.", { duration: 5000 });
            // Reset PIN to default, clear security questions, and disable lock screen
            await db.settings.update('app', { pin: '0000', security_questions: undefined, pin_lock_enabled: false });
            // Reload the app to apply the new unlocked state cleanly
            setTimeout(() => window.location.reload(), 2000);
        } else {
            toast.error("Een of meer antwoorden zijn incorrect.");
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Pincode Herstellen</h2>
            <p className="text-sm text-center text-gray-500">Beantwoord de beveiligingsvragen om uw pincode opnieuw in te stellen.</p>
            {SECURITY_QUESTIONS.map((question, index) => (
                 <input
                    key={index}
                    type="text"
                    placeholder={question}
                    value={answers[index]}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                />
            ))}
            <div className="flex flex-col space-y-2">
                <button onClick={handleVerify} className="w-full bg-brand-600 text-white p-2 rounded-lg">Verifiëren</button>
                <button onClick={onBack} className="w-full bg-gray-200 dark:bg-gray-600 p-2 rounded-lg">Terug</button>
            </div>
        </div>
    );
};

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock, settings }) => {
    const [pin, setPin] = useState('');
    const [view, setView] = useState<'pin' | 'recovery'>('pin');

    const handleKeyPress = (key: string) => {
        if (pin.length < 4) {
            const newPin = pin + key;
            setPin(newPin);
            if (newPin.length === 4) {
                if (onUnlock(newPin)) {
                    // Success, parent will handle state
                } else {
                    // Shake animation on error
                    setTimeout(() => setPin(''), 500);
                }
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    if (view === 'recovery') {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="w-full max-w-xs bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                    <PinRecovery settings={settings} onBack={() => setView('pin')} />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-xs text-center">
                <h1 className="text-2xl font-bold mb-4">Voer Pincode in</h1>
                <div className="flex justify-center space-x-4 my-6">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-4 w-4 rounded-full border-2 ${pin.length > i ? 'bg-brand-500 border-brand-500' : 'border-gray-400'}`}></div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button key={num} onClick={() => handleKeyPress(String(num))} className="text-2xl p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                            {num}
                        </button>
                    ))}
                    <div />
                    <button onClick={() => handleKeyPress('0')} className="text-2xl p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                        0
                    </button>
                    <button onClick={handleDelete} className="text-2xl p-4 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                        ⌫
                    </button>
                </div>
                <button onClick={() => setView('recovery')} className="mt-6 text-sm text-brand-600 hover:underline">
                    Pincode vergeten?
                </button>
            </div>
        </div>
    );
};