import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "./supabaseClient";
import type { LocationData } from "@/lib/location";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  locationData: LocationData | null;
  accessTier: "free" | "paid" | null;
  locationRequired: boolean;
  signUpWithEmailPassword: (args: {
    email: string;
    password: string;
  }) => Promise<any>;
  signInWithEmailPassword: (args: {
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  setLocationData: (location: LocationData, tier: "free" | "paid") => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationData, setLocationDataState] = useState<LocationData | null>(null);
  const [accessTier, setAccessTier] = useState<"free" | "paid" | null>(null);
  const [locationRequired, setLocationRequired] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    void (async () => {
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;
      if (error) {
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);

      // Restore persisted location data so location is not re-requested on refresh
      const savedLocation = localStorage.getItem("location_data");
      const savedTier = localStorage.getItem("access_tier");
      if (savedLocation && savedTier) {
        try {
          const parsed = JSON.parse(savedLocation) as LocationData;
          setLocationDataState(parsed);
          setAccessTier(savedTier as "free" | "paid");
          setLocationRequired(false);
        } catch {
          // Corrupted data – ignore and require fresh location
          localStorage.removeItem("location_data");
          localStorage.removeItem("access_tier");
        }
      } else {
        setLocationRequired(Boolean(data.session?.user));
      }

      setIsLoading(false);
    })();

    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event !== "INITIAL_SESSION") {
        setIsLoading(false);
      }
      // Only reset location on explicit sign-in (not on page load / session restore)
      if (event === "SIGNED_IN") {
        // Check if this is a real sign-in vs session restore on page load
        // We use a heuristic: if location was already persisted, don't reset it
        const savedTier = localStorage.getItem("access_tier");
        if (!savedTier) {
          setLocationDataState(null);
          setAccessTier(null);
          setLocationRequired(true);
        }
      }
      if (event === "SIGNED_OUT") {
        setLocationDataState(null);
        setAccessTier(null);
        setLocationRequired(false);
        localStorage.removeItem("location_data");
        localStorage.removeItem("access_tier");
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmailPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        );
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data.session) {
        setLocationDataState(null);
        setAccessTier(null);
        setLocationRequired(true);
        localStorage.removeItem("location_data");
        localStorage.removeItem("access_tier");
      }
      return data;
    },
    [],
  );

  const signInWithEmailPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        );
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Require fresh GPS on every login
      setLocationDataState(null);
      setAccessTier(null);
      setLocationRequired(true);
      localStorage.removeItem("location_data");
      localStorage.removeItem("access_tier");
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setLocationDataState(null);
    setAccessTier(null);
    setLocationRequired(false);
    localStorage.removeItem("location_data");
    localStorage.removeItem("access_tier");
  }, []);

  const handleSetLocationData = useCallback(
    (location: LocationData, tier: "free" | "paid") => {
      setLocationDataState(location);
      setAccessTier(tier);
      setLocationRequired(false);
      // Save to localStorage for persistence
      localStorage.setItem("location_data", JSON.stringify(location));
      localStorage.setItem("access_tier", tier);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      locationData,
      accessTier,
      locationRequired,
      signUpWithEmailPassword,
      signInWithEmailPassword,
      signOut,
      setLocationData: handleSetLocationData,
    }),
    [user, session, isLoading, locationData, accessTier, locationRequired, signUpWithEmailPassword, signInWithEmailPassword, signOut, handleSetLocationData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

