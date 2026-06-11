import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";

import { LocationPermissionModal } from "@/components/LocationPermissionModal";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/AuthProvider";
import { updateProfile } from "@/lib/supabase-helpers";
import type { LocationData } from "@/lib/location";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

/**
 * Blocks the app until GPS location is granted for authenticated users.
 * Required on first launch and every login per POPIA / hybrid access model.
 */
export function LocationGate({ children }: { children: ReactNode }) {
  const { user, isLoading, accessTier, setLocationData } = useAuth();
  const [location] = useLocation();
  const [saving, setSaving] = useState(false);

  const isPublicRoute = PUBLIC_PATHS.includes(location);
  const needsLocation = Boolean(user) && !accessTier;

  async function handleLocationGranted(locationData: LocationData, tier: "free" | "paid") {
    setLocationData(locationData, tier);
    if (!user) return;

    setSaving(true);
    await updateProfile(user.id, {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      province_detected: locationData.province,
      access_tier: tier,
      location_requested_at: new Date(locationData.timestamp).toISOString(),
    });
    setSaving(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {children}
      {needsLocation && (
        <LocationPermissionModal
          onLocationGranted={handleLocationGranted}
          showSkip={false}
          isSaving={saving}
        />
      )}
    </>
  );
}
