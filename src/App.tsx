import React, { Suspense, lazy,useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Gateway = lazy(() => import("./pages/Gateway"));
const AppGallery = lazy(() => import("./pages/AppGallery"));
const CustomApp = lazy(() => import("./pages/CustomApp"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const TaskManager = lazy(() => import("./pages/TaskManagerLegacy"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const Staffes = lazy(() => import("./pages/Staffes"));
const InfraConsole = lazy(() => import("./pages/InfraConsole"));
const GenerateApp = lazy(() => import("./pages/GenerateApp"));
const NotFound = lazy(() => import("./pages/NotFound"));

import ScrollToTop from "./components/ScrollToTop";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { BrandingProvider } from "./contexts/BrandingContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center gradient-bg relative overflow-hidden">
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/50 dark:border-white/10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" strokeWidth={2.5} />
      </div>
    </div>
    <span className="mt-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse relative z-10">
      Initializing Portal
    </span>
  </div>
);

const App = () => {

  useEffect(() => {

    const handleMouseMove = (e: MouseEvent) => {

      const mouseY = e.clientY;

      const screenHeight = window.innerHeight;

      const percentage = mouseY / screenHeight;

      const maxScroll =
        document.documentElement.scrollHeight -
        window.innerHeight;

      window.scrollTo({
        top: percentage * maxScroll,
        behavior: "smooth",
      });

    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };

  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <BrandingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <NotificationProvider>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Gateway />} />
                    <Route path="/apps" element={<AppGallery />} />
                    <Route path="/custom-app/:id" element={<CustomApp />} />
                    <Route path="/employee-management" element={<EmployeeManagement />} />
                    <Route path="/tasks" element={<TaskManager />} />
                    <Route path="/tasks/:taskId" element={<TaskDetail />} />
                    <Route path="/staffes" element={<Staffes />} />
                    <Route path="/infra" element={<InfraConsole />} />
                    <Route path="/generate-app" element={<GenerateApp />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </NotificationProvider>
            </BrowserRouter>
          </TooltipProvider>
        </BrandingProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
};

export default App;
