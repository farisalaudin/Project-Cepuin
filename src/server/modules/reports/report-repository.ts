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
      report_photo_url: input.photo_url?.trim() || null,
      report_lat: input.lat,
      report_lng: input.lng,
      report_address: input.address?.trim() || null,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data as Report
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
