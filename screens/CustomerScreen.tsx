import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { View, NavigationParams } from '../App';
import { db } from '../lib/db';
// FIX: Corrected import path for types.
import type { Customer } from '../types';
import { CustomerList } from '../components/CustomerList';
import { CustomerDetail } from '../components/CustomerDetail';
import { NewCustomerWizard } from '../components/NewCustomerWizard';

interface CustomerScreenProps {
    params: NavigationParams;
    onNavigate: (view: View, params?: NavigationParams) => void;
}

export const CustomerScreen: React.FC<CustomerScreenProps> = ({ params, onNavigate }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(params.customerId || null);
    const [isAddingNew, setIsAddingNew] = useState(false);

    useEffect(() => {
        setSelectedCustomerId(params.customerId || null);
    }, [params.customerId]);

    const handleSelectCustomer = (customerId: string) => {
        onNavigate('CUSTOMERS', { customerId });
    };
    
    const handleAddNewCustomer = () => {
        setSelectedCustomerId(null);
        setIsAddingNew(true);
    };

    const handleBackToList = () => {
        onNavigate('CUSTOMERS', {});
    };
    
    const handleWizardFinish = (newCustomerId: string) => {
        setIsAddingNew(false);
        // FIX: Navigate to customer detail and automatically open whatsapp tab for a smoother workflow.
        onNavigate('CUSTOMERS', { customerId: newCustomerId, tab: 'whatsapp' });
    };

    const handleClearFilters = () => {
        onNavigate('CUSTOMERS', {});
    };

    const selectedCustomer = useLiveQuery(
        () => selectedCustomerId ? db.customers.get(selectedCustomerId) : undefined,
        [selectedCustomerId]
    );

    if (isAddingNew) {
        return <NewCustomerWizard onFinish={handleWizardFinish} onCancel={() => setIsAddingNew(false)} />;
    }
    
    if (selectedCustomerId && selectedCustomer) {
        return <CustomerDetail customer={selectedCustomer} onBack={handleBackToList} onNavigate={onNavigate} params={params} />;
    }
    
    return (
        <CustomerList 
            onSelectCustomer={handleSelectCustomer}
            onAddNewCustomer={handleAddNewCustomer}
            filters={params}
            onClearFilters={handleClearFilters}
        />
    );
};