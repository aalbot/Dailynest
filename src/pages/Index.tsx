import SearchBar from "@/components/SearchBar";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import AppGrid from "@/components/AppGrid";
import Navbar from "@/components/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-icon-cyan/5 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 sm:p-8 md:p-12 pt-24">
        <div className="w-full max-w-4xl">

          <div className="mt-6 mb-12">
            <Link to="/chat" className="group relative block w-full bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600 rounded-2xl p-5 shadow-xl shadow-blue-500/20 overflow-hidden transition-all duration-500 hover:shadow-blue-500/40 hover:-translate-y-1">

              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
              <div className="absolute right-20 top-10 w-16 h-16 bg-blue-400/20 rounded-full blur-xl" />

              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-blue-50 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm shadow-sm">
                    <Sparkles className="w-3 h-3 text-blue-200 animate-pulse" />
                    <span>AI Assistant</span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                      Need help managing your store?
                    </h2>
                    <p className="text-blue-100 text-sm leading-relaxed font-medium line-clamp-2 sm:line-clamp-none">
                      Chat with our advanced AI to analyze sales, check stock, or get business insights instantly.
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 hidden sm:block">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-white text-white group-hover:text-blue-600 transition-all duration-300 shadow-lg">
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-4">
            <AppGrid />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
