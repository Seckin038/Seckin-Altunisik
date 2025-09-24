import React from 'react';

// FIX: Replaced corrupted file content with a valid React component structure.
// This appears to be an old or unused component.
// The logic for choosing a reward is handled within RewardClaimWizard.
// This file is created to resolve potential build errors.

interface RewardChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (choice: 'SELF' | 'GIFT_CUSTOMER' | 'GIFT_CODE') => void;
}

export const RewardChoiceModal: React.FC<RewardChoiceModalProps> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Kies Beloning</h2>
                <p>Beloning keuze is nu onderdeel van de Reward Claim Wizard.</p>
                <button onClick={onClose} className="mt-4 bg-gray-200 px-4 py-2 rounded-lg">Sluiten</button>
            </div>
        </div>
    );
};