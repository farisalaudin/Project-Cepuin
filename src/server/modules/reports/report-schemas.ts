import { ApiRouteError } from '@/server/lib/api'
import type {
  CreateReportInput,
  ReportCategory,
  ReportStatus,
  UpdateReportStatusInput,
} from '@/types'

const REPORT_CATEGORIES: ReportCategory[] = [
  'jalan_berlubang',
  'lampu_mati',
  'banjir',
  'sampah_menumpuk',
  'drainase_rusak',
  'fasilitas_umum',
  'lainnya',
]

const REPORT_STATUSES: ReportStatus[] = [
  'dilaporkan',
  'diverifikasi',
  'dikerjakan',
  'selesai',
  'ditolak',
]

const asNonEmptyString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const asFiniteNumber = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

const asOptionalUuid = (value: unknown) => {
  const raw = asNonEmptyString(value)
  if (!raw) return null

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    throw new ApiRouteError(400, 'INVALID_WILAYAH_ID', 'Wilayah laporan tidak valid.')
  }

  return raw
}

const asInteger = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return value
}

/**
 * Validate an optional latitude value for reporter GPS (audit metadata).
 * Returns null if missing/invalid — reporter GPS is always optional.
 */
const asOptionalLatitude = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const num = asFiniteNumber(value)
  if (num === null) return null
  if (num < -90 || num > 90) return null // silently drop invalid — audit field
  return num
}

/**
 * Validate an optional longitude value for reporter GPS (audit metadata).
 * Returns null if missing/invalid — reporter GPS is always optional.
 */
const asOptionalLongitude = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const num = asFiniteNumber(value)
  if (num === null) return null
  if (num < -180 || num > 180) return null // silently drop invalid — audit field
  return num
}

/**
 * Validate an optional ISO 8601 timestamp string.
 * Returns null if missing or not parseable.
 */
const asOptionalIsoTimestamp = (value: unknown): string | null => {
  const raw = asNonEmptyString(value)
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return null
  return raw
}

const asSafePhotoUrl = (value: unknown) => {
  const raw = asNonEmptyString(value)
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('INVALID_PROTOCOL')
    }

    const configuredHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null

    if (!configuredHost || parsed.hostname !== configuredHost) {
      throw new Error('INVALID_HOST')
    }

    return raw
  } catch {
    throw new ApiRouteError(
      400,
      'INVALID_PHOTO_URL',
      'URL foto tidak valid. Gunakan file yang diunggah dari storage aplikasi.'
    )
  }
}

