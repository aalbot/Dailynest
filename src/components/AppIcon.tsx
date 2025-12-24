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
        className={`app-icon ${colorClass} w-14 h-14 sm:w-16 sm:h-16 group-hover:scale-110 group-hover:shadow-icon-hover group-active:scale-95 shadow-xl`}
      >
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm" strokeWidth={1.5} />
      </div>
      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors text-center leading-tight">
        {label}
      </span>
    </div>
  );
};

export default AppIcon;
