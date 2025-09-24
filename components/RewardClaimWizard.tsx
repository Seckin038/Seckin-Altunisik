import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Customer, Subscription, GiftCode, WhatsappTemplate } from '../types';
import { ClaimableMilestone } from '../lib/rewards';
// FIX: Corrected import path for data-mutations.
import { addGiftCode } from '../lib/data-mutations';
import { toast } from './ui/Toaster';
// FIX: Corrected import path for timeline functions.
import { logTimelineEvent, logWhatsappMessage } from '../lib/timeline';
// FIX: Corrected import path for utils.
import { computeRenewalDate, generateGiftCodeString } from '../lib/utils';
// FIX: Corrected import path for whatsappRenderer.
import { renderWhatsappTemplate } from '../lib/whatsappRenderer';

interface RewardClaimWizardProps {
    customer: Customer;
    milestone: ClaimableMilestone;
    onClose: () => void;
}

type RewardChoice = 'SELF' | 'GIFT_CODE';

export const RewardClaimWizard: React.FC<RewardClaimWizardProps> = ({ customer, milestone, onClose }) => {
    const [step, setStep] = useState(1);
    const [choice, setChoice] = useState<RewardChoice | null>(null);
    const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string>('');
    const [finalMessage, setFinalMessage] = useState('');

    const settings = useLiveQuery(() => db.settings.get('app'));
    const subscriptions = useLiveQuery(() => db.subscriptions.where({ customer_id: customer.id, status: 'ACTIVE' }).toArray(), [customer.id]);
    const templates = useLiveQuery(() => db.whatsappTemplates.toArray());

    useEffect(() => {
        // For milestone 5, there is no choice.
        if (milestone.milestone === 5) {
            setChoice('SELF');
            setStep(2);
        }
    }, [milestone]);
    
    const handleApplyToSelf = async () => {
        if (!selectedSubscriptionId || !settings || !templates) {
            toast.error("Selecteer een stream en zorg dat instellingen geladen zijn.");
            return;
        }

        const toastId = toast.loading("Beloning verwerken...");
        try {
            await db.transaction('rw', db.subscriptions, db.timeline, async () => {
                const sub = await db.subscriptions.get(selectedSubscriptionId);
                if (!sub) throw new Error("Abonnement niet gevonden.");

                const newEndDate = computeRenewalDate(sub.end_at, settings);
                await db.subscriptions.update(selectedSubscriptionId, {
                    end_at: newEndDate,
                    updated_at: Date.now()
                });
                
                await logTimelineEvent({
                    customer_id: customer.id,
                    type: 'REWARD_YEAR_APPLIED',
                    message: `Beloning voor mijlpaal ${milestone.milestone} toegepast: 1 jaar gratis voor stream ${sub.label}.`,
                    meta: { milestone: milestone.milestone, subscriptionId: sub.id }
                });
            });

            // Generate and log WhatsApp message
            const template = templates.find(t => t.name === 'F4. Werving Beloning (Zelf)');
            if (template) {
                 // FIX: Removed extra `undefined` argument to match function signature.
                 const message = renderWhatsappTemplate(
                    template.message,
                    customer,
                    settings,
                    undefined,
                    { milestone: String(milestone.milestone) }
                );
                await logWhatsappMessage(customer.id, message, template.name);
                setFinalMessage(message);
                setStep(3); // Go to final message step
            } else {
                 setFinalMessage("Kon WhatsApp-bericht niet genereren. Sjabloon F4 niet gevonden.");
                 setStep(3);
            }
            
            toast.success("Beloning succesvol toegepast!", { id: toastId });
        } catch (error: any) {
            toast.error(error.message || "Kon beloning niet toepassen.", { id: toastId });
        }
    };
    
    const handleGenerateGiftCode = async () => {
        if (!settings || !templates) {
            toast.error("Instellingen of sjablonen niet geladen.");
            return;
        }

        const toastId = toast.loading("Cadeaucode genereren...");
        try {
            const newCodeData: Omit<GiftCode, 'created_at' | 'id'> = {
                reason: 'Wervingsbeloning',
                note: `Verdiend door ${customer.name} voor mijlpaal ${milestone.milestone}`,
                referrer_id: customer.id,
                milestone: milestone.milestone,
                expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000,
            };
            const newCode = await addGiftCode({ id: generateGiftCodeString(), ...newCodeData });
            
            await logTimelineEvent({
                customer_id: customer.id,
                type: 'REWARD_GIFT_CODE_GENERATED',
                message: `Beloning voor mijlpaal ${milestone.milestone} geclaimd: cadeaucode ${newCode.id} gegenereerd.`,
                meta: { milestone: milestone.milestone, giftCodeId: newCode.id }
            });

            // Generate and log WhatsApp message
             const template = templates.find(t => t.name === 'F5. Werving Beloning (Code)');
             if (template) {
                // FIX: Removed extra `undefined` argument to match function signature.
                const message = renderWhatsappTemplate(
                    template.message,
                    customer,
                    settings,
                    undefined,
                    { milestone: String(milestone.milestone), gift_code: newCode.id }
                );
                await logWhatsappMessage(customer.id, message, template.name);
                setFinalMessage(message);
                setStep(3); // Go to final message step
            } else {
                 setFinalMessage(`Cadeaucode: ${newCode.id}. Kon WhatsApp-bericht niet genereren.`);
                 setStep(3);
            }

            toast.success(`Cadeaucode ${newCode.id} aangemaakt!`, { id: toastId });
        } catch (error: any) {
             toast.error(error.message || "Kon cadeaucode niet genereren.", { id: toastId });
        }
    };

    const handleCopyAndClose = () => {
        navigator.clipboard.writeText(finalMessage);
        toast.success("Bericht gekopieerd!");
        onClose();
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <RewardOption
                            title="Verleng Eigen Stream"
                            description="Voeg een gratis jaar toe aan een van je eigen actieve streams."
                            onClick={() => { setChoice('SELF'); setStep(2); }}
                        />
                        <RewardOption
                            title="Genereer Cadeaucode"
                            description="Maak een cadeaucode voor een gratis jaar die je aan iemand anders kunt geven."
                            onClick={() => { setChoice('GIFT_CODE'); setStep(2); }}
                        />
                    </div>
                );
            case 2:
                if (choice === 'SELF') {
                    return (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Stap 2: Kies stream om te verlengen</h3>
                            <select
                                value={selectedSubscriptionId}
                                onChange={e => setSelectedSubscriptionId(e.target.value)}
                                className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="">-- Selecteer een stream --</option>
                                {subscriptions?.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.label}</option>
                                ))}
                            </select>
                            <button onClick={handleApplyToSelf} className="w-full bg-green-600 text-white p-2 rounded-lg" disabled={!selectedSubscriptionId}>
                                Bevestig & Verleng
                            </button>
                        </div>
                    );
                }
                if (choice === 'GIFT_CODE') {
                    return (
                         <div className="space-y-4">
                            <h3 className="font-semibold">Stap 2: Genereer Cadeaucode</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Klik hieronder om een unieke cadeaucode voor 1 jaar te genereren. Deze actie kan niet ongedaan worden gemaakt.
                            </p>
                            <button onClick={handleGenerateGiftCode} className="w-full bg-green-600 text-white p-2 rounded-lg">
                                Bevestig & Genereer Code
                            </button>
                        </div>
                    );
                }
                return null;
            case 3:
                 return (
                    <div className="space-y-4">
                        <h3 className="font-semibold">Stap 3: Stuur Bericht & Voltooi</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">De beloning is verwerkt. Kopieer het onderstaande bericht en stuur het naar de klant.</p>
                        <textarea
                            readOnly
                            value={finalMessage}
                            rows={10}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 font-mono text-xs"
                        />
                        <button onClick={handleCopyAndClose} className="w-full bg-brand-600 text-white p-2 rounded-lg">
                            Kopieer Bericht & Sluit
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Claim Beloning: Mijlpaal {milestone.milestone}</h2>
                    <button onClick={onClose} className="text-2xl font-bold leading-none p-1">&times;</button>
                </div>
                {renderStepContent()}
            </div>
        </div>
    );
};

const RewardOption: React.FC<{ title: string; description: string; onClick: () => void }> = ({ title, description, onClick }) => (
    <button
        onClick={onClick}
        className="w-full text-left p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 transition-colors"
    >
        <h4 className="font-bold text-brand-600">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
    </button>
);