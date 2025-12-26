import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={true}
      richColors={true}
      expand={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-5 group-[.toaster]:font-sans",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-bold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "group-[.toast]:bg-white dark:group-[.toast]:bg-slate-900 group-[.toast]:border-slate-200 dark:group-[.toast]:border-slate-800 group-[.toast]:text-slate-500 group-[.toast]:hover:text-red-600 group-[.toast]:transition-all group-[.toast]:shadow-md group-[.toast]:-top-3 group-[.toast]:-right-3 group-[.toast]:scale-110 group-[.toast]:hover:scale-125 dark:group-[.toast]:text-slate-400 group-[.toast]:border group-[.toast]:opacity-100 group-[.toast]:hover:bg-slate-50 dark:group-[.toast]:hover:bg-slate-800",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
