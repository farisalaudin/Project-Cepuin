'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  Share2,
  ThumbsUp,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'
import { submitVote } from '@/lib/votes'
import { CATEGORIES, Report, STATUSES, StatusHistory } from '@/types'

const MapPreview = dynamic(() => import('@/components/MapPreview'), { ssr: false })

const resolveSafePhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl?.trim()) return null

  try {
    const parsed = new URL(photoUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

    const host = parsed.hostname.toLowerCase()
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.toLowerCase()
      : null

    if (supabaseHost && host === supabaseHost) return photoUrl
    if (host.endsWith('.supabase.co')) return photoUrl

    return null
  } catch {
    return null
  }
}

export default function LaporanDetailPage() {
  const params = useParams()
  const router = useRouter()

  const reportId = Array.isArray(params.id) ? params.id[0] : params.id

  const [report, setReport] = useState<Report | null>(null)
  const [history, setHistory] = useState<StatusHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const fetchData = useCallback(async () => {
    if (!reportId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (reportError) throw reportError
      setReport(reportData as Report)

      const { data: historyData } = await supabase
        .from('status_history')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })

      setHistory((historyData as StatusHistory[]) ?? [])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const safePhotoUrl = useMemo(() => resolveSafePhotoUrl(report?.photo_url), [report?.photo_url])

  const handleVote = async () => {
    if (!report || isVoting || hasVoted) return

    setIsVoting(true)
    try {
      await submitVote(report.id)
      setHasVoted(true)
      await fetchData()
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
          text,
          url,
        })
      } catch (err) {
        console.log('Share failed:', err)
      }
      return
    }

    await navigator.clipboard.writeText(url)
    alert('Link disalin ke clipboard!')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Memuat detail laporan...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[32px] bg-muted-light">
          <AlertTriangle className="h-10 w-10 text-muted" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Laporan tidak ditemukan</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Mungkin laporan ini sudah dihapus atau link yang kamu gunakan salah.
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-8 rounded-2xl bg-primary px-8 py-3.5 font-bold text-white shadow-lg transition-all active:scale-95"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
  }

  const categoryInfo = CATEGORIES.find((c) => c.value === report.category)
  const statusInfo = STATUSES.find((s) => s.value === report.status)

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-border bg-white p-2.5 text-muted transition hover:border-primary hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground sm:text-xs">
            Detail Laporan
          </h1>

          <button
            onClick={handleShare}
            className="rounded-xl border border-primary/20 bg-primary-light/40 p-2.5 text-primary transition hover:bg-primary-light"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pt-5 sm:px-6 lg:px-10 lg:pt-6">
        <section className="overflow-hidden rounded-[30px] border border-border bg-white shadow-[0_25px_85px_-48px_rgba(15,23,42,0.55)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative aspect-[4/3] bg-muted-light sm:aspect-video lg:aspect-auto lg:min-h-[360px]">
              {safePhotoUrl ? (
                <Image src={safePhotoUrl} alt={report.category} fill className="object-cover" priority />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
                  <AlertTriangle className="h-12 w-12 opacity-25" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada foto valid</p>
                </div>
              )}

              <div
                className="absolute left-4 top-4 rounded-xl px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-xl"
                style={{ color: statusInfo?.color, backgroundColor: `${statusInfo?.bgColor}E6` }}
              >
                {statusInfo?.label}
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">
                    {categoryInfo?.label}
                  </h2>
                  <div className="mt-2 flex items-start gap-2 text-xs font-semibold text-muted sm:text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{report.address || 'Lokasi belum tersedia'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/10 bg-primary-light/40 px-4 py-2.5 text-center">
                  <p className="text-2xl font-black leading-none text-primary">{report.urgency_score}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-primary-dark/80">
                    Urgensi
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-wider text-muted sm:text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  {new Date(report.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="h-4 w-4 text-accent" />
                  {report.vote_count} Dukungan
                </div>
              </div>

              {report.description ? (
                <div className="rounded-2xl border border-border bg-muted-light/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted/70">Keterangan warga</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{report.description}</p>
                </div>
              ) : null}

              {report.assigned_to ? (
                <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary-light/30 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Petugas Lapangan</p>
                    <p className="text-sm font-bold text-foreground capitalize">{report.assigned_to}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[26px] border border-border bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-muted/70">Titik Lokasi</h3>
            <div className="h-56 w-full overflow-hidden rounded-2xl border border-border sm:h-64">
              <MapPreview lat={report.lat} lng={report.lng} />
            </div>
          </div>

          <div className="rounded-[26px] border border-border bg-white p-4 sm:p-5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted/70">
              Perkembangan Penanganan
            </h3>
            <div className="relative mt-5 space-y-6 pl-7 before:absolute before:bottom-1 before:left-[9px] before:top-1 before:w-0.5 before:bg-border">
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 h-4 w-4 rounded-full border-4 border-white bg-primary shadow-sm" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Status saat ini</p>
                <p className="mt-1 text-sm font-bold capitalize text-foreground">{report.status}</p>
              </div>

              {history.map((item) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-[21px] top-0.5 h-4 w-4 rounded-full border-4 border-white bg-border shadow-sm" />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted/75">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[10px] font-bold italic text-muted">{item.changed_by}</p>
                    </div>
                    <p className="text-sm font-bold capitalize text-foreground">Update: {item.new_status}</p>
                    {item.note ? <p className="text-xs leading-relaxed text-muted">{item.note}</p> : null}
                  </div>
                </div>
              ))}

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 h-4 w-4 rounded-full border-4 border-white bg-success-light shadow-sm" />
                <p className="text-[10px] font-black uppercase tracking-widest text-success">Laporan masuk</p>
                <p className="mt-1 text-sm font-bold text-foreground">Masalah berhasil dilaporkan oleh warga.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <button
            onClick={handleVote}
            disabled={isVoting || hasVoted}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-[0.18em] transition-all active:scale-95 sm:w-auto sm:min-w-[280px]',
              hasVoted
                ? 'border border-success/25 bg-success-light text-success'
                : 'bg-primary text-white hover:bg-primary-dark'
            )}
          >
            {hasVoted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Sudah Didukung
              </>
            ) : isVoting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ThumbsUp className="h-4 w-4" />
                Dukung Masalah Ini
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
