import { useEffect } from "react";
import { useLocation } from "wouter";

import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, accessTier } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!user) return null;

  if (!accessTier) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <p className="text-center text-sm text-slate-500">
          Please enable your device location to continue. A prompt should appear on screen.
        </p>
      </div>
    );
  }

  return children;
}

