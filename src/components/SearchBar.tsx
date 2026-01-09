import { Search, Command } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const SearchBar = ({ value, onChange, className = "" }: SearchBarProps) => {
  return (
    <div className={`relative w-full max-w-2xl mx-auto group ${className}`}>
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:duration-200"></div>

      <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-2xl px-6 py-4 flex items-center gap-4 border border-white/40 dark:border-white/10 shadow-xl transition-all duration-300">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 dark:text-indigo-400">
          <Search className="w-5 h-5" strokeWidth={2} />
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search for tools, reports, or data..."
          className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg font-medium selection:bg-indigo-500/30"
        />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Command className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Search</span>
        </div>
      </div>

      {/* Pulse Animation for Search Icon when empty */}
      {value === "" && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-5 h-5 rounded-full bg-indigo-500/20 animate-ping" />
        </div>
      )}
    </div>
  );
};

export default SearchBar;
