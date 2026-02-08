import languages from "../config/languages.json";

type LanguageConfig = typeof languages;

/**
 * Utility to get translated strings.
 * For now, it just returns the values from languages.json.
 * Defaults to the keys if the path is not found.
 */
export const getLang = (path: string): string => {
    const keys = path.split(".");
    let current: any = languages;

    for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
            current = current[key];
        } else {
            console.warn(`[Lang] Path not found: ${path}`);
            return path;
        }
    }

    return typeof current === "string" ? current : path;
};

export const i18n = languages;
