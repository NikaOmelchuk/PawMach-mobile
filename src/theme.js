import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';

const lightColors = {
    background: '#f4f4f9',
    card: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    primary: '#7c3aed',
    border: '#e5e7eb',
    accent: '#a78bfa',
    buttonText: '#ffffff'
};

const darkColors = {
    background: '#0f0a1e',
    card: '#1a1035',
    text: '#e2d9fc',
    textSecondary: '#8b8bad',
    primary: '#7c3aed',
    border: '#2d1f5e',
    accent: '#a78bfa',
    buttonText: '#ffffff'
};

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [theme, setTheme] = useState(systemScheme === 'dark' ? 'dark' : 'light');

    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setTheme(colorScheme === 'dark' ? 'dark' : 'light');
        });
        return () => subscription.remove();
    }, []);

    const colors = theme === 'dark' ? darkColors : lightColors;

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
