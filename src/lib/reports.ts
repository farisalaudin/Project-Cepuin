// ============================
// Report Utilities
// ============================

import { supabase } from './supabase/client'
import { DUPLICATE_RADIUS_METERS, getDistanceInMeters } from './geo'
import type {
  ApiResponse,
  CreateReportInput,
  Report,
  ReportCategory,
  ReportStatus,
} from '@/types'

const parseApiResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>

  if (!response.ok || !payload.ok) {
    const message = payload.ok ? 'Terjadi kesalahan sistem.' : payload.error.message
    const error = new Error(message)
    ;(error as Error & { code?: string; details?: unknown }).code = payload.ok
      ? 'HTTP_ERROR'
      : payload.error.code
    ;(error as Error & { code?: string; details?: unknown }).details = payload.ok
      ? null
      : payload.error.details
    throw error
  }

  return payload.data
}

/**
 * Find reports near a given location that might be duplicates.
 * Logic: Same category, not finished/rejected, within 50 meters.
 *
 * @param lat - User latitude
 * @param lng - User longitude
 * @param category - Report category
 * @returns Array of potential duplicate reports
 */
export const findNearbyDuplicates = async (
  lat: number,
  lng: number,
  category: ReportCategory
): Promise<Report[]> => {
  // Approximate bounding box (0.00045 degrees is ~50m)
  const RADIUS_DEGREES = 0.00045

  const { data, error } = await supabase
    .from('reports')
    .select('*, photo_url')
    .eq('category', category)
    .not('status', 'in', '("selesai","ditolak")')
    .gte('lat', lat - RADIUS_DEGREES)
    .lte('lat', lat + RADIUS_DEGREES)
    .gte('lng', lng - RADIUS_DEGREES)
    .lte('lng', lng + RADIUS_DEGREES)

  if (error) {
    console.error('Duplicate detection error:', error)
    return []
  }

  // Precision filter using Haversine formula
  return (
    (data as Report[])?.filter(
      (report) =>
        getDistanceInMeters(lat, lng, report.lat, report.lng) <=
        DUPLICATE_RADIUS_METERS
    ) ?? []
  )
}

/**
 * Get reports near a given location for the feed.
 * Logic: Within 2km, ordered by urgency score.
 *
 * @param lat - User latitude
 * @param lng - User longitude
 * @returns Array of nearby reports
 */
export const getNearbyReports = async (
  lat: number,
  lng: number
): Promise<Report[]> => {
  // Approximate bounding box (0.018 degrees is ~2km)
  const RADIUS_DEGREES = 0.018

  const { data, error } = await supabase
    .from('reports')
    .select('*, photo_url')
    .gte('lat', lat - RADIUS_DEGREES)
    .lte('lat', lat + RADIUS_DEGREES)
    .gte('lng', lng - RADIUS_DEGREES)
    .lte('lng', lng + RADIUS_DEGREES)
    .order('urgency_score', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Nearby feed error:', error)
    return []
  }

  // Precision filter using Haversine formula
  return (
    (data as Report[])?.filter(
      (report) =>
        getDistanceInMeters(lat, lng, report.lat, report.lng) <= 2000
    ) ?? []
  )
}

/**
 * Get the most recent reports regardless of location.
 * Used as a fallback when GPS is disabled.
 */
export const getLatestReports = async (limit: number = 20): Promise<Report[]> => {
  const { data, error } = await supabase
    .from('reports')
    .select('*, photo_url')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Latest reports error:', error)
    return []
  }

  return data as Report[]
}

/**
 * Create a new report in the database.
 */
export const createReport = async (reportData: CreateReportInput): Promise<Report> => {
  const response = await fetch('/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportData),
  })

  return parseApiResponse<Report>(response)
}

/**
 * Atomically update a report status and write the audit trail entry.
 */
export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  assignedTo?: string | null,
  note?: string | null
): Promise<Report> => {
  const response = await fetch(`/api/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      assignedTo: assignedTo?.trim() || null,
      note: note?.trim() || null,
    }),
  })

  return parseApiResponse<Report>(response)
}

