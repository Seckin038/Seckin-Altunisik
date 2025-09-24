import React, { useState } from 'react';
import { toast } from './ui/Toaster';

interface MassDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
}

export const MassDeleteModal: React.FC<MassDeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [step, setStep] = useState(1);
    const [pin, setPin] = useState('');

    const handleNextStep = () => {
        setStep(s => s + 1);
    };

    const handleConfirm = () => {
        if (pin.length !== 4) {
            toast.error("Pincode moet 4 cijfers zijn.");
            return;
        }
        onConfirm(pin);
    };
    
    const handleClose = () => {
        setStep(1);
        setPin('');
        onClose();
    }

    if (!isOpen) return null;
    
    const renderStepContent = () => {
        switch(step) {
            case 1:
                return {
                    title: 'Bevestiging (1/3)',
                    body: 'Weet je absoluut zeker dat je alle klantdata wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
                    button: <button onClick={handleNextStep} className="bg-red-600 text-white px-4 py-2 rounded-lg">Ja, ik weet het zeker</button>
                };
            case 2:
                return {
                    title: 'Bevestiging (2/3)',
                    body: 'Dit verwijdert ALLE klanten, streams, tijdlijn gebeurtenissen en cadeau-codes. Je begint met een schone lei.',
                    button: <button onClick={handleNextStep} className="bg-red-600 text-white px-4 py-2 rounded-lg">Ja, verwijder alles</button>
                };
            case 3:
                return {
                    title: 'Laatste Bevestiging (3/3)',
                    body: 'Dit is de laatste waarschuwing. Na het invoeren van je pincode is er geen weg terug.',
                    button: <button onClick={handleNextStep} className="bg-red-600 text-white px-4 py-2 rounded-lg">Ik begrijp het, ga verder</button>
                };
            case 4:
                return {
                    title: 'Voer Pincode in',
                    body: (
                        <div>
                            <p className="mb-4">Voer je 4-cijferige pincode in om de verwijdering te autoriseren.</p>
                             <input
                                type="password"
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                maxLength={4}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center text-lg tracking-[1rem]"
                                placeholder="****"
                             />
                        </div>
                    ),
                    button: <button onClick={handleConfirm} className="bg-red-800 text-white px-4 py-2 rounded-lg">VERWIJDER DATA PERMANENT</button>
                };
            default:
                return {};
        }
    }

    const { title, body, button } = renderStepContent();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-300">{title}</h2>
                <div className="text-gray-600 dark:text-gray-300 mb-6">
                    {body}
                </div>
                
                <div className="flex justify-end space-x-2">
                    <button onClick={handleClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200">
                        Annuleren
                    </button>
                    {button}
                </div>
            </div>
        </div>
    );
};