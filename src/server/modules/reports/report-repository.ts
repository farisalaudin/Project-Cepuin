import { DUPLICATE_RADIUS_METERS, getDistanceInMeters } from '@/lib/geo'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CreateReportInput, Report, ReportStatus } from '@/types'

const OPEN_REPORT_STATUSES: ReportStatus[] = ['dilaporkan', 'diverifikasi', 'dikerjakan']

export class ReportRepository {
  constructor(
    private readonly client: Awaited<ReturnType<typeof createSupabaseServerClient>>
  ) {}

  async findNearbyOpenDuplicates(input: CreateReportInput): Promise<Report[]> {
    const radiusDegrees = 0.00045

    const { data, error } = await this.client
      .from('reports')
      .select('*')
      .eq('category', input.category)
      .in('status', OPEN_REPORT_STATUSES)
      .gte('lat', input.lat - radiusDegrees)
      .lte('lat', input.lat + radiusDegrees)
      .gte('lng', input.lng - radiusDegrees)
      .lte('lng', input.lng + radiusDegrees)

    if (error) {
      throw new Error(error.message)
    }

    return ((data as Report[]) ?? []).filter(
      (report) =>
        getDistanceInMeters(input.lat, input.lng, report.lat, report.lng) <=
        DUPLICATE_RADIUS_METERS
    )
  }

  async submitReport(input: CreateReportInput): Promise<Report> {
    const { data, error } = await this.client.rpc('submit_report', {
      report_category: input.category,
      report_description: input.description?.trim() || null,
      report_rating: input.rating ?? null,
      report_feedback_comment: input.feedback_comment?.trim() || null,
      report_photo_url: input.photo_url?.trim() || null,
      report_lat: input.lat,
      report_lng: input.lng,
      report_gps_accuracy: input.gps_accuracy ?? null,
      report_address: input.address?.trim() || null,
      report_kelurahan: input.kelurahan?.trim() || null,
      report_kecamatan: input.kecamatan?.trim() || null,
      report_kabupaten: input.kabupaten?.trim() || null,
      report_provinsi: input.provinsi?.trim() || null,
      report_wilayah_id: input.wilayah_id ?? null,
      // Reporter GPS — audit metadata only, DB trigger calculates jarak & risk_flag
      report_reporter_lat: input.reporter_lat ?? null,
      report_reporter_lon: input.reporter_lon ?? null,
      report_reporter_accuracy: input.reporter_accuracy ?? null,
      report_reporter_gps_timestamp: input.reporter_gps_timestamp ?? null,
      // Disclaimer consent
      report_disclaimer_agreed: input.disclaimer_agreed,
      report_disclaimer_agreed_at: input.disclaimer_agreed_at ?? null,
    })

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string; details?: string | null }).code = error.code
      ;(err as Error & { code?: string; details?: string | null }).details = error.details
      throw err
    }

    return data as Report
  }

  async isCurrentUserAdmin(userId: string, email?: string | null): Promise<boolean> {
    const adminUsersResult = await this.client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (adminUsersResult.error) {
      const err = new Error(adminUsersResult.error.message)
      ;(err as Error & { code?: string }).code = adminUsersResult.error.code
      throw err
    }

    if (adminUsersResult.data) return true
    if (!email) return false

    const { data, error } = await this.client
      .from('admin')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string }).code = error.code
      throw err
    }

    return Boolean(data)
  }

  private async getCurrentAdminWilayahId(): Promise<string | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser()

    if (!user?.email) return null

    const { data, error } = await this.client
      .from('admin')
      .select('wilayah_id')
      .eq('email', user.email)
      .maybeSingle()

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string }).code = error.code
      throw err
    }

    return data?.wilayah_id ?? null
  }

  async listAdminReports(status?: ReportStatus | null): Promise<Report[]> {
    const wilayahId = await this.getCurrentAdminWilayahId()
    let query = this.client
      .from('reports')
      .select('*')
      .order('urgency_score', { ascending: false })

    if (wilayahId) {
      query = query.eq('wilayah_id', wilayahId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string }).code = error.code
      throw err
    }

    return (data as Report[]) ?? []
  }

  async submitVote(reportId: string, sessionId: string | null): Promise<Report> {
    const { data, error } = await this.client.rpc('submit_vote', {
      target_report_id: reportId,
      actor_session_id: sessionId,
    })

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string }).code = error.code
      throw err
    }

    return data as Report
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    assignedTo?: string | null,
    note?: string | null
  ): Promise<Report> {
    const { data, error } = await this.client.rpc('admin_update_report_status', {
      target_report_id: reportId,
      target_status: status,
      actor_assigned_to: assignedTo?.trim() || null,
      actor_note: note?.trim() || null,
    })

    if (error) {
      const err = new Error(error.message)
      ;(err as Error & { code?: string }).code = error.code
      throw err
    }

    return data as Report
  }
}
