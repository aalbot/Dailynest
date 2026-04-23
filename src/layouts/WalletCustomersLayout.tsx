import { NavLink, Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Crown, Lightbulb, Users } from "lucide-react";

function sideLinkClass(isActive: boolean) {
    return [
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        isActive
            ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/15 text-white ring-1 ring-violet-400/35 shadow-sm shadow-violet-900/20"
            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
    ].join(" ");
}

export default function WalletCustomersLayout() {
    const { pathname } = useLocation();
    const customersPathActive = pathname === "/customers" || pathname === "/staff-test";
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <div className="flex w-full flex-col pt-16 md:flex-row md:items-stretch">
                <aside
                    className="sticky top-16 z-20 hidden h-[calc(100dvh-4rem)] w-[15rem] shrink-0 border-b border-white/10 bg-slate-950/95 backdrop-blur-md md:block md:border-b-0 md:border-r md:border-white/10"
                    aria-label="Wallet, suggestions, and customers navigation"
                >
                    <div className="flex h-full flex-col gap-1 p-4">
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Menu</p>
                        <nav className="flex flex-col gap-1">
                            <NavLink to="/premium-entry" end className={({ isActive }) => sideLinkClass(isActive)}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/20">
                                    <Crown className="h-4 w-4" strokeWidth={2} />
                                </span>
                                Wallet & users
                            </NavLink>
                            <NavLink
                                to="/customers"
                                end
                                className={({ isActive }) => sideLinkClass(isActive || customersPathActive)}
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 ring-1 ring-sky-400/20">
                                    <Users className="h-4 w-4" strokeWidth={2} />
                                </span>
                                Customers
                            </NavLink>
                            <NavLink to="/wallet-suggestions" end className={({ isActive }) => sideLinkClass(isActive)}>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
                                    <Lightbulb className="h-4 w-4" strokeWidth={2} />
                                </span>
                                Suggestions
                            </NavLink>
                        </nav>
                    </div>
                </aside>

                <div className="sticky top-16 z-20 grid grid-cols-3 gap-1 border-b border-white/10 bg-slate-950/95 px-2 py-2 backdrop-blur-md md:hidden">
                    <NavLink
                        to="/premium-entry"
                        end
                        className={({ isActive }) =>
                            [
                                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold leading-tight transition-colors sm:flex-row sm:gap-1 sm:text-xs",
                                isActive ? "bg-violet-500/25 text-white ring-1 ring-violet-400/30" : "text-slate-400 hover:bg-white/5",
                            ].join(" ")
                        }
                    >
                        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span>Wallet</span>
                    </NavLink>
                    <NavLink
                        to="/customers"
                        end
                        className={({ isActive }) =>
                            [
                                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold leading-tight transition-colors sm:flex-row sm:gap-1 sm:text-xs",
                                isActive || customersPathActive ? "bg-violet-500/25 text-white ring-1 ring-violet-400/30" : "text-slate-400 hover:bg-white/5",
                            ].join(" ")
                        }
                    >
                        <Users className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                        <span>Customers</span>
                    </NavLink>
                    <NavLink
                        to="/wallet-suggestions"
                        end
                        className={({ isActive }) =>
                            [
                                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold leading-tight transition-colors sm:flex-row sm:gap-1 sm:text-xs",
                                isActive ? "bg-violet-500/25 text-white ring-1 ring-violet-400/30" : "text-slate-400 hover:bg-white/5",
                            ].join(" ")
                        }
                    >
                        <Lightbulb className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                        <span>Suggestions</span>
                    </NavLink>
                </div>

                <main className="min-w-0 flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
