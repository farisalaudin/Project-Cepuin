/**
 * lib/getReporterGPS.ts
 *
 * Collects reporter's GPS at submit time — AUDIT METADATA ONLY.
 * This data is:
 *   - NOT shown to the end user
 *   - NOT used to determine which admin receives the report
 *   - Stored silently for risk-flagging and fraud detection
 *
 * Returns null if permission is denied or geolocation is unavailable.
 * The report can always be submitted even without reporter GPS.
 */

import type { ReporterGPSResult } from '@/types'

const TIMEOUT_MS = 8000

/**
 * Silently capture the reporter's current GPS position.
 * Called just before form submission, invisible to the user.
 *
 * @returns ReporterGPSResult or null if unavailable/denied
 */
export const getReporterGPS = (): Promise<ReporterGPSResult | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }

    const timeoutId = setTimeout(() => resolve(null), TIMEOUT_MS)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId)
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
        })
      },
      () => {
        // Permission denied or error — resolve null, report submission continues
        clearTimeout(timeoutId)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: TIMEOUT_MS,
        maximumAge: 0,
      }
    )
  })
}
