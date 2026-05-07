'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter,
  ExternalLink,
  MapPin,
  ThumbsUp,
  X,
  Loader2
} from 'lucide-react'
import { Report, STATUSES, ReportStatus } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'
import { updateReportStatus } from '@/lib/reports'
import Image from 'next/image'

export default function AdminDashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all')
  const [petugasName, setPetugasName] = useState('')
  const [statusNote, setStatusNote] = useState('')

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('reports').select('*, photo_url').order('urgency_score', { ascending: false })
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      // Ensure data is properly typed and urgency_score is treated as number
      const sanitizedData = (data as Report[]).map(report => ({
        ...report,
        urgency_score: Number(report.urgency_score) || 0,
        vote_count: Number(report.vote_count) || 0
      }))
      
      setReports(sanitizedData)
    } catch (err) {
      console.error('Fetch reports error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleUpdateStatus = async (id: string, newStatus: ReportStatus) => {
    setIsUpdating(true)
    try {
      await updateReportStatus(id, newStatus, petugasName, statusNote)
      setSelectedReport(null)
      setPetugasName('')
      setStatusNote('')
      await fetchReports()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal mengupdate status.'
      alert(message)
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredReports = reports.filter(r => 
    r.address?.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: reports.length,
    resolved: reports.filter(r => r.status === 'selesai').length,
    pending: reports.filter(r => r.status === 'dilaporkan').length,
    avgUrgency: reports.length > 0 ? (reports.reduce((acc, r) => acc + Number(r.urgency_score), 0) / reports.length).toFixed(1) : 0
  }

  return (
    <div className="h-full flex flex-col gap-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-border shadow-sm group hover:border-primary transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-light text-primary rounded-2xl group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted/60 uppercase tracking-widest">Total Laporan</p>
              <h3 className="text-2xl font-black text-foreground">{stats.total}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-border shadow-sm group hover:border-success transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success-light text-success rounded-2xl group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted/60 uppercase tracking-widest">Terselesaikan</p>
              <h3 className="text-2xl font-black text-foreground">{stats.resolved}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-border shadow-sm group hover:border-accent transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent-light text-accent rounded-2xl group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted/60 uppercase tracking-widest">Laporan Baru</p>
              <h3 className="text-2xl font-black text-foreground">{stats.pending}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl border border-border shadow-sm group hover:border-danger transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-danger-light text-danger rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted/60 uppercase tracking-widest">Rata-rata Urgensi</p>
              <h3 className="text-2xl font-black text-foreground">{stats.avgUrgency}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-[32px] border border-border shadow-xl overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Filters Header */}
        <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted-light/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
            <input 
              type="text" 
              placeholder="Cari lokasi atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/50 rounded-2xl border border-border focus:border-primary focus:outline-none transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted/60" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ReportStatus | 'all')}
              className="bg-white/50 px-4 py-3 rounded-2xl border border-border text-xs font-bold text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">Semua Status</option>
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted-light/50 border-b border-border text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                <th className="px-6 py-4">Urgensi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4 text-center">Dukungan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="mt-4 text-xs font-bold text-muted uppercase">Memuat Laporan...</p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-muted-light rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted" />
                    </div>
                    <p className="text-sm font-bold text-foreground">Tidak Ada Laporan</p>
                    <p className="text-xs text-muted mt-1">Coba ubah filter atau pencarian kamu.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const status = STATUSES.find(s => s.value === report.status)
                  return (
                    <tr key={report.id} className="hover:bg-muted-light/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm",
                          Number(report.urgency_score) > 80 ? "bg-danger-light text-danger" : 
                          Number(report.urgency_score) > 50 ? "bg-accent-light text-accent" : 
                          "bg-success-light text-success"
                        )}>
                          {report.urgency_score}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground capitalize">
                            {report.category.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] font-bold text-muted uppercase">
                            ID: {report.id.slice(0, 8)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted leading-tight truncate">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          {report.address}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted-light rounded-lg text-xs font-bold text-foreground">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {report.vote_count}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span 
                          className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm"
                          style={{ color: status?.color, backgroundColor: status?.bgColor }}
                        >
                          {status?.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button 
                          onClick={() => {
                            setSelectedReport(report)
                            setPetugasName(report.assigned_to ?? '')
                            setStatusNote('')
                          }}
                          className="p-2 rounded-xl bg-white border border-border text-muted hover:text-primary hover:border-primary transition-all active:scale-95 group-hover:shadow-md"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-light text-primary rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                    Kelola Laporan
                  </h2>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    ID: {selectedReport.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedReport(null)
                  setPetugasName('')
                  setStatusNote('')
                }}
                className="p-3 rounded-2xl bg-muted-light text-muted hover:bg-border transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Photo */}
                <div className="relative aspect-video rounded-3xl overflow-hidden bg-muted-light border-2 border-border shadow-inner">
                  {selectedReport.photo_url ? (
                    <Image 
                      src={selectedReport.photo_url} 
                      alt="Laporan" 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted gap-2">
                      <AlertTriangle className="w-12 h-12 opacity-20" />
                      <p className="text-[10px] font-bold uppercase">Tidak ada foto</p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Alamat Lengkap</p>
                    <div className="flex items-start gap-2 p-4 bg-muted-light/50 rounded-2xl border border-border">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-bold text-foreground leading-relaxed">
                        {selectedReport.address}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Deskripsi Warga</p>
                    <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-border italic text-xs text-muted leading-relaxed">
                      &quot;{selectedReport.description || 'Tidak ada deskripsi tambahan.'}&quot;
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Management */}
              <div className="p-8 bg-muted-light/30 rounded-[32px] border border-border space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-primary rounded-full" />
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Update Penanganan</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1 mb-2 block">
                      Petugas Lapangan (Opsional)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama petugas..."
                      value={petugasName}
                      onChange={(e) => setPetugasName(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-2xl border border-border focus:border-primary focus:outline-none transition-all text-sm font-bold text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1 mb-2 block">
                      Catatan Status
                    </label>
                    <textarea
                      placeholder="Tulis alasan penolakan atau catatan singkat update..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value.slice(0, 240))}
                      className="min-h-28 w-full resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-all focus:border-primary focus:outline-none"
                    />
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                      Wajib diisi saat status diubah ke Ditolak
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {STATUSES.map(s => {
                      const isCurrent = selectedReport.status === s.value
                      return (
                        <button
                          key={s.value}
                          onClick={() => handleUpdateStatus(selectedReport.id, s.value)}
                          disabled={isUpdating || isCurrent}
                          className={cn(
                            "px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm",
                            isCurrent 
                              ? "opacity-50 cursor-default grayscale" 
                              : "hover:scale-105 hover:shadow-lg"
                          )}
                          style={{ color: s.color, backgroundColor: s.bgColor, border: `2px solid ${isCurrent ? 'transparent' : s.color + '20'}` }}
                        >
                          {isCurrent ? `Status: ${s.label}` : `Set Ke ${s.label}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
                
                {isUpdating && (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan Perubahan...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
