import React, { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(
        () => localStorage.getItem('healthora_lang') || 'english'
    );

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => {
            const next = prev === 'english' ? 'telugu' : 'english';
            localStorage.setItem('healthora_lang', next);
            return next;
        });
    }, []);

    const setLang = useCallback((lang) => {
        setLanguage(lang);
        localStorage.setItem('healthora_lang', lang);
    }, []);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, setLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
    return ctx;
};

export default LanguageContext;
