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

export const validateCreateReportInput = (input: unknown): CreateReportInput => {
  if (!input || typeof input !== 'object') {
    throw new ApiRouteError(400, 'INVALID_REPORT_PAYLOAD', 'Payload laporan tidak valid.')
  }

  const payload = input as Record<string, unknown>
  const category = payload.category
  const lat = asFiniteNumber(payload.lat)
  const lng = asFiniteNumber(payload.lng)
  const description = asNonEmptyString(payload.description)
  const photoUrl = asNonEmptyString(payload.photo_url)
  const address = asNonEmptyString(payload.address)

  if (typeof category !== 'string' || !REPORT_CATEGORIES.includes(category as ReportCategory)) {
    throw new ApiRouteError(400, 'INVALID_CATEGORY', 'Kategori laporan tidak valid.')
  }

  if (lat === null || lng === null) {
    throw new ApiRouteError(400, 'INVALID_COORDINATES', 'Koordinat laporan wajib valid.')
  }

  if (description && description.length > 280) {
    throw new ApiRouteError(400, 'DESCRIPTION_TOO_LONG', 'Deskripsi maksimal 280 karakter.')
  }

  return {
    category: category as ReportCategory,
    description,
    photo_url: photoUrl,
    lat,
    lng,
    address,
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
