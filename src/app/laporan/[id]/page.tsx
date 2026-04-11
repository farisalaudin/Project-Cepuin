'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Share2, 
  MapPin, 
  ThumbsUp, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Report, StatusHistory, STATUSES, CATEGORIES } from '@/types'
import { cn } from '@/lib/cn'
import { submitVote } from '@/lib/votes'
import dynamic from 'next/dynamic'
import Image from 'next/image'

const MapPreview = dynamic(() => import('@/components/MapPreview'), { ssr: false })

export default function LaporanDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single()
      
      if (reportError) throw reportError
      setReport(reportData as Report)

      const { data: historyData } = await supabase
        .from('status_history')
        .select('*')
        .eq('report_id', id)
        .order('created_at', { ascending: false })
      
      setHistory(historyData as StatusHistory[] || [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleVote = async () => {
    if (!report || isVoting || hasVoted) return
    setIsVoting(true)
    try {
      await submitVote(report.id)
      setHasVoted(true)
      fetchData()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsVoting(false)
    }
  }

  const handleShare = async () => {
    if (!report) return
    const url = window.location.href
    const text = `Laporan ${report.category.replace('_', ' ')} di ${report.address}. Dukung laporan ini di Cepuin!`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cepuin - Laporan Infrastruktur',
          text: text,
          url: url,
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
    } else {
      navigator.clipboard.writeText(url)
      alert('Link disalin ke clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold text-muted uppercase tracking-widest">Memuat Detail Laporan...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-muted-light rounded-[32px] flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-muted" />
        </div>
        <h1 className="text-xl font-black text-foreground uppercase tracking-tight">Laporan Tidak Ditemukan</h1>
        <p className="text-sm text-muted mt-2 max-w-xs leading-relaxed">
          Mungkin laporan ini sudah dihapus atau link yang kamu gunakan salah.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="mt-8 px-8 py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
  }

  const categoryInfo = CATEGORIES.find(c => c.value === report.category)
  const statusInfo = STATUSES.find(s => s.value === report.status)

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-lg mx-auto shadow-2xl">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-lg border-b border-border shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-xl bg-muted-light text-muted hover:text-foreground transition-all active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-black text-foreground uppercase tracking-widest">
          Detail Laporan
        </h1>
        <button 
          onClick={handleShare}
          className="p-2.5 rounded-xl bg-primary-light/50 text-primary hover:bg-primary-light transition-all active:scale-95"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 space-y-8 pb-20">
        {/* Photo Section */}
        <div className="relative aspect-video bg-muted-light border-b border-border shadow-inner">
          {report.photo_url ? (
            <Image 
              src={report.photo_url} 
              alt={report.category} 
              fill 
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-2">
              <AlertTriangle className="w-12 h-12 opacity-20" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada foto</p>
            </div>
          )}
          {/* Status Badge Overlay */}
          <div 
            className="absolute top-4 left-4 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md"
            style={{ color: statusInfo?.color, backgroundColor: statusInfo?.bgColor + 'CC' }}
          >
            {statusInfo?.label}
          </div>
        </div>

        {/* Info Content */}
        <div className="px-6 space-y-8">
          {/* Title & Stats */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-foreground tracking-tight leading-tight">
                  {categoryInfo?.label}
                </h2>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted mt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {report.address}
                </div>
              </div>
              <div className="bg-primary-light/30 px-4 py-2 rounded-2xl text-center flex-shrink-0 border border-primary/5">
                <p className="text-xl font-black text-primary leading-none">{report.urgency_score}</p>
                <p className="text-[8px] font-bold text-primary-dark uppercase tracking-widest mt-1">Urgensi</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-[10px] font-bold text-muted uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {new Date(report.created_at).toLocaleDateString('id-ID', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </div>
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-accent" />
                {report.vote_count} Dukungan
              </div>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div className="p-6 bg-muted-light/30 rounded-3xl border border-border/50 relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-white px-3 py-0.5 rounded-full border border-border text-[8px] font-black text-muted uppercase tracking-widest">
                Keterangan Warga
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                &quot;{report.description}&quot;
              </p>
            </div>
          )}

          {/* Assigned To */}
          {report.assigned_to && (
            <div className="p-4 bg-primary-light/10 rounded-2xl border border-primary/10 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Petugas Lapangan</p>
                <p className="text-sm font-bold text-foreground capitalize">{report.assigned_to}</p>
              </div>
            </div>
          )}

          {/* Map Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest ml-1">Titik Lokasi</h3>
            <div className="h-48 w-full rounded-3xl overflow-hidden border-2 border-border shadow-xl">
              <MapPreview lat={report.lat} lng={report.lng} />
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-6 pt-4">
            <h3 className="text-xs font-black text-muted uppercase tracking-widest ml-1">Perkembangan Penanganan</h3>
            <div className="relative space-y-8 pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {/* current status */}
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm z-10 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Status Saat Ini</p>
                  <p className="text-sm font-bold text-foreground capitalize">{report.status}</p>
                </div>
              </div>

              {/* history */}
              {history.map((h) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-border border-4 border-white shadow-sm z-10" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">
                        {new Date(h.created_at).toLocaleDateString('id-ID', { 
                          day: 'numeric', month: 'short' 
                        })}
                      </p>
                      <p className="text-[10px] font-bold text-muted italic">Oleh: {h.changed_by}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground capitalize">Update: &quot;{h.new_status}&quot;</p>
                    {h.note && <p className="text-xs text-muted leading-relaxed">{h.note}</p>}
                  </div>
                </div>
              ))}

              {/* initial report */}
              <div className="relative">
                <div className="absolute -left-[27px] top-1 w-4 h-4 rounded-full bg-success-light border-4 border-white shadow-sm z-10" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-success uppercase tracking-widest">Laporan Masuk</p>
                  <p className="text-sm font-bold text-foreground">Masalah berhasil dilaporkan oleh warga.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="sticky bottom-0 p-6 bg-white/90 backdrop-blur-md border-t border-border flex items-center gap-4">
        <button
          onClick={handleVote}
          disabled={isVoting || hasVoted}
          className={cn(
            "flex-1 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl",
            hasVoted
              ? "bg-success-light text-success border-2 border-success/20 shadow-success/10"
              : "bg-primary text-white hover:bg-primary-dark shadow-primary/20"
          )}
        >
          {hasVoted ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Sudah Didukung
            </>
          ) : isVoting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <ThumbsUp className="w-5 h-5" />
              Dukung Masalah Ini
            </>
          )}
        </button>
      </div>
    </main>
  )
}