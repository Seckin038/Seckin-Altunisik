import React, { useState } from 'react';
import { toast } from './ui/Toaster';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm }) => {
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
                <h2 className="text-xl font-bold mb-4 text-blue-700 dark:text-blue-300">Exporteer Data</h2>
                <div className="text-gray-600 dark:text-gray-300 mb-6 space-y-3">
                    <p>
                        Dit zal een back-up bestand (.json) genereren van al uw huidige lokale data. U kunt dit bestand opslaan op een veilige plek zoals Dropbox of een USB-stick.
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
                    <button onClick={handleConfirm} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Download Back-up
                    </button>
                </div>
            </div>
        </div>
    );
};
