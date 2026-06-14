// ============================
// Cepuin — Core TypeScript Types
// ============================

export type ReportCategory =
  | 'jalan_berlubang'
  | 'lampu_mati'
  | 'banjir'
  | 'sampah_menumpuk'
  | 'drainase_rusak'
  | 'fasilitas_umum'
  | 'lainnya'

export type ReportStatus =
  | 'dilaporkan'
  | 'diverifikasi'
  | 'dikerjakan'
  | 'selesai'
  | 'ditolak'

export interface Report {
  id: string
  user_id: string | null
  category: ReportCategory
  description: string | null
  rating: number | null
  feedback_comment: string | null
  photo_url: string | null

  // Pin location — lokasi kejadian (penentu wilayah)
  lat: number
  lng: number
  latitude: number | null
  longitude: number | null
  gps_accuracy: number | null
  address: string | null
  kelurahan: string | null
  kecamatan: string | null
  kabupaten: string | null
  provinsi: string | null
  wilayah_id: string | null

  // Reporter GPS — audit only, tidak menentukan wilayah
  reporter_lat: number | null
  reporter_lon: number | null
  reporter_accuracy: number | null
  reporter_gps_timestamp: string | null

  // Auto-calculated by DB trigger
  jarak_pelapor_km: number | null
  risk_flag: boolean
  risk_note: string | null

  // Disclaimer consent
  disclaimer_agreed: boolean
  disclaimer_agreed_at: string | null

  status: ReportStatus
  urgency_score: number
  vote_count: number
  assigned_to: string | null
  processed_at: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  report_id: string
  user_id: string | null
  session_id: string | null
  created_at: string
}

export interface StatusHistory {
  id: string
  report_id: string
  old_status: ReportStatus | null
  new_status: ReportStatus
  changed_by: string
  note: string | null
  created_at: string
}

export interface ReporterGPS {
  lat: number
  lon: number
  accuracy: number
  timestamp: string // ISO string
}

export interface CreateReportInput {
  category: ReportCategory
  description?: string | null
  rating?: number | null
  feedback_comment?: string | null
  photo_url?: string | null

  // Pin location (lokasi kejadian)
  lat: number
  lng: number
  gps_accuracy?: number | null
  address?: string | null
  kelurahan?: string | null
  kecamatan?: string | null
  kabupaten?: string | null
  provinsi?: string | null
  wilayah_id?: string | null

  // Reporter GPS (audit only)
  reporter_lat?: number | null
  reporter_lon?: number | null
  reporter_accuracy?: number | null
  reporter_gps_timestamp?: string | null

  // Disclaimer
  disclaimer_agreed: boolean
  disclaimer_agreed_at?: string | null
}

export interface UpdateReportStatusInput {
  status: ReportStatus
  assignedTo?: string | null
  note?: string | null
}

export interface ApiErrorPayload {
  code: string
  message: string
  requestId?: string
  details?: unknown
}

export interface ApiSuccessResponse<T> {
  ok: true
  data: T
  requestId: string
}

export interface ApiErrorResponse {
  ok: false
  error: ApiErrorPayload
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface SearchLocationResult {
  lat: string
  lon: string
  display_name: string
}

export interface Wilayah {
  id: string
  nama: string
  tipe: 'kota' | 'kabupaten'
  provinsi: string
  keywords: string[] | null
}

export interface GeocodeAddress {
  kelurahan: string | null
  kecamatan: string | null
  kabupaten: string | null
  provinsi: string | null
}

export interface ReverseGeocodeResult extends GeocodeAddress {
  displayName: string
}

export interface DetectedLocation extends ReverseGeocodeResult {
  lat: number
  lng: number
  accuracy: number | null
  wilayahId: string | null
}

/** Collected silently at submit time — not shown to user, not used for routing */
export interface ReporterGPSResult {
  lat: number
  lon: number
  accuracy: number
  timestamp: string
}

export interface WilayahStats {
  totalReports: number
  resolvedReports: number
  completionRate: number
  averageResolutionHours: number | null
  categoryBreakdown: Record<ReportCategory, number>
}

// Category display info for UI
export interface CategoryInfo {
  value: ReportCategory
  label: string
  icon: string
  urgency: number
}

export const CATEGORIES: CategoryInfo[] = [
  { value: 'jalan_berlubang', label: 'Jalan Berlubang', icon: 'AlertTriangle', urgency: 90 },
  { value: 'lampu_mati', label: 'Lampu Jalan Mati', icon: 'LightbulbOff', urgency: 70 },
  { value: 'banjir', label: 'Banjir / Genangan', icon: 'CloudRain', urgency: 95 },
  { value: 'sampah_menumpuk', label: 'Sampah Menumpuk', icon: 'Trash2', urgency: 60 },
  { value: 'drainase_rusak', label: 'Drainase Rusak', icon: 'Droplets', urgency: 75 },
  { value: 'fasilitas_umum', label: 'Fasilitas Umum Rusak', icon: 'Building2', urgency: 55 },
  { value: 'lainnya', label: 'Lainnya', icon: 'MoreHorizontal', urgency: 50 },
]

// Status display info for UI
export interface StatusInfo {
  value: ReportStatus
  label: string
  color: string
  bgColor: string
}

export const STATUSES: StatusInfo[] = [
  { value: 'dilaporkan', label: 'Dilaporkan', color: '#F59E0B', bgColor: '#FEF3C7' },
  { value: 'diverifikasi', label: 'Diverifikasi', color: '#2563EB', bgColor: '#DBEAFE' },
  { value: 'dikerjakan', label: 'Dikerjakan', color: '#F97316', bgColor: '#FFEDD5' },
  { value: 'selesai', label: 'Selesai', color: '#10B981', bgColor: '#D1FAE5' },
  { value: 'ditolak', label: 'Ditolak', color: '#EF4444', bgColor: '#FEE2E2' },
]
