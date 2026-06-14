import type { ReverseGeocodeResult, SearchLocationResult } from '@/types'

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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
const reverseGeocodeCacheKey = (lat: number, lng: number) =>
  `geocode_${lat.toFixed(5)}_${lng.toFixed(5)}`

const readCachedReverseGeocode = (key: string): ReverseGeocodeResult | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    const cached = JSON.parse(raw) as { expiresAt: number; result: ReverseGeocodeResult }
    if (cached.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(key)
      return null
    }

    return cached.result
  } catch {
    return null
  }
}

const writeCachedReverseGeocode = (key: string, result: ReverseGeocodeResult) => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        expiresAt: Date.now() + 10 * 60 * 1000,
        result,
      })
    )
  } catch {
    // Cache is best-effort only.
  }
}

const asAddressPart = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return null
}

/**
 * Reverse geocode lat/lng to address details.
 * Uses Nominatim OpenStreetMap (free, rate limit: 1 req/sec).
 */
export const reverseGeocodeDetails = async (
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> => {
  const cacheKey = reverseGeocodeCacheKey(lat, lng)
  const cached = readCachedReverseGeocode(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=id`,
      {
        headers: {
          'Accept-Language': 'id',
          'User-Agent': 'CepuinApp/2.0 (https://cepuin.vercel.app)',
        },
      }
    )
    const data = (await res.json()) as {
      display_name?: string
      address?: Record<string, unknown>
    }
    const address = data.address ?? {}
    const result: ReverseGeocodeResult = {
      displayName: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      kelurahan: asAddressPart(address.village, address.neighbourhood),
      kecamatan: asAddressPart(address.city_district, address.suburb),
      kabupaten: asAddressPart(address.city, address.county),
      provinsi: asAddressPart(address.state),
    }

    writeCachedReverseGeocode(cacheKey, result)
    return result
  } catch {
    return {
      displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      kelurahan: null,
      kecamatan: null,
      kabupaten: null,
      provinsi: null,
    }
  }
}

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const result = await reverseGeocodeDetails(lat, lng)
  return result.displayName
}

/**
 * Search for a location by query.
 * Uses Nominatim OpenStreetMap (free, no API key).
 */
export const searchLocation = async (query: string): Promise<SearchLocationResult[]> => {
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
