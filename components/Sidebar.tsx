import React from 'react';
import type { View, NavigationState, NavigationParams } from '../App';
import { HomeIcon, UsersIcon, GiftIcon, CogIcon, XMarkIcon } from './ui/Icons';
import { classNames } from '../lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    navState: NavigationState;
    onNavigate: (view: View, params?: NavigationParams) => void;
}

const NavItem: React.FC<{
    view: View;
    label: string;
    icon: React.ReactNode;
    currentView: View;
    onClick: () => void;
}> = ({ view, label, icon, currentView, onClick }) => {
    const isActive = currentView === view;
    return (
        <li>
            <button
                onClick={onClick}
                className={classNames(
                    'flex items-center w-full p-3 text-base font-normal rounded-lg transition-colors duration-200',
                    isActive 
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300' 
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
            >
                {icon}
                <span className="ml-3">{label}</span>
            </button>
        </li>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, navState, onNavigate }) => {
    
    const handleNavigate = (view: View, params: NavigationParams = {}) => {
        onNavigate(view, params);
        onClose();
    };

    return (
        <>
            <div 
                className={classNames(
                    "fixed inset-0 z-30 bg-black transition-opacity duration-300",
                    isOpen ? "opacity-50" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
                aria-hidden="true"
            ></div>
            <aside
                className={classNames(
                    "fixed top-0 left-0 z-40 w-64 h-screen transition-transform duration-300 ease-in-out bg-white dark:bg-gray-800",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold">FLManager</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="Close menu"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <nav className="p-4">
                    <ul className="space-y-2">
                         <NavItem
                            view="DASHBOARD"
                            label="Dashboard"
                            icon={<HomeIcon className="h-6 w-6" />}
                            currentView={navState.view}
                            onClick={() => handleNavigate('DASHBOARD')}
                        />
                        <NavItem
                            view="CUSTOMERS"
                            label="Klanten"
                            icon={<UsersIcon className="h-6 w-6" />}
                            currentView={navState.view}
                            onClick={() => handleNavigate('CUSTOMERS')}
                        />
                        <NavItem
                            view="REWARDS"
                            label="Werving"
                            icon={<GiftIcon className="h-6 w-6" />}
                            currentView={navState.view}
                            onClick={() => handleNavigate('REWARDS')}
                        />
                        <NavItem
                            view="SETTINGS"
                            label="Instellingen"
                            icon={<CogIcon className="h-6 w-6" />}
                            currentView={navState.view}
                            onClick={() => handleNavigate('SETTINGS')}
                        />
                    </ul>
                </nav>
            </aside>
        </>
    );
};
