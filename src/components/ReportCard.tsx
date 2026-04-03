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
          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              report.urgency_score > 80 ? "bg-danger" : report.urgency_score > 50 ? "bg-accent" : "bg-success"
            )} />
            {report.urgency_score}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-bold text-foreground leading-tight truncate pr-2">
              {categoryInfo?.label || 'Laporan Infrastruktur'}
            </h3>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
              style={{ color: statusInfo?.color, backgroundColor: statusInfo?.bgColor }}
            >
              {statusInfo?.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate leading-none">
              {report.address || 'Lokasi Terdeteksi'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-medium text-muted">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(report.created_at)}
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {report.vote_count} votes
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleVote}
              disabled={isVoting || hasVoted}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                hasVoted
                  ? "bg-success-light text-success border border-success/20"
                  : "bg-primary-light text-primary hover:bg-primary hover:text-white"
              )}
            >
              {hasVoted ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Selesai
                </>
              ) : isVoting ? (
                <MoreHorizontal className="w-3 h-3 animate-pulse" />
              ) : (
                <>
                  <ThumbsUp className="w-3 h-3" />
                  Ini Juga Saya Alami
                </>
              )}
            </button>
            <button 
              className="p-2 rounded-xl bg-muted-light text-muted hover:bg-border transition-all active:scale-95"
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
