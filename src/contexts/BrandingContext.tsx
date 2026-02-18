import React, { createContext, useContext, useEffect, useState } from 'react';
import { firebase } from '@/lib/firebase';
import { CONFIG } from '@/config';

interface BrandingConfig {
    appName: string;
    logoUrl: string;
}

interface BrandingContextType {
    config: BrandingConfig;
    updateBranding: (newConfig: BrandingConfig) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<BrandingConfig>(CONFIG.BRANDING);

    useEffect(() => {
        const db = firebase.database();
        const brandingRef = db.ref('root/infra/branding');

        const handleData = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                setConfig({
                    appName: data.appName || CONFIG.BRANDING.appName,
                    logoUrl: data.logoUrl || CONFIG.BRANDING.logoUrl,
                });
            }
        };

        brandingRef.on('value', handleData);

        return () => {
            brandingRef.off('value', handleData);
        };
    }, []);

    // Effect to update document title, favicon, and meta tags
    useEffect(() => {
        document.title = config.appName;

        // Update favicon if logoUrl is provided
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        if (link) {
            link.href = config.logoUrl;
        }

        // Update meta tags
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) metaDescription.setAttribute("content", `${config.appName} Admin Dashboard`);

        const metaAuthor = document.querySelector('meta[name="author"]');
        if (metaAuthor) metaAuthor.setAttribute("content", config.appName);

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", `${config.appName} Admin Dashboard`);
    }, [config]);

    const updateBranding = async (newConfig: BrandingConfig) => {
        try {
            await firebase.database().ref('root/infra/branding').set(newConfig);
        } catch (error) {
            console.error("Failed to update branding:", error);
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
