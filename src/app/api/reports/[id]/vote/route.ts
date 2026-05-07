import { ApiRouteError, createRequestId, jsonError, jsonSuccess, parseJsonBody } from '@/server/lib/api'
import { validateVoteSessionId } from '@/server/modules/reports/report-schemas'
import { submitReportVote } from '@/server/modules/reports/report-service'

type VoteBody = {
  sessionId?: string | null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId()

  try {
    const { id } = await context.params
    if (!id) {
      throw new ApiRouteError(400, 'INVALID_REPORT_ID', 'ID laporan tidak valid.')
    }

    const body = await parseJsonBody<VoteBody>(request)
    const sessionId = validateVoteSessionId(body.sessionId ?? null)
    const report = await submitReportVote(id, sessionId)

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

    console.error('POST /api/reports/[id]/vote failed', { requestId, error })
    return jsonError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan sistem.', requestId)
  }
}
