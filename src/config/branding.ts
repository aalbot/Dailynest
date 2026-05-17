export interface BrandingConfig {
    appName: string;
    logoUrl: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
    appName: "DailyNest",
    logoUrl: "/logo.svg",
};

const LEGACY_APP_NAMES = new Set(["dailyclub", "daily club"]);

/** Maps cached/Firebase overrides from DailyClub era to DailyNest defaults. */
export function normalizeBranding(raw: Partial<BrandingConfig> | null | undefined): BrandingConfig {
    if (!raw) return DEFAULT_BRANDING;

    let appName = (raw.appName || DEFAULT_BRANDING.appName).trim();
    let logoUrl = (raw.logoUrl || DEFAULT_BRANDING.logoUrl).trim();

    if (LEGACY_APP_NAMES.has(appName.toLowerCase()) || appName === "DailyClub") {
        appName = DEFAULT_BRANDING.appName;
    }

    if (
        !logoUrl ||
        logoUrl.includes("logo.png") ||
        logoUrl.toLowerCase().includes("dailyclub") ||
        logoUrl.toLowerCase().includes("og-image")
    ) {
        logoUrl = DEFAULT_BRANDING.logoUrl;
    }

    return { appName, logoUrl };
}
