import { useState } from "react";
import { AlertCircle, MapPin, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestDeviceLocation,
  coordinatesToProvince,
  getAccessTier,
  type LocationData,
} from "@/lib/location";

interface LocationPermissionModalProps {
  onLocationGranted: (location: LocationData, accessTier: "free" | "paid") => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export function LocationPermissionModal({
  onLocationGranted,
  onSkip,
  showSkip = false,
}: LocationPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestLocation() {
    setIsRequesting(true);
    setError(null);

    const location = await requestDeviceLocation();

    if (!location) {
      setError(
        "Could not access your location. Please enable GPS/location services in your device settings."
      );
      setIsRequesting(false);
      return;
    }

    // Detect province from coordinates
    const province = coordinatesToProvince(location.latitude, location.longitude);
    const locationWithProvince: LocationData = { ...location, province };
    const accessTier = getAccessTier(province);

    setIsRequesting(false);
    onLocationGranted(locationWithProvince, accessTier);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-[#E8F5F3] px-6 py-8 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-[#006B5E] text-white">
            <MapPin className="size-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0F172A]">
            Location Required
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This app needs your location to determine if you qualify for free rural
            support or our paid plans.
          </p>
        </div>

        <div className="px-6 py-8">
          {/* Info Box */}
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="size-5 shrink-0 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">How we use your location:</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>
                    <strong>Limpopo, Eastern Cape, Lesotho:</strong> Qualify for
                    free access
                  </li>
                  <li>
                    <strong>Other provinces:</strong> Require a paid plan (R249–R1,000)
                  </li>
                  <li>
                    <strong>Your privacy:</strong> Location data is encrypted and only
                    used for access determination
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="size-5 shrink-0 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="grid gap-3">
            <Button
              onClick={handleRequestLocation}
              disabled={isRequesting}
              className="h-12 bg-[#006B5E] hover:bg-[#005548] text-white font-semibold gap-2"
            >
              {isRequesting ? (
                <>
                  <Loader className="size-4 animate-spin" />
                  Detecting location…
                </>
              ) : (
                <>
                  <MapPin className="size-4" />
                  Turn On Device Location
                </>
              )}
            </Button>

            {showSkip && (
              <Button
                onClick={onSkip}
                variant="outline"
                disabled={isRequesting}
                className="h-12"
              >
                Skip for now
              </Button>
            )}
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>
              🔒 Your location is encrypted and protected under POPIA compliance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
