/**
 * Location service for GeolocationAPI and SA province mapping
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  province?: string;
  accuracy?: number;
  timestamp: number;
}

// Rural provinces (FREE tier)
const RURAL_PROVINCES = ["Limpopo", "Eastern Cape", "Lesotho"];

// Urban/Suburban provinces (PAID tier)
const URBAN_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Free State",
  "Mpumalanga",
  "Northern Cape",
  "North West",
];

const ALL_PROVINCES = [...RURAL_PROVINCES, ...URBAN_PROVINCES];

/**
 * Request device location and return GPS coordinates
 */
export async function requestDeviceLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error("Geolocation API not supported");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        });
      },
      (error) => {
        console.error("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Convert GPS coordinates to SA province using simple bounding boxes
 * Simplified mapping for SA provinces
 */
export function coordinatesToProvince(lat: number, lng: number): string | null {
  // Note: This is a simplified mapping. In production, you'd use a proper geocoding API
  // (Google Geocoding API, OpenStreetMap Nominatim, etc.)

  // Rough province bounding boxes (lat/lng ranges)
  const provinceBounds: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    // Limpopo (northeastern, FREE)
    Limpopo: { minLat: -23.2, maxLat: -22.2, minLng: 28.5, maxLng: 32.3 },
    // Eastern Cape (southeastern, FREE)
    "Eastern Cape": { minLat: -34.8, maxLat: -30.2, minLng: 25.3, maxLng: 29.9 },
    // Gauteng (central/north, PAID - urban)
    Gauteng: { minLat: -25.9, maxLat: -24.8, minLng: 25.3, maxLng: 28.8 },
    // Western Cape (southwestern, PAID - urban)
    "Western Cape": { minLat: -34.9, maxLat: -31.5, minLng: 18.2, maxLng: 26.9 },
    // KwaZulu-Natal (east, PAID)
    "KwaZulu-Natal": { minLat: -30.9, maxLat: -27.0, minLng: 30.0, maxLng: 34.0 },
    // Free State (central south, PAID)
    "Free State": { minLat: -30.7, maxLat: -27.0, minLng: 24.5, maxLng: 29.6 },
    // Mpumalanga (east central, PAID)
    Mpumalanga: { minLat: -26.7, maxLat: -23.6, minLng: 29.0, maxLng: 32.8 },
    // Northern Cape (central west, PAID)
    "Northern Cape": { minLat: -30.7, maxLat: -27.0, minLng: 18.9, maxLng: 25.5 },
    // North West (northwest, PAID)
    "North West": { minLat: -26.7, maxLat: -24.5, minLng: 24.0, maxLng: 28.0 },
    // Lesotho (mountainous, FREE - treated as free tier)
    Lesotho: { minLat: -30.7, maxLat: -28.6, minLng: 27.0, maxLng: 29.5 },
  };

  // Find matching province
  for (const [province, bounds] of Object.entries(provinceBounds)) {
    if (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lng >= bounds.minLng &&
      lng <= bounds.maxLng
    ) {
      return province;
    }
  }

  return null;
}

/**
 * Determine access tier (free or paid) based on province
 */
export function getAccessTier(province?: string): "free" | "paid" {
  if (!province) return "paid"; // Default to paid if unknown

  if (RURAL_PROVINCES.includes(province)) {
    return "free";
  }
  if (URBAN_PROVINCES.includes(province)) {
    return "paid";
  }

  return "paid"; // Default to paid for unknown provinces
}

/**
 * Check if province is rural (free tier)
 */
export function isRuralProvince(province?: string): boolean {
  return province ? RURAL_PROVINCES.includes(province) : false;
}

/**
 * Get all rural provinces (free tier)
 */
export function getRuralProvinces(): string[] {
  return [...RURAL_PROVINCES];
}

/**
 * Get all urban provinces (paid tier)
 */
export function getUrbanProvinces(): string[] {
  return [...URBAN_PROVINCES];
}

/**
 * Get all valid provinces
 */
export function getAllProvinces(): string[] {
  return [...ALL_PROVINCES];
}

/**
 * Format location for display
 */
export function formatLocation(location: LocationData): string {
  const province = location.province || "Unknown Province";
  return `${province} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
}
