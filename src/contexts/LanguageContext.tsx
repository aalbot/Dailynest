import React, { createContext, useContext, useState, useEffect } from "react";
import firebase from "firebase/compat/app";
import "firebase/compat/database";
import localLanguages from "../config/languages.json";

interface LanguageContextType {
    translations: any;
    loading: boolean;
    locale: string;
    setLocale: (locale: string) => void;
    getTranslation: (path: string, params?: Record<string, string>, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [translations, setTranslations] = useState<any>(localLanguages);
    const [loading, setLoading] = useState(true);
    const [locale, setLocale] = useState(() => localStorage.getItem("portal_locale") || "en");

    useEffect(() => {
        localStorage.setItem("portal_locale", locale);
    }, [locale]);

    useEffect(() => {
        const db = firebase.database();
        const langRef = db.ref("root/language_config");

        // Listen for changes in Firebase
        const unsubscribe = langRef.on("value", (snapshot) => {
            let data = snapshot.val();
            if (data) {
                // If data is "flat" (e.g. has 'common' but not 'en'), wrap it
                if (!data.en && data.common) {
                    data = { en: data };
                }

                // deep merge local and firebase translations
                const mergeTranslations = (local: any, remote: any, isRoot = false) => {
                    const merged = isRoot ? {} : { ...remote };

                    if (isRoot) {
                        // Only pull in keys from remote that are either in local 
                        // or look like a language block (has common.languageName)
                        for (const key in remote) {
                            if (local[key] || (remote[key] && remote[key].common && remote[key].common.languageName)) {
                                merged[key] = remote[key];
                            }
                        }
                    }

                    for (const key in local) {
                        if (typeof local[key] === 'object' && local[key] !== null) {
                            merged[key] = mergeTranslations(local[key], merged[key] || {});
                        } else if (!merged[key]) {
                            merged[key] = local[key];
                        }
                    }
                    return merged;
                };
                setTranslations(mergeTranslations(localLanguages, data, true));
            } else {
                // If Firebase is empty, seed it with local data
                langRef.set(localLanguages);
                setTranslations(localLanguages);
            }
            setLoading(false);
        });

        return () => langRef.off("value", unsubscribe);
    }, []);

    const getTranslation = (path: string, params?: Record<string, string>, fallback?: string): string => {
        // Automatically prepend locale
        const fullPath = `${locale}.${path}`;
        const keys = fullPath.split(".");
        let current = translations;
        let found = true;

        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = current[key];
            } else {
                found = false;
                break;
            }
        }

        // If not found in current locale, try English
        if (!found && locale !== "en") {
            const enPath = `en.${path}`;
            const enKeys = enPath.split(".");
            let enCurrent = translations;
            let enFound = true;
            for (const enKey of enKeys) {
                if (enCurrent && typeof enCurrent === "object" && enKey in enCurrent) {
                    enCurrent = enCurrent[enKey];
                } else {
                    enFound = false;
                    break;
                }
            }
            if (enFound) {
                current = enCurrent;
                found = true;
            }
        }

        let finalResult = (found && typeof current === "string") ? current : (fallback || path);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                finalResult = finalResult.replace(`{${key}}`, value);
            });
        }

        return finalResult;
    };

    return (
        <LanguageContext.Provider value={{ translations, loading, locale, setLocale, getTranslation }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLang = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLang must be used within a LanguageProvider");
    }
    return context;
};
