import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Page level code splitting
const Gateway = lazy(() => import("./pages/Gateway"));
const AppGallery = lazy(() => import("./pages/AppGallery"));
const OrderManagement = lazy(() => import("./pages/OrderManagement"));
const PremiumEntry = lazy(() => import("./pages/PremiumEntry"));
const RatingEntry = lazy(() => import("./pages/RatingEntry"));
const StockEntry = lazy(() => import("./pages/StockEntry"));
const ProductEntry = lazy(() => import("./pages/ProductEntry"));
const DeliveryScreen = lazy(() => import("./pages/DeliveryScreen"));
const Overview = lazy(() => import("./pages/Overview"));
const Dashboard = lazy(() => import("./pages/Dashboard2/Dashboard2"));
const CustomApp = lazy(() => import("./pages/CustomApp"));
const KeywordEntry = lazy(() => import("./pages/KeywordEntry"));
const BackOffice = lazy(() => import("./pages/BackOffice"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const TaskManager = lazy(() => import("./pages/TaskManagerLegacy"));
const TaskDetail = lazy(() => import("./pages/TaskDetail"));
const NotificationManager = lazy(() => import("./pages/NotificationManager"));
const Staffes = lazy(() => import("./pages/Staffes"));
const InfraConsole = lazy(() => import("./pages/InfraConsole"));
const StaffActionTestPage = lazy(() => import("./pages/StaffActionTestPage"));
const WalletCustomersLayout = lazy(() => import("./layouts/WalletCustomersLayout"));
const WalletSuggestions = lazy(() => import("./pages/WalletSuggestions"));
const Broadcast = lazy(() => import("./pages/Broadcast"));
const BannerManage = lazy(() => import("./pages/BannerManage"));
const POS = lazy(() => import("./pages/POS"));
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
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#020617] relative overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] rounded-full" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 dark:bg-indigo-600/5 blur-[80px] rounded-full" />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/50 dark:border-white/10 flex items-center justify-center animate-bounce">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" strokeWidth={2.5} />
      </div>
    </div>
    <span className="mt-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse relative z-10">
      Initializing Portal
    </span>
  </div>
);

const App = () => (
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
                    <Route path="/orders" element={<OrderManagement />} />
                    <Route element={<WalletCustomersLayout />}>
                      <Route path="/premium-entry" element={<PremiumEntry />} />
                      <Route path="/wallet-suggestions" element={<WalletSuggestions />} />
                      <Route path="/customers" element={<StaffActionTestPage />} />
                      <Route path="/staff-test" element={<StaffActionTestPage />} />
                    </Route>
                    <Route path="/rating-entry" element={<RatingEntry />} />
                    <Route path="/stock-entry" element={<StockEntry />} />
                    <Route path="/product-entry" element={<ProductEntry />} />
                    <Route path="/delivery" element={<DeliveryScreen />} />
                    <Route path="/overview" element={<Overview />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard-2" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/custom-app/:id" element={<CustomApp />} />
                    <Route path="/keyword-entry" element={<KeywordEntry />} />
                    <Route path="/back-office" element={<BackOffice />} />
                    <Route path="/employee-management" element={<EmployeeManagement />} />
                    <Route path="/tasks" element={<TaskManager />} />
                    <Route path="/tasks/:taskId" element={<TaskDetail />} />
                    <Route path="/notifications" element={<NotificationManager />} />
                    <Route path="/staffes" element={<Staffes />} />
                    <Route path="/infra" element={<InfraConsole />} />
                    <Route path="/broadcast" element={<Broadcast />} />
                    <Route path="/banner-manage" element={<BannerManage />} />
                    <Route path="/pos" element={<POS />} />
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

export default App;
