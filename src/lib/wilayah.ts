import { supabase } from '@/lib/supabase/client'
import { CATEGORIES, GeocodeAddress, Report, ReportCategory, Wilayah, WilayahStats } from '@/types'

const EMPTY_CATEGORY_BREAKDOWN = CATEGORIES.reduce(
  (acc, category) => ({ ...acc, [category.value]: 0 }),
  {} as Record<ReportCategory, number>
)

export const listWilayah = async (): Promise<Wilayah[]> => {
  const { data, error } = await supabase
    .from('wilayah')
    .select('id, nama, tipe, provinsi, keywords')
    .order('nama', { ascending: true })

  if (error) {
    console.error('Wilayah list error:', error)
    return []
  }

  return (data as Wilayah[]) ?? []
}

export const matchWilayahId = async (
  geocodeResult: GeocodeAddress & { displayName?: string },
  wilayahList?: Wilayah[]
): Promise<string | null> => {
  const wilayah = wilayahList ?? await listWilayah()

  // Haystack mencakup semua field geocode + teks alamat lengkap dari Nominatim.
  // Urutan: displayName dulu (paling lengkap), lalu field individual.
  const haystack = [
    geocodeResult.displayName,
    geocodeResult.kabupaten,
    geocodeResult.kecamatan,
    geocodeResult.kelurahan,
    geocodeResult.provinsi,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const matched = wilayah.find((item) =>
    (item.keywords ?? []).some((keyword) =>
      haystack.includes(keyword.toLowerCase())
    )
  )

  return matched?.id ?? null
}

export const getReportsByWilayah = async (
  wilayahId: string,
  limit = 20,
  centerLat?: number,
  centerLng?: number
): Promise<Report[]> => {
  // Primary: reports yang sudah ter-assign ke wilayah ini
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('wilayah_id', wilayahId)
    .order('urgency_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Wilayah reports error:', error)
    return []
  }

  const primary = (data as Report[]) ?? []

  // Jika ada sisa slot DAN ada koordinat center → ambil laporan terdekat yg wilayah_id-nya null
  const remaining = limit - primary.length
  if (remaining <= 0 || !centerLat || !centerLng) return primary

  // Bounding box ~30km untuk cover wilayah yang sama
  const RADIUS_DEG = 0.27
  const { data: nullData, error: nullError } = await supabase
    .from('reports')
    .select('*')
    .is('wilayah_id', null)
    .gte('lat', centerLat - RADIUS_DEG)
    .lte('lat', centerLat + RADIUS_DEG)
    .gte('lng', centerLng - RADIUS_DEG)
    .lte('lng', centerLng + RADIUS_DEG)
    .order('urgency_score', { ascending: false })
    .limit(remaining)

  if (nullError) return primary

  const nearby = (nullData as Report[]) ?? []
  const primaryIds = new Set(primary.map((r) => r.id))
  return [...primary, ...nearby.filter((r) => !primaryIds.has(r.id))]
}

export const getWilayahStats = async (
  wilayahId: string | null
): Promise<WilayahStats> => {
  if (!wilayahId) {
    return {
      totalReports: 0,
      resolvedReports: 0,
      completionRate: 0,
      averageResolutionHours: null,
      categoryBreakdown: { ...EMPTY_CATEGORY_BREAKDOWN },
    }
  }

  const { data, error } = await supabase
    .from('reports')
    .select('category, status, created_at, resolved_at')
    .eq('wilayah_id', wilayahId)

  if (error) {
    console.error('Wilayah stats error:', error)
    return {
      totalReports: 0,
      resolvedReports: 0,
      completionRate: 0,
      averageResolutionHours: null,
      categoryBreakdown: { ...EMPTY_CATEGORY_BREAKDOWN },
    }
  }

  const reports = (data ?? []) as Pick<Report, 'category' | 'status' | 'created_at' | 'resolved_at'>[]
  const totalReports = reports.length
  const resolvedReports = reports.filter((report) => report.status === 'selesai').length
  const totalResolutionHours = reports.reduce((total, report) => {
    if (!report.resolved_at) return total

    const createdAt = new Date(report.created_at).getTime()
    const resolvedAt = new Date(report.resolved_at).getTime()
    if (!Number.isFinite(createdAt) || !Number.isFinite(resolvedAt) || resolvedAt < createdAt) {
      return total
    }

    return total + ((resolvedAt - createdAt) / 36e5)
  }, 0)

  const categoryBreakdown = reports.reduce(
    (acc, report) => ({
      ...acc,
      [report.category]: (acc[report.category] ?? 0) + 1,
    }),
    { ...EMPTY_CATEGORY_BREAKDOWN }
  )

  return {
    totalReports,
    resolvedReports,
    completionRate: totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0,
    averageResolutionHours: resolvedReports > 0 ? Math.round(totalResolutionHours / resolvedReports) : null,
    categoryBreakdown,
  }
}
