import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import OrderManagement from "./pages/OrderManagement";
import PremiumEntry from "./pages/PremiumEntry";
import RatingEntry from "./pages/RatingEntry";
import StockEntry from "./pages/StockEntry";
import ProductEntry from "./pages/ProductEntry";
import DeliveryScreen from "./pages/DeliveryScreen";
import Overview from "./pages/Overview";
import Dashboard from "./pages/Dashboard";
import AIChat from "./pages/AIChat";
import CustomApp from "./pages/CustomApp";
import KeywordEntry from "./pages/KeywordEntry";
import BackOffice from "./pages/BackOffice";
import ScrollToTop from "./components/ScrollToTop";
import { NotificationProvider } from "./contexts/NotificationContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/premium-entry" element={<PremiumEntry />} />
            <Route path="/rating-entry" element={<RatingEntry />} />
            <Route path="/stock-entry" element={<StockEntry />} />
            <Route path="/product-entry" element={<ProductEntry />} />
            <Route path="/delivery" element={<DeliveryScreen />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/custom-app/:id" element={<CustomApp />} />
            <Route path="/keyword-entry" element={<KeywordEntry />} />
            <Route path="/back-office" element={<BackOffice />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
