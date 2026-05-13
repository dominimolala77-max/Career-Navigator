import type { ReactNode } from "react";
import { BriefcaseBusiness, LogOut, Sparkles } from "lucide-react";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { isSupabaseConfigured } from "@/features/auth/supabaseClient";
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, isLoading } = useAuth();
  const { toast } = useToast();

  async function onLogout() {
    try {
      await signOut();
      toast({ title: "Signed out" });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ title: "Sign out failed", description: message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_8%,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.12),transparent_26%),linear-gradient(180deg,#fbfcfb_0%,#f4f7f6_48%,#eef3f2_100%)] text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className={cn("flex items-center gap-2 font-semibold tracking-tight")}>
                <span className="grid size-9 place-items-center rounded-md bg-slate-950 text-white shadow-sm">
                  <BriefcaseBusiness className="size-4" />
                </span>
                <span>CareerPath SA</span>
              </a>
            </Link>
            <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard">
                <a className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950 transition-colors">
                  Dashboard
                </a>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && !user ? (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/dashboard">
                    <Sparkles className="size-4" />
                    Open app
                  </Link>
                </Button>
                <Button variant="ghost" onClick={onLogout}>
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <div className="border-b border-amber-200 bg-amber-50/80">
          <div className="mx-auto max-w-7xl px-4 py-3 text-sm text-amber-900 sm:px-6">
            Auth is not configured. Set <code className="px-1">VITE_SUPABASE_URL</code> and{" "}
            <code className="px-1">VITE_SUPABASE_ANON_KEY</code> in{" "}
            <code className="px-1">.env</code>.
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
