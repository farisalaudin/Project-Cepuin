'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BarChart3, CheckCircle2, Clock, Loader2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { getCurrentLocation, reverseGeocodeDetails } from '@/lib/geo'
import { getLatestReports } from '@/lib/reports'
import { getReportsByWilayah, getWilayahStats, listWilayah, matchWilayahId } from '@/lib/wilayah'
import { CATEGORIES, Report, Wilayah, WilayahStats } from '@/types'
import ReportCard from './ReportCard'

interface FeedFetchOptions {
  forceLocation?: boolean
  selectedWilayahId?: string | null
  keepCurrentList?: boolean
}

export default function NearbyFeed() {
  const [reports, setReports] = useState<Report[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [address, setAddress] = useState<string>('Sekitar Kamu')
  const [isFallback, setIsFallback] = useState(false)
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([])
  const [selectedWilayahId, setSelectedWilayahId] = useState<string | null>(null)
  const [stats, setStats] = useState<WilayahStats | null>(null)
  const hasLoadedRef = useRef(false)
  const latestRequestRef = useRef(0)

  const fetchFeed = useCallback(async ({
    forceLocation = false,
    selectedWilayahId: requestedWilayahId,
    keepCurrentList = true
  }: FeedFetchOptions = {}) => {
    const requestId = ++latestRequestRef.current

    if (!hasLoadedRef.current || !keepCurrentList) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setFetchError(null)

    try {
      let fallbackMode = false
      let nextAddress = address
      let data: Report[] = []
      let nextWilayahId = forceLocation
        ? null
        : requestedWilayahId !== undefined
          ? requestedWilayahId
          : selectedWilayahId ?? null

      if (nextWilayahId) {
        const selectedWilayah = wilayahList.find((wilayah) => wilayah.id === nextWilayahId)
        nextAddress = selectedWilayah?.nama ?? 'Wilayah Dipilih'
        data = await getReportsByWilayah(nextWilayahId)
      } else {
        try {
          const pos = await getCurrentLocation()
          const geocode = await reverseGeocodeDetails(pos.latitude, pos.longitude)
          nextWilayahId = await matchWilayahId(geocode, wilayahList)
          const matchedWilayah = wilayahList.find((wilayah) => wilayah.id === nextWilayahId)
          nextAddress = matchedWilayah?.nama ?? geocode.kabupaten ?? 'Wilayah Belum Terdaftar'
          data = nextWilayahId
            ? await getReportsByWilayah(nextWilayahId, 20, pos.latitude, pos.longitude)
            : await getLatestReports()
        } catch (geoErr) {
          console.warn('GPS failed, falling back to latest reports:', geoErr)
          fallbackMode = true
          nextAddress = 'Terbaru di Kotamu'
          data = await getLatestReports()
        }
      }

      const nextStats = await getWilayahStats(nextWilayahId)

      if (requestId === latestRequestRef.current) {
        setSelectedWilayahId(nextWilayahId)
        setAddress(nextAddress)
        setIsFallback(fallbackMode)
        setReports(data)
        setStats(nextStats)
      }
    } catch (err) {
      console.error('Feed fetch error:', err)
      if (requestId === latestRequestRef.current) {
        setFetchError('Gagal memuat laporan. Periksa koneksi internet kamu.')
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        hasLoadedRef.current = true
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [address, selectedWilayahId, wilayahList])

  useEffect(() => {
    void (async () => {
      setIsInitialLoading(true)
      try {
        const wilayah = await listWilayah()
        setWilayahList(wilayah)
        const pos = await getCurrentLocation()
        const geocode = await reverseGeocodeDetails(pos.latitude, pos.longitude)
        const matchedWilayahId = await matchWilayahId(geocode, wilayah)
        const matchedWilayah = wilayah.find((item) => item.id === matchedWilayahId)
        const data = matchedWilayahId
          ? await getReportsByWilayah(matchedWilayahId, 20, pos.latitude, pos.longitude)
          : await getLatestReports()
        setSelectedWilayahId(matchedWilayahId)
        setAddress(matchedWilayah?.nama ?? geocode.kabupaten ?? 'Wilayah Belum Terdaftar')
        setStats(await getWilayahStats(matchedWilayahId))
        setIsFallback(!matchedWilayahId)
        setReports(data)
      } catch (err) {
        console.warn('Initial feed used latest reports fallback:', err)
        try {
          setIsFallback(true)
          setAddress('Terbaru di Kotamu')
          setReports(await getLatestReports())
          setStats(await getWilayahStats(null))
        } catch (innerErr) {
          console.error('Feed completely failed:', innerErr)
          setFetchError('Gagal memuat laporan. Periksa koneksi internet kamu.')
        }
      } finally {
        hasLoadedRef.current = true
        setIsInitialLoading(false)
      }
    })()
  }, [])

  return (
    <section className="space-y-5 animate-in fade-in duration-500 sm:space-y-6">
      <div className="grid gap-3 rounded-2xl border border-border bg-white/90 p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted/70">
            Filter Wilayah
          </p>
          <select
            value={selectedWilayahId ?? ''}
            onChange={(event) => {
              const nextWilayahId = event.target.value || null
              setSelectedWilayahId(nextWilayahId)
              void fetchFeed({
                selectedWilayahId: nextWilayahId,
                keepCurrentList: true,
              })
            }}
            className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-bold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">Deteksi dari GPS</option>
            {wilayahList.map((wilayah) => (
              <option key={wilayah.id} value={wilayah.id}>
                {wilayah.nama}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSelectedWilayahId(null)
            void fetchFeed({ forceLocation: true, keepCurrentList: true })
          }}
          disabled={isInitialLoading || isRefreshing}
          className="self-end rounded-2xl border border-border bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-primary shadow-sm transition-all hover:border-primary/30 active:scale-95 disabled:opacity-50"
        >
          GPS Saya
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-primary-light/50 p-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary/70">Total</p>
          <p className="mt-1 text-xl font-black text-primary-dark">{stats?.totalReports ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-success-light/60 p-4">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-success/70">Selesai</p>
          <p className="mt-1 text-xl font-black text-success">{stats?.resolvedReports ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-accent-light/60 p-4">
          <AlertCircle className="h-4 w-4 text-accent-dark" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-accent-dark/70">Berhasil</p>
          <p className="mt-1 text-xl font-black text-accent-dark">{stats?.completionRate ?? 0}%</p>
        </div>
        <div className="rounded-2xl bg-muted-light p-4">
          <Clock className="h-4 w-4 text-muted" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted/70">Rata-rata</p>
          <p className="mt-1 text-xl font-black text-foreground">
            {stats?.averageResolutionHours === null || stats?.averageResolutionHours === undefined
              ? '-'
              : `${stats.averageResolutionHours}j`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 flex-col pr-4">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground sm:text-xl">
            <span className="text-base">📍</span>
            <span className="max-w-[150px] truncate uppercase sm:max-w-[240px]">{address}</span>
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted/60">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Statistik dan laporan per wilayah
          </p>
        </div>
        <button
          onClick={() => void fetchFeed({ forceLocation: true, keepCurrentList: true })}
          disabled={isInitialLoading || isRefreshing}
          className="rounded-2xl border border-border bg-white/90 p-3 text-muted shadow-sm transition-all hover:border-primary/30 hover:text-primary active:scale-95 disabled:opacity-50"
        >
          {isInitialLoading || isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {isRefreshing && (
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted-light/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted/70">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Memperbarui laporan...
        </div>
      )}

      {isInitialLoading && reports.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {fetchError && (
            <div className="animate-in fade-in slide-in-from-top-2 flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-light/40 p-4 duration-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                <p className="text-xs font-bold text-danger">{fetchError}</p>
              </div>
              <button
                onClick={() => void fetchFeed({ forceLocation: true, keepCurrentList: false })}
                className="shrink-0 rounded-xl bg-danger px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-all active:scale-95"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {isFallback && (
            <div className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary-light/30 p-4 duration-500">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase leading-relaxed text-primary-dark sm:text-xs">
                Aktifkan lokasi atau pilih wilayah yang sudah tersedia.
              </p>
            </div>
          )}

          {stats && (
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted/70">
                Breakdown Kategori
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CATEGORIES.map((category) => (
                  <div key={category.value} className="flex items-center justify-between rounded-xl bg-muted-light/60 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      {category.label}
                    </span>
                    <span className="text-xs font-black text-foreground">
                      {stats.categoryBreakdown[category.value] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border-2 border-dashed border-border bg-white shadow-inner">
              <div className="w-12 h-12 bg-muted-light rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Belum Ada Laporan</h3>
              <p className="text-[10px] text-muted max-w-xs mt-1 px-6 leading-relaxed">
                Sepertinya lingkunganmu aman atau belum ada yang melapor. Ayo jadi yang pertama!
              </p>
              <button
                onClick={() => window.location.href = '/lapor'}
                className="mt-6 px-6 py-2.5 bg-primary text-white text-[10px] font-bold rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Mulai Melaporkan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {reports.map((report) => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onVoteSuccess={(reportId) => {
                    setReports((prev) =>
                      prev.map((item) =>
                        item.id === reportId
                          ? { ...item, vote_count: item.vote_count + 1 }
                          : item
                      )
                    )
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
