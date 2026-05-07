import { ApiRouteError, createRequestId, jsonError, jsonSuccess, parseJsonBody } from '@/server/lib/api'
import { validateStatusUpdateInput } from '@/server/modules/reports/report-schemas'
import { changeReportStatus } from '@/server/modules/reports/report-service'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId()

  try {
    const { id } = await context.params
    if (!id) {
      throw new ApiRouteError(400, 'INVALID_REPORT_ID', 'ID laporan tidak valid.')
    }

    const body = await parseJsonBody(request)
    const input = validateStatusUpdateInput(body)
    const report = await changeReportStatus(id, input)

    return jsonSuccess(report, requestId, 200)
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

    console.error('PATCH /api/admin/reports/[id]/status failed', { requestId, error })
    return jsonError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem.', requestId)
  }
}
