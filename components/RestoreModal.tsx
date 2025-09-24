import React, { useState } from 'react';
import { toast } from './ui/Toaster';

interface RestoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
}

export const RestoreModal: React.FC<RestoreModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [step, setStep] = useState(1);
    const [pin, setPin] = useState('');

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
                    title: 'Herstel Vanaf Cloud (Stap 1/2)',
                    body: 'Weet je zeker dat je wilt herstellen vanaf de cloud? Alle huidige lokale data op dit apparaat zal worden overschreven. Dit kan niet ongedaan worden gemaakt.',
                    button: <button onClick={() => setStep(2)} className="bg-yellow-600 text-white px-4 py-2 rounded-lg">Ja, ik begrijp de risico's</button>
                };
            case 2:
                return {
                    title: 'Voer Pincode in (Stap 2/2)',
                    body: (
                        <div>
                            <p className="mb-4">Voer je 4-cijferige pincode in om te bevestigen. Dit is de laatste stap.</p>
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
                    button: <button onClick={handleConfirm} className="bg-yellow-700 text-white px-4 py-2 rounded-lg">Bevestig & Herstel</button>
                };
            default:
                return {};
        }
    }

    const { title, body, button } = renderStepContent();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-yellow-700 dark:text-yellow-300">{title}</h2>
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
