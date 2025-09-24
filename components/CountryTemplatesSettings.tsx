import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
// FIX: Corrected import path.
import type { CountryTemplate } from '../types';
import { generateId } from '../lib/utils';
import { toast } from './ui/Toaster';
// FIX: Corrected icon imports.
import { PlusIcon, TrashIcon } from './ui/Icons';
import { CountrySelector } from './CountrySelector';

export const CountryTemplatesSettings: React.FC = () => {
    const templates = useLiveQuery(() => db.countryTemplates.toArray());
    const [editingTemplate, setEditingTemplate] = useState<Partial<CountryTemplate>>({});
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async () => {
        if (!editingTemplate.name || !editingTemplate.countryCodes || editingTemplate.countryCodes.length === 0) {
            toast.error("Naam en minimaal één land zijn verplicht.");
            return;
        }

        try {
            if (editingTemplate.id) {
                await db.countryTemplates.update(editingTemplate.id, editingTemplate);
                toast.success("Sjabloon bijgewerkt!");
            } else {
                await db.countryTemplates.add({ ...editingTemplate, id: generateId() } as CountryTemplate);
                toast.success("Sjabloon aangemaakt!");
            }
            setIsEditing(false);
            setEditingTemplate({});
        } catch (error) {
            toast.error("Kon sjabloon niet opslaan.");
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Weet je zeker dat je dit sjabloon wilt verwijderen?")) {
            await db.countryTemplates.delete(id);
            toast.success("Sjabloon verwijderd.");
        }
    };
    
    const handleEdit = (template: CountryTemplate) => {
        setEditingTemplate(template);
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setEditingTemplate({ name: '', countryCodes: [] });
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
                <h3 className="text-lg font-semibold">{editingTemplate.id ? 'Sjabloon Bewerken' : 'Nieuw Sjabloon'}</h3>
                <InputField
                    label="Naam"
                    value={editingTemplate.name || ''}
                    onChange={e => setEditingTemplate(t => ({ ...t, name: e.target.value }))}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Landen</label>
                    <CountrySelector 
                        selectedCountries={editingTemplate.countryCodes || []} 
                        onChange={codes => setEditingTemplate(t => ({...t, countryCodes: codes}))}
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button onClick={() => { setIsEditing(false); setEditingTemplate({}); }} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg">Annuleren</button>
                    <button onClick={handleSave} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Opslaan</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Landen Sjablonen</h2>
                <button onClick={handleAddNew} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 hover:bg-brand-700">
                    <PlusIcon className="h-5 w-5" />
                    <span>Nieuw</span>
                </button>
            </div>
            <ul className="space-y-2">
                {templates?.map(template => (
                    <li key={template.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <span>{template.name}</span>
                        <div className="space-x-4">
                            <button onClick={() => handleEdit(template)} className="font-medium text-brand-600">Wijzig</button>
                            <button onClick={() => handleDelete(template.id)} className="font-medium text-red-600"><TrashIcon className="h-4 w-4 inline"/></button>
                        </div>
                    </li>
                ))}
                 {(!templates || templates.length === 0) && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Geen sjablonen gevonden.</p>
                )}
            </ul>
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <input {...props} id={props.id || props.name} className="mt-1 block w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600" />
    </div>
);