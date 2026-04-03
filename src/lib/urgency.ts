// ============================
// Urgency Score Calculator
// ============================

import type { ReportCategory } from '@/types'

/** Base urgency values per category (0-100) */
const CATEGORY_URGENCY: Record<ReportCategory, number> = {
  jalan_berlubang: 90,
  lampu_mati: 70,
  banjir: 95,
  sampah_menumpuk: 60,
  drainase_rusak: 75,
  fasilitas_umum: 55,
  lainnya: 50,
}

/**
 * Calculate urgency score for a report.
 * Formula: (vote_score × 0.4) + (category_urgency × 0.4) + (time_decay × 0.2)
 *
 * @param voteCount - Number of votes on the report
 * @param category - Report category
 * @param createdAt - ISO timestamp of when report was created
 * @returns Urgency score (0-100)
 */
export const calculateUrgencyScore = (
  voteCount: number,
  category: ReportCategory,
  createdAt: string
): number => {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / 86400000
  const timeScore = Math.min(100, daysSince * 3)
  const categoryScore = CATEGORY_URGENCY[category] ?? 50

  // Normalize votes: cap at 100, assume 50 votes = max score
  const voteScore = Math.min(100, voteCount * 2)

  return Math.round(
    (voteScore * 0.4) + (categoryScore * 0.4) + (timeScore * 0.2)
  )
}
