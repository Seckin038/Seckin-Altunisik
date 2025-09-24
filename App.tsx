import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import type { AppSettings } from './types';
import { seedDatabase } from './data/seed';
import { MainLayout } from './components/MainLayout';
import { Toaster, toast } from './components/ui/Toaster';
import { Dashboard } from './components/Dashboard';
import { CustomerScreen } from './screens/CustomerScreen';
import { RewardsScreen } from './screens/RewardsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PinLockScreen } from './components/PinLockScreen';
import { PinSetupScreen } from './components/PinSetupScreen';


export type View = 'DASHBOARD' | 'CUSTOMERS' | 'REWARDS' | 'SETTINGS' | 'HISTORY';
export type NavigationParams = { [key: string]: any };
export type NavigationState = { view: View; params: NavigationParams };

const App: React.FC = () => {
    const [navState, setNavState] = useState<NavigationState>({ view: 'DASHBOARD', params: {} });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [appStatus, setAppStatus] = useState<'loading' | 'onboarding' | 'pin-setup' | 'locked' | 'ready'>('loading');

    const settings = useLiveQuery(() => db.settings.get('app'));

    useEffect(() => {
        const initialize = async () => {
            await seedDatabase();
            const currentSettings = await db.settings.get('app');
            if (!currentSettings) {
                // Should not happen if seed works
                setAppStatus('loading');
                return;
            }
            if (!currentSettings.supabaseUrl || !currentSettings.supabaseAnonKey) {
                setAppStatus('onboarding');
            } else if (currentSettings.pin_lock_enabled && !currentSettings.security_questions) {
                setAppStatus('pin-setup');
            } else if (currentSettings.pin_lock_enabled) {
                setAppStatus('locked');
            } else {
                setAppStatus('ready');
            }
        };
        initialize();
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const handleNavigate = useCallback((view: View, params: NavigationParams = {}) => {
        setNavState({ view, params });
    }, []);

    const handleUnlock = (pin: string): boolean => {
        if (settings && pin === settings.pin) {
            toast.success("Pincode correct!");
            setAppStatus('ready');
            return true;
        } else {
            toast.error("Incorrecte pincode.");
            return false;
        }
    };

    const handleOnboardingComplete = () => {
        setAppStatus('pin-setup');
    };
    
    const handlePinSetupComplete = async (pin: string, securityAnswers: { question: string; answer: string; }[]) => {
        await db.settings.update('app', { pin, security_questions: securityAnswers });
        toast.success("Pincode en beveiligingsvragen ingesteld!");
        setAppStatus('ready');
    };

    const renderContent = () => {
        switch (navState.view) {
            case 'DASHBOARD':
                return <Dashboard onNavigate={handleNavigate} />;
            case 'CUSTOMERS':
                return <CustomerScreen params={navState.params} onNavigate={handleNavigate} />;
            case 'REWARDS':
                return <RewardsScreen params={navState.params} onNavigate={handleNavigate} />;
            case 'SETTINGS':
                return settings ? <SettingsScreen settings={settings} /> : <div>Laden...</div>;
            case 'HISTORY':
                return <HistoryScreen onNavigate={handleNavigate} />;
            default:
                return <div>Pagina niet gevonden</div>;
        }
    };

    if (appStatus === 'loading') {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">Laden...</div>;
    }
    if (appStatus === 'onboarding') {
        return <OnboardingWizard onComplete={handleOnboardingComplete} />;
    }
    if (appStatus === 'pin-setup') {
        return <PinSetupScreen onComplete={handlePinSetupComplete} />;
    }
    if (appStatus === 'locked' && settings) {
        return <PinLockScreen onUnlock={handleUnlock} settings={settings} />;
    }
    
    return (
        <>
            <MainLayout
                navState={navState}
                onNavigate={handleNavigate}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                isDarkMode={isDarkMode}
                toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            >
                {renderContent()}
            </MainLayout>
            <Toaster />
        </>
    );
};

export default App;
