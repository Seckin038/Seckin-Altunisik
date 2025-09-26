import React from 'react';
import type { View, NavigationState, NavigationParams } from '../App';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
    children: React.ReactNode;
    navState: NavigationState;
    onNavigate: (view: View, params?: NavigationParams) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const VIEW_TITLES: Record<View, string> = {
    DASHBOARD: 'Dashboard',
    CUSTOMERS: 'Klantenbeheer',
    REWARDS: 'Werving & Beloningen',
    SETTINGS: 'Instellingen',
    HISTORY: 'Geschiedenis'
};

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    navState,
    onNavigate,
    isSidebarOpen,
    setIsSidebarOpen,
    isDarkMode,
    toggleDarkMode,
}) => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Header
                onMenuClick={() => setIsSidebarOpen(true)}
                currentViewTitle={VIEW_TITLES[navState.view]}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
            />
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                navState={navState}
                onNavigate={onNavigate}
            />
            <main 
                className="px-4 pb-20 md:pb-4 md:pl-4"
                style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}
            >
                {children}
            </main>
        </div>
    );
};