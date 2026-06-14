'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { 
  MapPin, 
  Loader2, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  LightbulbOff,
  CloudRain,
  Trash2,
  Droplets,
  Building2,
  MoreHorizontal
} from 'lucide-react'
import { getWilayahStats, listWilayah, matchWilayahId } from '@/lib/wilayah'
import { getCurrentLocation, reverseGeocodeDetails } from '@/lib/geo'
import { getReportsByWilayah } from '@/lib/wilayah'
import { Report, Wilayah, WilayahStats, CATEGORIES } from '@/types'
import { cn } from '@/lib/cn'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReportCard from '@/components/ReportCard'

export default function LaporanPage() {
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([])
  const [selectedWilayah, setSelectedWilayah] = useState<string>('')
  const [stats, setStats] = useState<WilayahStats | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  
  const [isLoadingWilayah, setIsLoadingWilayah] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<string>('Mendeteksi lokasi...')

  // Fetch initial wilayah list
  useEffect(() => {
    const initWilayah = async () => {
      const list = await listWilayah()
      setWilayahList(list)
      setIsLoadingWilayah(false)
      
      // Auto-detect GPS to set default filter
      try {
        const pos = await getCurrentLocation()
        setGpsStatus('Mencocokkan wilayah...')
        const geo = await reverseGeocodeDetails(pos.latitude, pos.longitude)
        const matchedId = await matchWilayahId(geo, list)
        
        if (matchedId) {
          setSelectedWilayah(matchedId)
          setGpsStatus('')
        } else {
          setGpsStatus('Lokasi Anda di luar jangkauan wilayah terdaftar.')
          if (list.length > 0) setSelectedWilayah(list[0].id)
        }
      } catch (err) {
        setGpsStatus('Gagal mendeteksi lokasi otomatis.')
        if (list.length > 0) setSelectedWilayah(list[0].id)
      }
    }
    initWilayah()
  }, [])

  // Fetch stats and reports when selected wilayah changes
  useEffect(() => {
    if (!selectedWilayah) return

    const loadData = async () => {
      setIsLoadingStats(true)
      try {
        const [newStats, newReports] = await Promise.all([
          getWilayahStats(selectedWilayah),
          getReportsByWilayah(selectedWilayah, 50)
        ])
        setStats(newStats)
        setReports(newReports)
      } catch (err) {
        console.error('Failed to load wilayah data', err)
      } finally {
        setIsLoadingStats(false)
      }
    }

    loadData()
  }, [selectedWilayah])

  return (
    <main className="min-h-screen bg-background/95 pb-24 md:pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.15),_transparent_60%)]" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-muted-light transition-colors text-muted hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground">
              Statistik Wilayah
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Transparansi Kinerja
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        
        {/* Filter Section */}
        <div className="bg-white rounded-3xl p-5 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted/80 mb-2 block">
              Pilih Wilayah
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <select
                value={selectedWilayah}
                onChange={(e) => setSelectedWilayah(e.target.value)}
                disabled={isLoadingWilayah}
                className="w-full pl-12 pr-10 py-3.5 bg-muted-light/30 rounded-2xl border-2 border-border focus:border-primary focus:outline-none appearance-none text-sm font-bold text-foreground disabled:opacity-50 transition-all"
              >
                <option value="" disabled>
                  {isLoadingWilayah ? 'Memuat wilayah...' : 'Pilih Wilayah'}
                </option>
                {wilayahList.map(w => (
                  <option key={w.id} value={w.id}>{w.nama} — {w.provinsi}</option>
                ))}
              </select>
            </div>
            {gpsStatus && !selectedWilayah && (
              <p className="mt-2 text-[10px] font-bold text-accent-dark flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> {gpsStatus}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {isLoadingStats ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest">Memuat Statistik...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-5 rounded-[24px] border border-border shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Total Laporan</p>
                <p className="text-3xl font-black text-foreground">{stats.totalReports}</p>
              </div>
              <div className="bg-success-light/30 p-5 rounded-[24px] border border-success/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-success-dark mb-1">Terselesaikan</p>
                <p className="text-3xl font-black text-success">{stats.resolvedReports}</p>
              </div>
              <div className="bg-primary-light/30 p-5 rounded-[24px] border border-primary/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-dark mb-1">Penyelesaian</p>
                <p className="text-3xl font-black text-primary">{stats.completionRate}%</p>
              </div>
              <div className="bg-accent-light/30 p-5 rounded-[24px] border border-accent/20 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent-dark mb-1">Avg. Waktu (Jam)</p>
                <p className="text-3xl font-black text-accent-dark">{stats.averageResolutionHours ?? '-'}</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm">
              <h3 className="text-sm font-black tracking-tight text-foreground mb-6 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Distribusi Kategori
              </h3>
              
              <div className="space-y-4">
                {CATEGORIES.map(cat => {
                  const count = stats.categoryBreakdown[cat.value] || 0
                  const percentage = stats.totalReports > 0 
                    ? Math.round((count / stats.totalReports) * 100) 
                    : 0
                  
                  return (
                    <div key={cat.value} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-foreground flex items-center gap-1.5">
                          {cat.label}
                        </span>
                        <span className="text-muted">{count} laporan ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted-light rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Reports in this Wilayah */}
            <div className="pt-4">
              <h3 className="text-sm font-black tracking-tight text-foreground mb-4 pl-2">
                Laporan Terbaru di Wilayah Ini
              </h3>
              {reports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reports.map(report => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <div className="bg-muted-light/30 border border-border border-dashed rounded-3xl p-8 text-center text-muted text-sm font-medium">
                  Belum ada laporan di wilayah ini.
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </main>
  )
}
