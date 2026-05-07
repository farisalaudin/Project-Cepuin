// ============================
// Voting Utilities
// ============================

import { supabase } from './supabase/client'
import { getSessionId } from './session'
import type { ApiResponse, Report } from '@/types'

/**
 * Submit a vote for a report.
 * Handles both authenticated and anonymous users.
 * 
 * @param reportId - ID of the report to vote for
 */
export const submitVote = async (reportId: string) => {
  const sessionId = getSessionId()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const response = await fetch(`/api/reports/${reportId}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: user ? null : sessionId,
    }),
  })

  const payload = (await response.json()) as ApiResponse<Report>

  if (!response.ok || !payload.ok) {
    if (!payload.ok && payload.error.code === 'ALREADY_VOTED') {
      throw new Error('Anda sudah memberikan dukungan untuk laporan ini.')
    }
    console.error('Vote error:', payload)
    throw new Error('Gagal memberikan dukungan. Silakan coba lagi.')
  }
}
