'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { 
  ThumbsUp, 
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
  CheckCircle2
} from 'lucide-react'
import { Report, STATUSES, CATEGORIES } from '@/types'
import { cn } from '@/lib/cn'
import { useRouter } from 'next/navigation'
import { submitVote } from '@/lib/votes'

interface ReportCardProps {
  report: Report
  onVoteSuccess?: () => void
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

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isVoting || hasVoted) return

    setIsVoting(true)
    try {
      await submitVote(report.id)
      setHasVoted(true)
      onVoteSuccess?.()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsVoting(false)
    }
  }

  const timeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000)

    if (diff < 60) return 'Baru saja'
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
    return `${Math.floor(diff / 86400)} hari lalu`
  }

  return (
    <div 
      onClick={() => router.push(`/laporan/${report.id}`)}
      className="group bg-white rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary-light transition-all duration-300 cursor-pointer"
    >
      <div className="flex p-4 gap-4">
        {/* Thumbnail */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted-light flex-shrink-0">
          {report.photo_url ? (
            <Image
              src={report.photo_url}
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
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white flex items-center gap-1.5 shadow-xl">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              report.urgency_score > 80 ? "bg-danger" : report.urgency_score > 50 ? "bg-accent" : "bg-success"
            )} />
            {report.urgency_score}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-black text-foreground leading-tight truncate pr-2 uppercase tracking-tight">
              {categoryInfo?.label || 'Laporan Infrastruktur'}
            </h3>
            <span 
              className="text-[9px] font-black px-2.5 py-1 rounded-xl whitespace-nowrap uppercase tracking-wider shadow-sm"
              style={{ color: statusInfo?.color, backgroundColor: statusInfo?.bgColor + 'CC', backdropFilter: 'blur(4px)' }}
            >
              {statusInfo?.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted/60 uppercase tracking-wide">
            <MapPin className="w-3 h-3 flex-shrink-0 text-primary/50" />
            <span className="truncate leading-none">
              {report.address || 'Lokasi Terdeteksi'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[9px] font-black text-muted/40 uppercase tracking-[0.1em]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {timeAgo(report.created_at)}
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="w-3 h-3 text-accent/60" />
              {report.vote_count} votes
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={handleVote}
              disabled={isVoting || hasVoted}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm",
                hasVoted
                  ? "bg-success-light/50 text-success border border-success/20"
                  : "bg-primary-light/50 text-primary hover:bg-primary hover:text-white hover:shadow-primary/20"
              )}
            >
              {hasVoted ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selesai
                </>
              ) : isVoting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Dukung
                </>
              )}
            </button>
            <button 
              className="p-2.5 rounded-2xl bg-muted-light/50 text-muted hover:text-foreground hover:bg-border transition-all active:scale-95 shadow-sm"
              onClick={() => {}} // Navigate to detail
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
