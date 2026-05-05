'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { 
  Heart,
  MapPin, 
  Clock, 
  ChevronRight,
  AlertTriangle,
  LightbulbOff,
  CloudRain,
  Trash2,
  Droplets,
  Building2,
  MoreHorizontal,
  LucideIcon,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Report, STATUSES, CATEGORIES } from '@/types'
import { cn } from '@/lib/cn'
import { useRouter } from 'next/navigation'
import { submitVote } from '@/lib/votes'
import { formatTimeAgo } from '@/lib/utils'

interface ReportCardProps {
  report: Report
  onVoteSuccess?: (reportId: string) => void
}

const iconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  LightbulbOff,
  CloudRain,
  Trash2,
  Droplets,
  Building2,
  MoreHorizontal
}

export default function ReportCard({ report, onVoteSuccess }: ReportCardProps) {
  const router = useRouter()
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const categoryInfo = CATEGORIES.find(c => c.value === report.category)
  const statusInfo = STATUSES.find(s => s.value === report.status)
  const CategoryIcon = categoryInfo ? iconMap[categoryInfo.icon] : MoreHorizontal
  const photoSrc = report.photo_url?.trim() ?? ''

  const isValidPhotoUrl = (() => {
    if (!photoSrc) return false

    try {
      const parsed = new URL(photoSrc)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) return false

      const supabaseHost = new URL(supabaseUrl).hostname
      return parsed.hostname === supabaseHost
    } catch {
      return false
    }
  })()

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isVoting || hasVoted) return

    setIsVoting(true)
    try {
      await submitVote(report.id)
      setHasVoted(true)
      onVoteSuccess?.(report.id)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsVoting(false)
    }
  }

  const handleOpenDetail = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    router.push(`/laporan/${report.id}`)
  }

  return (
    <div 
      onClick={() => handleOpenDetail()}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:border-primary-light hover:shadow-xl"
    >
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted-light sm:h-24 sm:w-24">
          {isValidPhotoUrl ? (
            <Image
              src={photoSrc}
              alt={report.category}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">
              <CategoryIcon className="w-8 h-8" />
            </div>
          )}
          {/* Urgency Badge Overlay */}
          <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[9px] font-black text-white shadow-xl sm:left-2 sm:top-2 sm:gap-1.5 sm:px-2.5 sm:text-[10px]">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              report.urgency_score > 80 ? "bg-danger" : report.urgency_score > 50 ? "bg-accent" : "bg-success"
            )} />
            {report.urgency_score}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate pr-2 text-sm font-black leading-tight tracking-tight text-foreground sm:text-[15px]">
              {categoryInfo?.label || 'Laporan Infrastruktur'}
            </h3>
            <span 
              className="whitespace-nowrap rounded-xl px-2 py-1 text-[9px] font-black uppercase tracking-wider shadow-sm"
              style={{ color: statusInfo?.color, backgroundColor: `${statusInfo?.bgColor}CC` }}
            >
              {statusInfo?.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-muted/70 sm:text-[11px]">
            <MapPin className="h-3 w-3 flex-shrink-0 text-primary/50" />
            <span className="truncate">
              {report.address || 'Lokasi Terdeteksi'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.1em] text-muted/50 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(report.created_at)}
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3 w-3 text-danger/60" />
              {report.vote_count}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleVote}
              disabled={isVoting || hasVoted}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 sm:px-4",
                hasVoted
                  ? "bg-success-light/50 text-success border border-success/20"
                  : "bg-danger-light/50 text-danger hover:bg-danger hover:text-white hover:shadow-danger/20"
              )}
            >
              {hasVoted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Didukung
                </>
              ) : isVoting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Heart className="w-3.5 h-3.5" />
                  Dukung
                </>
              )}
            </button>
            <button 
              className="rounded-2xl bg-muted-light/50 p-2.5 text-muted shadow-sm transition-all hover:bg-border hover:text-foreground active:scale-95"
              onClick={(e) => handleOpenDetail(e)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
