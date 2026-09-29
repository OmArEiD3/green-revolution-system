import { membersApi } from '../api/client';

export type CoordinatePair = [number, number];

export const STORAGE_KEY_ZONE = 'green_revolution_zone_polygon_v1';

// Default geofence enclosing Al Thawra Al Khadraa (Streets 1 - 20)
export const DEFAULT_ZONE_POLYGON: CoordinatePair[] = [
  [30.0610, 30.9720],
  [30.0645, 30.9880],
  [30.0540, 31.0020],
  [30.0390, 30.9950],
  [30.0330, 30.9780],
  [30.0420, 30.9650],
];

/**
 * Load the zone polygon from backend with localStorage fallback.
 */
export async function loadZoneCoordinates(): Promise<CoordinatePair[]> {
  try {
    const res = await membersApi.getZone();
    if (res?.polygon && Array.isArray(res.polygon) && res.polygon.length >= 3) {
      localStorage.setItem(STORAGE_KEY_ZONE, JSON.stringify(res.polygon));
      return res.polygon;
    }
  } catch (err) {
    console.warn('Backend zone fetch failed, checking local cache:', err);
  }

  // Check localStorage
  const cached = localStorage.getItem(STORAGE_KEY_ZONE);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }

  return DEFAULT_ZONE_POLYGON;
}

/**
 * Save zone polygon to localStorage and sync with backend.
 */
export async function saveZoneCoordinates(polygon: CoordinatePair[]): Promise<void> {
  if (!polygon || polygon.length < 3) {
    throw new Error('يجب تحديد 3 نقاط على الأقل لتكوين زون صحيح');
  }

  // Update local cache immediately
  localStorage.setItem(STORAGE_KEY_ZONE, JSON.stringify(polygon));

  // Sync to backend
  try {
    await membersApi.saveZone(polygon);
  } catch (err) {
    console.error('Failed to sync zone to backend (saved locally):', err);
  }
}

/**
 * Reset zone back to default coordinates.
 */
export async function resetZoneCoordinates(): Promise<CoordinatePair[]> {
  await saveZoneCoordinates(DEFAULT_ZONE_POLYGON);
  return DEFAULT_ZONE_POLYGON;
}

/**
 * Ray-casting algorithm to test whether a coordinate is inside a polygon.
 */
export function isPointInPolygon(
  point: CoordinatePair,
  polygon: CoordinatePair[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate the centroid / center point of a polygon.
 */
export function calculatePolygonCenter(polygon: CoordinatePair[]): CoordinatePair {
  if (!polygon || polygon.length === 0) return [30.0485, 30.9850];

  let sumLat = 0;
  let sumLng = 0;
  polygon.forEach(([lat, lng]) => {
    sumLat += lat;
    sumLng += lng;
  });

  return [sumLat / polygon.length, sumLng / polygon.length];
}