export const validateCreateReportInput = (input: unknown): CreateReportInput => {
  if (!input || typeof input !== 'object') {
    throw new ApiRouteError(400, 'INVALID_REPORT_PAYLOAD', 'Payload laporan tidak valid.')
  }

  const payload = input as Record<string, unknown>
  const category = payload.category
  const lat = asFiniteNumber(payload.lat)
  const lng = asFiniteNumber(payload.lng)
  const description = asNonEmptyString(payload.description)
  const rating = payload.rating === null || payload.rating === undefined ? null : asInteger(payload.rating)
  const feedbackComment = asNonEmptyString(payload.feedback_comment)
  const photoUrl = asSafePhotoUrl(payload.photo_url)
  const address = asNonEmptyString(payload.address)
  const gpsAccuracy = payload.gps_accuracy === null || payload.gps_accuracy === undefined
    ? null
    : asFiniteNumber(payload.gps_accuracy)
  const kelurahan = asNonEmptyString(payload.kelurahan)
  const kecamatan = asNonEmptyString(payload.kecamatan)
  const kabupaten = asNonEmptyString(payload.kabupaten)
  const provinsi = asNonEmptyString(payload.provinsi)
  const wilayahId = asOptionalUuid(payload.wilayah_id)

  // Reporter GPS fields (audit only — optional, NEVER used for routing).
  // Use lenient helpers: out-of-range or missing values silently become null
  // so a bad GPS reading never blocks report submission.
  const reporterLat = asOptionalLatitude(payload.reporter_lat)
  const reporterLon = asOptionalLongitude(payload.reporter_lon)
  const reporterAccuracy = payload.reporter_accuracy === null || payload.reporter_accuracy === undefined
    ? null
    : asFiniteNumber(payload.reporter_accuracy)
  const reporterGpsTimestamp = asOptionalIsoTimestamp(payload.reporter_gps_timestamp)

  // Disclaimer consent (required)
  const disclaimerAgreed = payload.disclaimer_agreed === true
  const disclaimerAgreedAt = asNonEmptyString(payload.disclaimer_agreed_at)

  if (typeof category !== 'string' || !REPORT_CATEGORIES.includes(category as ReportCategory)) {
    throw new ApiRouteError(400, 'INVALID_CATEGORY', 'Kategori laporan tidak valid.')
  }

  if (lat === null || lng === null) {
    throw new ApiRouteError(400, 'INVALID_COORDINATES', 'Koordinat laporan wajib valid.')
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiRouteError(400, 'INVALID_COORDINATE_RANGE', 'Koordinat berada di luar rentang yang valid.')
  }

  if (gpsAccuracy !== null && (gpsAccuracy < 0 || gpsAccuracy > 100000)) {
    throw new ApiRouteError(400, 'INVALID_GPS_ACCURACY', 'Akurasi GPS tidak valid.')
  }

  if (description && description.length > 280) {
    throw new ApiRouteError(400, 'DESCRIPTION_TOO_LONG', 'Deskripsi maksimal 280 karakter.')
  }

  if (rating !== null && (rating < 1 || rating > 5)) {
    throw new ApiRouteError(400, 'INVALID_RATING', 'Rating wajib berada di antara 1 sampai 5.')
  }

  if (feedbackComment && feedbackComment.length > 280) {
    throw new ApiRouteError(400, 'FEEDBACK_TOO_LONG', 'Komentar feedback maksimal 280 karakter.')
  }

  if (!disclaimerAgreed) {
    throw new ApiRouteError(
      400,
      'DISCLAIMER_NOT_AGREED',
      'Disclaimer lokasi kejadian wajib disetujui sebelum mengirim laporan.'
    )
  }

  return {
    category: category as ReportCategory,
    description,
    rating,
    feedback_comment: feedbackComment,
    photo_url: photoUrl,
    lat,
    lng,
    gps_accuracy: gpsAccuracy,
    address,
    kelurahan,
    kecamatan,
    kabupaten,
    provinsi,
    wilayah_id: wilayahId,
    reporter_lat: reporterLat,
    reporter_lon: reporterLon,
    reporter_accuracy: reporterAccuracy,
    reporter_gps_timestamp: reporterGpsTimestamp,
    disclaimer_agreed: disclaimerAgreed,
    disclaimer_agreed_at: disclaimerAgreedAt,
  }
}

export const validateVoteSessionId = (input: unknown) => {
  if (input === null || input === undefined || input === '') return null
  if (typeof input !== 'string') {
    throw new ApiRouteError(400, 'INVALID_SESSION_ID', 'Session ID tidak valid.')
  }

  const trimmed = input.trim()
  if (trimmed.length < 8 || trimmed.length > 128) {
    throw new ApiRouteError(400, 'INVALID_SESSION_ID', 'Session ID tidak valid.')
  }

  return trimmed
}

export const validateStatusUpdateInput = (input: unknown): UpdateReportStatusInput => {
  if (!input || typeof input !== 'object') {
    throw new ApiRouteError(400, 'INVALID_STATUS_PAYLOAD', 'Payload status tidak valid.')
  }

  const payload = input as Record<string, unknown>
  const status = payload.status
  const assignedTo = asNonEmptyString(payload.assignedTo)
  const note = asNonEmptyString(payload.note)

  if (typeof status !== 'string' || !REPORT_STATUSES.includes(status as ReportStatus)) {
    throw new ApiRouteError(400, 'INVALID_STATUS', 'Status laporan tidak valid.')
  }

  if (status === 'ditolak' && !note) {
    throw new ApiRouteError(400, 'REJECTION_NOTE_REQUIRED', 'Status ditolak wajib disertai alasan.')
  }

  return {
    status: status as ReportStatus,
    assignedTo,
    note,
  }
}

export const validateAdminReportStatusFilter = (status: string | null): ReportStatus | null => {
  if (!status || status === 'all') return null

  if (!REPORT_STATUSES.includes(status as ReportStatus)) {
    throw new ApiRouteError(400, 'INVALID_STATUS_FILTER', 'Filter status laporan tidak valid.')
  }

  return status as ReportStatus
}
