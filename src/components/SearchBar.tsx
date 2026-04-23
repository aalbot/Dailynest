import { Search, Command } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "default" | "blended";
}

const SearchBar = ({ value, onChange, className = "", variant = "default" }: SearchBarProps) => {
  const { getTranslation } = useLang();

  const isBlended = variant === "blended";

  return (
    <div className={`relative w-full group ${isBlended ? "" : "max-w-2xl mx-auto"} ${className}`}>
      {/* Glow Effect - Only for default variant */}
      {!isBlended && (
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:duration-200"></div>
      )}

      <div className={`relative flex items-center gap-4 transition-all duration-300 ${isBlended
        ? "bg-slate-100/50 dark:bg-slate-800/40 backdrop-blur-md rounded-xl px-4 py-2 border border-slate-200/50 dark:border-white/5 shadow-inner"
        : "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl px-6 py-4 border border-white/40 dark:border-white/10 shadow-xl"
        }`}>
        <div className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 dark:text-indigo-400 ${isBlended ? "w-8 h-8" : "w-10 h-10"
          }`}>
          <Search className={isBlended ? "w-4 h-4" : "w-5 h-5"} strokeWidth={2.5} />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={getTranslation("searchBar.placeholder")}
          className={`flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium selection:bg-indigo-500/30 ${isBlended ? "text-sm" : "text-lg"
            }`}
        />

        <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-800/80 border border-slate-300/30 dark:border-slate-700/50 ${isBlended ? "scale-90" : ""}`}>
          <Command className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-black text-slate-500 tracking-widest uppercase">{getTranslation("searchBar.label")}</span>
        </div>
      </div>

      {/* Pulse Animation - Only for default variant */}
      {!isBlended && value === "" && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 animate-ping" />
        </div>
      )}
    </div>
  );
};


export default SearchBar;
