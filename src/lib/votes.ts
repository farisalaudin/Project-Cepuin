// ============================
// Voting Utilities
// ============================

import type { ApiResponse, Report } from '@/types'

/**
 * Submit a vote for a report.
 * Handles both authenticated and anonymous users.
 * 
 * @param reportId - ID of the report to vote for
 */
export const submitVote = async (reportId: string): Promise<Report> => {
  const response = await fetch(`/api/reports/${reportId}/vote`, {
    method: 'POST',
    credentials: 'same-origin',
  })

  const payload = (await response.json()) as ApiResponse<Report>

  if (!response.ok || !payload.ok) {
    if (!payload.ok && payload.error.code === 'ALREADY_VOTED') {
      throw new Error('Anda sudah memberikan dukungan untuk laporan ini.')
    }
    console.error('Vote error:', payload)
    throw new Error('Gagal memberikan dukungan. Silakan coba lagi.')
  }

  return payload.data
}
