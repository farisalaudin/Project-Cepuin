// ============================
// Geolocation Utilities
// ============================

/** Radius for duplicate detection (in meters) */
export const DUPLICATE_RADIUS_METERS = 50

/** Radius for nearby feed (in km) */
export const FEED_RADIUS_KM = 2

/** Get current GPS coordinates from browser */
export const getCurrentLocation = (): Promise<GeolocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung browser ini'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

/**
 * Calculate distance between 2 GPS points using Haversine formula.
 * @returns Distance in meters
 */
export const getDistanceInMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Reverse geocode lat/lng to human-readable address.
 * Uses Nominatim OpenStreetMap (free, rate limit: 1 req/sec).
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'id' } }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

/**
 * Search for a location by query.
 * Uses Nominatim OpenStreetMap (free, no API key).
 */
export const searchLocation = async (query: string): Promise<any[]> => {
  if (!query || query.length < 3) return []
  
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=id`,
      { headers: { 'Accept-Language': 'id' } }
    )
    return await res.json()
  } catch (err) {
    console.error('Search error:', err)
    return []
  }
}
