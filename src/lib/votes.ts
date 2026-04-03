// ============================
// Voting Utilities
// ============================

import { supabase } from './supabase'
import { getSessionId } from './session'
import { calculateUrgencyScore } from './urgency'
import type { ReportCategory } from '@/types'

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

  // Recalculate urgency score after vote
  await recalculateUrgency(reportId)
}

/**
 * Recalculate and update the urgency score for a given report.
 * Called after every new vote.
 */
export const recalculateUrgency = async (reportId: string) => {
  const { data: report, error } = await supabase
    .from('reports')
    .select('vote_count, category, created_at')
    .eq('id', reportId)
    .single()

  if (error || !report) return

  const newScore = calculateUrgencyScore(
    report.vote_count,
    report.category as ReportCategory,
    report.created_at
  )

  await supabase
    .from('reports')
    .update({ urgency_score: newScore })
    .eq('id', reportId)
}
