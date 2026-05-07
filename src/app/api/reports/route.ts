import {
  ApiRouteError,
  createRequestId,
  jsonError,
  jsonSuccess,
  parseJsonBody,
} from '@/server/lib/api'
import { validateCreateReportInput } from '@/server/modules/reports/report-schemas'
import { submitReport } from '@/server/modules/reports/report-service'

export async function POST(request: Request) {
  const requestId = createRequestId()

  try {
    const body = await parseJsonBody(request)
    const input = validateCreateReportInput(body)
    const report = await submitReport(input)

    return jsonSuccess(report, requestId, 201)
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

    console.error('POST /api/reports failed', { requestId, error })
    return jsonError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem.', requestId)
  }
}
