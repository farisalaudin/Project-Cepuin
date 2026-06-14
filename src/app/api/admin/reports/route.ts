import {
  ApiRouteError,
  createRequestId,
  jsonError,
  jsonSuccess,
} from '@/server/lib/api'
import { validateAdminReportStatusFilter } from '@/server/modules/reports/report-schemas'
import { listAdminReports } from '@/server/modules/reports/report-service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestId = createRequestId()

  try {
    const { searchParams } = new URL(request.url)
    const status = validateAdminReportStatusFilter(searchParams.get('status'))
    const reports = await listAdminReports(status)

    return jsonSuccess(reports, requestId)
  } catch (error) {
    if (error instanceof ApiRouteError) {
      return jsonError(
        error.status,
        error.code,
        error.message,
        requestId,
        error.details
      )
    }

    console.error('GET /api/admin/reports failed', { requestId, error })
    return jsonError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem.', requestId)
  }
}
