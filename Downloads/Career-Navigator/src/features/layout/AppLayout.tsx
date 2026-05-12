import type { ReactNode } from "react";
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className={cn("font-semibold tracking-tight")}>Career Navigator</a>
            </Link>
            <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard">
                <a className="hover:text-foreground transition-colors">Dashboard</a>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && !user ? (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Open app</Link>
                </Button>
                <Button variant="ghost" onClick={onLogout}>
                  Log out
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {!isSupabaseConfigured ? (
        <div className="border-b bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-muted-foreground">
            Auth is not configured. Set <code className="px-1">VITE_SUPABASE_URL</code> and{" "}
            <code className="px-1">VITE_SUPABASE_ANON_KEY</code> in{" "}
            <code className="px-1">.env</code>.
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
