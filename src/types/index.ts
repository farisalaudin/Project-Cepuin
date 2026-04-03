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
  photo_url: string | null
  lat: number
  lng: number
  address: string | null
  status: ReportStatus
  urgency_score: number
  vote_count: number
  assigned_to: string | null
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
