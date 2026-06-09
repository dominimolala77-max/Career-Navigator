import type { ReactNode } from "react";
import { useState } from "react";
import {
  BookOpen, Briefcase, CreditCard, GraduationCap, LayoutDashboard,
  LogOut, Menu, Search, User, Wallet, X,
} from "lucide-react";
import { Link, useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/careers", label: "Career Match", icon: Search },
  { href: "/universities", label: "Universities", icon: GraduationCap },
  { href: "/funding", label: "Funding", icon: Wallet },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/applications", label: "Submissions", icon: BookOpen },
  { href: "/plans", label: "Plans", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, isLoading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = ["/login", "/signup"].includes(location);
  const isLanding = location === "/";
  const showNav = !isAuthPage && !isLanding && user;

  async function onLogout() {
    try {
      await signOut();
      toast({ title: "Signed out successfully" });
    } catch (e) {
      toast({ title: "Sign out failed", description: String(e), variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href={user ? "/dashboard" : "/"}>
            <a className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-[#006B5E] text-white shadow-sm">
                <GraduationCap className="size-5" />
              </span>
              <span className="hidden font-bold text-[#0F172A] sm:block">
                CareerPath <span className="text-[#006B5E]">SA</span>
              </span>
            </a>
          </Link>

          {/* Desktop Nav (only when logged in, not on landing/auth) */}
          {showNav && (
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#E8F5F3] text-[#006B5E]"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}>
                      <item.icon className="size-4" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {!isLoading && !user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#006B5E] hover:bg-[#005548] text-white">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            ) : user ? (
              <>
                <Button variant="ghost" size="sm" onClick={onLogout} className="hidden sm:flex gap-1.5 text-slate-600">
                  <LogOut className="size-4" />
                  <span className="hidden md:inline">Sign out</span>
                </Button>
                {showNav && (
                  <button
                    className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-slate-600 lg:hidden"
                    onClick={() => setMobileOpen(v => !v)}
                  >
                    {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {showNav && mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-[57px] bottom-0 w-72 border-r border-border bg-white shadow-xl">
            <nav className="flex flex-col gap-1 p-4">
              {NAV_ITEMS.map((item) => {
                const active = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-[#E8F5F3] text-[#006B5E]"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <item.icon className="size-5" />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
              <div className="mt-4 border-t border-border pt-4">
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="size-5" />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "mx-auto max-w-7xl px-4 sm:px-6",
        showNav ? "py-6" : "py-0"
      )}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white px-2 pb-safe lg:hidden">
          <div className="flex items-center justify-around py-2">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors",
                    active ? "text-[#006B5E]" : "text-slate-500"
                  )}>
                    <item.icon className={cn("size-5", active && "text-[#006B5E]")} />
                    {item.label.split(" ")[0]}
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Spacer for bottom nav */}
      {showNav && <div className="h-20 lg:h-0" />}
    </div>
  );
}
