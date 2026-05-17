import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebase } from '@/lib/firebase';
import { CONFIG } from '@/config';
import { DEFAULT_BRANDING, normalizeBranding, type BrandingConfig } from '@/config/branding';

interface BrandingContextType {
    config: BrandingConfig;
    updateBranding: (newConfig: BrandingConfig) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<BrandingConfig>(normalizeBranding(CONFIG.BRANDING));

    useEffect(() => {
        const db = firebase.database();
        const brandingRef = db.ref('root/infra/branding');

        const handleData = (snapshot: { val: () => Partial<BrandingConfig> | null }) => {
            const data = snapshot.val();
            if (data) {
                setConfig(normalizeBranding(data));
            } else {
                setConfig(DEFAULT_BRANDING);
            }
        };

        brandingRef.on('value', handleData);

        return () => {
            brandingRef.off('value', handleData);
        };
    }, []);

    useEffect(() => {
        const title = config.appName === 'DailyNest'
            ? 'DailyNest Admin Dashboard'
            : `${config.appName} Admin Dashboard`;
        document.title = title;

        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (link) {
            link.href = config.logoUrl;
            link.type = config.logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
        }

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) metaDescription.setAttribute('content', `${config.appName} Admin Dashboard`);

        const metaAuthor = document.querySelector('meta[name="author"]');
        if (metaAuthor) metaAuthor.setAttribute('content', config.appName);

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', title);
    }, [config]);

    const updateBranding = async (newConfig: BrandingConfig) => {
        try {
            const normalized = normalizeBranding(newConfig);
            await firebase.database().ref('root/infra/branding').set(normalized);
            setConfig(normalized);
        } catch (error) {
            console.error('Failed to update branding:', error);
            throw error;
        }
    };

    return (
        <BrandingContext.Provider value={{ config, updateBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
