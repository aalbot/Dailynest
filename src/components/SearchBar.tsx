import { Search, Command } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLang } from "@/contexts/LanguageContext";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    variant?: "default" | "blended" | "navbar";
    /** Focus input on mount (e.g. mobile search sheet opened). */
    autoFocus?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

const SearchBar = ({
    value,
    onChange,
    className = "",
    variant = "default",
    autoFocus = false,
    onFocus,
    onBlur,
}: SearchBarProps) => {
    const { getTranslation } = useLang();
    const inputRef = useRef<HTMLInputElement>(null);

    const isBlended = variant === "blended";
    const isNavbar = variant === "navbar";

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [autoFocus]);

    if (isNavbar) {
        return (
            <div className={`relative w-full ${className}`}>
                {/* Match navbar: background / border / muted chrome (same tokens as nav actions). */}
                <div
                    className="group relative flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/50 pl-2.5 pr-2 shadow-sm backdrop-blur-sm transition-colors focus-within:border-ring/60 focus-within:bg-muted/70 focus-within:ring-2 focus-within:ring-ring/30 sm:gap-2.5 sm:pl-3 sm:pr-2.5 dark:bg-muted/35 dark:focus-within:bg-muted/50"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-focus-within:text-foreground">
                        <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                    </span>
                    <input
                        ref={inputRef}
                        type="search"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        placeholder={getTranslation("searchBar.placeholder")}
                        autoComplete="off"
                        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                        aria-label={getTranslation("searchBar.placeholder")}
                        aria-autocomplete="list"
                    />
                    <span className="hidden shrink-0 items-center gap-1 rounded-md border border-border bg-background/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
                        <Command className="h-3 w-3 opacity-70" aria-hidden />
                        {getTranslation("searchBar.label")}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative w-full group ${isBlended ? "" : "max-w-2xl mx-auto"} ${className}`}>
            {!isBlended && (
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur transition duration-1000 group-hover:opacity-40 group-focus-within:duration-200 group-focus-within:opacity-35 dark:opacity-30 dark:group-hover:opacity-50 dark:group-focus-within:opacity-45" />
            )}

            <div
                className={`relative flex items-center gap-4 transition-all duration-300 ${
                    isBlended
                        ? "rounded-2xl border border-slate-200/70 bg-slate-100/60 px-4 py-2.5 shadow-sm backdrop-blur-md dark:border-slate-600/40 dark:bg-slate-900/75 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "rounded-2xl border border-white/40 bg-white/80 px-6 py-4 shadow-xl backdrop-blur-2xl dark:border-slate-600/35 dark:bg-slate-900/90 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)]"
                }`}
            >
                <div
                    className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 dark:from-indigo-400/18 dark:to-purple-400/12 dark:text-indigo-300 ${
                        isBlended ? "h-8 w-8" : "h-10 w-10"
                    }`}
                >
                    <Search className={isBlended ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.5} />
                </div>

                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={getTranslation("searchBar.placeholder")}
                    className={`flex-1 border-none bg-transparent font-medium text-slate-800 outline-none selection:bg-indigo-500/30 placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-slate-400 dark:selection:bg-indigo-400/25 dark:caret-indigo-400 ${
                        isBlended ? "text-sm" : "text-lg"
                    }`}
                />

                <div
                    className={`hidden items-center gap-2 rounded-lg border border-slate-300/40 bg-slate-200/50 px-2.5 py-1 md:flex dark:border-slate-600/50 dark:bg-slate-800 dark:text-slate-300 ${
                        isBlended ? "scale-90" : ""
                    }`}
                >
                    <Command className="h-3 w-3 text-slate-400 dark:text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{getTranslation("searchBar.label")}</span>
                </div>
            </div>

            {!isBlended && value === "" && (
                <div className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-ping rounded-full bg-indigo-500/20 dark:bg-indigo-400/25" />
                </div>
            )}
        </div>
    );
};

export default SearchBar;
