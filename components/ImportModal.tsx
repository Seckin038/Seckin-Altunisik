import React, { useState, useRef } from 'react';
import { toast } from './ui/Toaster';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string, file: File) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [pin, setPin] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleConfirm = () => {
        if (!file) {
            toast.error("Selecteer een back-up bestand.");
            return;
        }
        if (pin.length !== 4) {
            toast.error("Pincode moet 4 cijfers zijn.");
            return;
        }
        onConfirm(pin, file);
    };
    
    const handleClose = () => {
        setPin('');
        setFile(null);
        onClose();
    }
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-200">Importeer Data</h2>
                <div className="text-gray-600 dark:text-gray-300 mb-6 space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/50 dark:border-red-800">
                        <p className="font-bold text-red-700 dark:text-red-200">WAARSCHUWING</p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            Deze actie zal alle huidige data in de app permanent overschrijven met de data uit het back-up bestand. Dit kan niet ongedaan worden gemaakt.
                        </p>
                    </div>
                     <div>
                        <p className="mb-2 font-semibold">Selecteer Back-up Bestand (.json)</p>
                         <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 cursor-pointer dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                         />
                    </div>
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
                    <button onClick={handleConfirm} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900">
                        Importeer & Overschrijf
                    </button>
                </div>
            </div>
        </div>
    );
};
