import React, { useState } from 'react';
import { toast } from './ui/Toaster';

interface DeleteTestCustomersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
}

export const DeleteTestCustomersModal: React.FC<DeleteTestCustomersModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [pin, setPin] = useState('');

    const handleConfirm = () => {
        if (pin.length !== 4) {
            toast.error("Pincode moet 4 cijfers zijn.");
            return;
        }
        onConfirm(pin);
    };
    
    const handleClose = () => {
        setPin('');
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-orange-700 dark:text-orange-300">Verwijder Testklanten</h2>
                <div className="text-gray-600 dark:text-gray-300 mb-6 space-y-3">
                    <p>
                        Weet je zeker dat je alle testklanten en hun bijbehorende data wilt verwijderen? 
                    </p>
                    <p>
                        Deze actie zoekt naar alle klanten wiens naam begint met "Test " en verwijdert hen, inclusief al hun streams, betalingen, en tijdlijn-gebeurtenissen. Dit kan niet ongedaan worden gemaakt.
                    </p>
                    <div>
                        <p className="mb-2 font-semibold">Voer Pincode in om te Bevestigen</p>
                         <input
                            type="password"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            maxLength={4}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-center text-lg tracking-[1rem]"
                            placeholder="****"
                         />
                    </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                    <button onClick={handleClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200">
                        Annuleren
                    </button>
                    <button onClick={handleConfirm} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
                        Verwijder Testklanten
                    </button>
                </div>
            </div>
        </div>
    );
};
