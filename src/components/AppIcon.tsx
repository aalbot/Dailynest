import { LucideIcon } from "lucide-react";

interface AppIconProps {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  delay?: number;
}

const AppIcon = ({ icon: Icon, label, colorClass, delay = 0 }: AppIconProps) => {
  return (
    <div
      className="group flex flex-col items-center gap-2 cursor-pointer opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`app-icon ${colorClass} w-16 h-16 sm:w-24 sm:h-24 group-hover:scale-110 group-hover:shadow-icon-hover group-active:scale-95 shadow-xl`}
      >
        <Icon className="w-8 h-8 sm:w-11 sm:h-11 text-white drop-shadow-sm" strokeWidth={1.5} />
      </div>
      <span className="text-[10px] sm:text-xs font-semibold text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight line-clamp-2 max-w-[70px] sm:max-w-[96px]">
        {label}
      </span>
    </div>
  );
};

export default AppIcon;
