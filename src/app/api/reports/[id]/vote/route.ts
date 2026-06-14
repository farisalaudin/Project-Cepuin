import { createSupabaseServerClient } from '@/lib/supabase/server'
import { attachAnonymousSessionCookie, ensureAnonymousSessionId } from '@/server/lib/anonymous-session'
import { ApiRouteError, createRequestId, jsonError, jsonSuccess } from '@/server/lib/api'
import { submitReportVote } from '@/server/modules/reports/report-service'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId()

  try {
    const { id } = await context.params
    if (!id) {
      throw new ApiRouteError(400, 'INVALID_REPORT_ID', 'ID laporan tidak valid.')
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const anonymousSession = user ? null : await ensureAnonymousSessionId()
    const sessionId = user ? null : anonymousSession?.sessionId ?? null
    const report = await submitReportVote(id, sessionId)
    const response = jsonSuccess(report, requestId, 200)

    if (anonymousSession?.isNew) {
      attachAnonymousSessionCookie(response, anonymousSession.sessionId)
    }

    return response
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
