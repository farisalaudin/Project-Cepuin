// ============================
// Voting Utilities
// ============================

import { supabase } from './supabase/client'
import { getSessionId } from './session'

/**
 * Submit a vote for a report.
 * Handles both authenticated and anonymous users.
 * 
 * @param reportId - ID of the report to vote for
 */
export const submitVote = async (reportId: string) => {
  const sessionId = getSessionId()
  const { data: { user } } = await supabase.auth.getUser()

  // Enforce 1 vote per user OR 1 vote per session
  const { error } = await supabase.from('votes').insert({
    report_id: reportId,
    user_id: user?.id ?? null,
    session_id: user ? null : sessionId,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Anda sudah memberikan dukungan untuk laporan ini.')
    }
    console.error('Vote error:', error)
    throw new Error('Gagal memberikan dukungan. Silakan coba lagi.')
  }
}
