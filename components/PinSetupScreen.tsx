import React, { useState } from 'react';
import { toast } from './ui/Toaster';

interface PinSetupScreenProps {
    onComplete: (pin: string, securityAnswers: { question: string; answer: string; }[]) => void;
}

const SECURITY_QUESTIONS = [
    { key: 'geboorteplaats', question: 'Geboorteplaats', answer: 'Zwolle' },
    { key: 'vader', question: 'Naam vader', answer: 'Isa' },
    { key: 'moeder', question: 'Naam moeder', answer: 'Turkan' },
];

export const PinSetupScreen: React.FC<PinSetupScreenProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [securityAnswers, setSecurityAnswers] = useState({
        geboorteplaats: '',
        vader: '',
        moeder: '',
    });

    const handlePinSubmit = () => {
        if (pin.length !== 4) {
            toast.error("Pincode moet 4 cijfers zijn.");
            return;
        }
        setStep(2);
    };

    const handleConfirmPinSubmit = () => {
        if (pin !== confirmPin) {
            toast.error("Pincodes komen niet overeen.");
            setPin('');
            setConfirmPin('');
            setStep(1);
            return;
        }
        setStep(3);
    };
    
    const handleAnswersSubmit = () => {
        const answersArray = Object.values(securityAnswers);
        // FIX: Cast `a` to string to resolve type error where it is inferred as `unknown`.
        if (answersArray.some(a => !(a as string).trim())) {
            toast.error("Alle antwoorden zijn verplicht.");
            return;
        }
        const formattedAnswers = SECURITY_QUESTIONS.map(q => ({
            question: q.question,
            answer: securityAnswers[q.key as keyof typeof securityAnswers].trim()
        }));

        onComplete(pin, formattedAnswers);
    };

    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Stel uw 4-cijferige pincode in</h2>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            maxLength={4}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center text-lg tracking-[1rem]"
                            placeholder="****"
                        />
                        <button onClick={handlePinSubmit} className="w-full bg-brand-600 text-white p-2 rounded-lg">Volgende</button>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Bevestig uw pincode</h2>
                        <input
                            type="password"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            maxLength={4}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center text-lg tracking-[1rem]"
                            placeholder="****"
                        />
                        <button onClick={handleConfirmPinSubmit} className="w-full bg-brand-600 text-white p-2 rounded-lg">Bevestigen</button>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Stel Beveiligingsvragen in</h2>
                        <p className="text-sm text-gray-500">Deze worden gebruikt om uw pincode te herstellen als u deze vergeet.</p>
                        {SECURITY_QUESTIONS.map(q => (
                             <input
                                key={q.key}
                                type="text"
                                placeholder={q.question}
                                value={securityAnswers[q.key as keyof typeof securityAnswers]}
                                onChange={e => setSecurityAnswers(a => ({...a, [q.key]: e.target.value}))}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                            />
                        ))}
                        <button onClick={handleAnswersSubmit} className="w-full bg-green-600 text-white p-2 rounded-lg">Opslaan & Starten</button>
                    </div>
                );
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-sm">
                <h1 className="text-2xl font-bold text-center mb-6">Welkom bij FLManager</h1>
                {renderStep()}
            </div>
        </div>
    );
};