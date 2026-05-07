import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ApiRouteError } from '@/server/lib/api'
import { ReportRepository } from '@/server/modules/reports/report-repository'
import type { CreateReportInput, Report, UpdateReportStatusInput } from '@/types'

const DUPLICATE_LIMIT = 3

const mapRepositoryError = (error: unknown): never => {
  const typedError = error as Error & { code?: string }

  if (typedError.code === '23505') {
    throw new ApiRouteError(409, 'ALREADY_VOTED', 'Anda sudah memberikan dukungan untuk laporan ini.')
  }

  if (typedError.code === '42501') {
    throw new ApiRouteError(403, 'FORBIDDEN', typedError.message || 'Akses ditolak.')
  }

  if (typedError.code === 'P0002') {
    throw new ApiRouteError(404, 'REPORT_NOT_FOUND', typedError.message || 'Laporan tidak ditemukan.')
  }

  if (typedError.code === 'P0001') {
    throw new ApiRouteError(400, 'INVALID_OPERATION', typedError.message || 'Operasi tidak valid.')
  }

  throw new ApiRouteError(500, 'INTERNAL_ERROR', typedError.message || 'Terjadi kesalahan sistem.')
}

const createRepository = async () => {
  const client = await createSupabaseServerClient()
  return new ReportRepository(client)
}

export const submitReport = async (input: CreateReportInput) => {
  const repository = await createRepository()

  try {
    const duplicates = await repository.findNearbyOpenDuplicates(input)
    if (duplicates.length > 0) {
      throw new ApiRouteError(
        409,
        'DUPLICATE_REPORT',
        'Masalah serupa sudah dilaporkan di lokasi yang sama.',
        duplicates.slice(0, DUPLICATE_LIMIT)
      )
    }

    const report = await repository.submitReport(input)
    return report
  } catch (error) {
    if (error instanceof ApiRouteError) throw error
    return mapRepositoryError(error)
  }
}

export const submitReportVote = async (reportId: string, sessionId: string | null): Promise<Report> => {
  const repository = await createRepository()

  try {
    return await repository.submitVote(reportId, sessionId)
  } catch (error) {
    return mapRepositoryError(error)
  }
}

export const changeReportStatus = async (
  reportId: string,
  input: UpdateReportStatusInput
): Promise<Report> => {
  const repository = await createRepository()

  try {
    return await repository.updateReportStatus(
      reportId,
      input.status,
      input.assignedTo,
      input.note
    )
  } catch (error) {
    return mapRepositoryError(error)
  }
}
