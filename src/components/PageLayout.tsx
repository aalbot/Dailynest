import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "./Navbar";

interface PageLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  accentColor: string;
}

const PageLayout = ({ children, title, subtitle, accentColor }: PageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Page Content */}
      <main className="relative z-10 px-6 pt-24 pb-12 sm:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="mb-8 opacity-0 animate-fade-in flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${accentColor}`} />
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-tight mb-1">
                {title}
              </h1>
              <p className="text-muted-foreground text-lg">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageLayout;
