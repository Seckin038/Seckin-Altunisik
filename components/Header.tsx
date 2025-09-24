import React from 'react';
import { SunIcon, MoonIcon, Bars3Icon } from './ui/Icons';
import type { View } from '../App';

interface HeaderProps {
    onMenuClick: () => void;
    currentViewTitle: string;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, currentViewTitle, isDarkMode, toggleDarkMode }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 shadow-md h-16 flex items-center justify-between px-4">
            <button
                onClick={onMenuClick}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Open menu"
            >
                <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">{currentViewTitle}</h1>
            <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
                {isDarkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
        </header>
    );
};
