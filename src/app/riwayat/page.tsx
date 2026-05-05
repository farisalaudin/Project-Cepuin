'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Loader2, 
  History,
  LogOut,
  CheckCircle2,
  Clock,
  FileText,
  Search
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Report } from '@/types'
import ReportCard from '@/components/ReportCard'
import Link from 'next/link'

import { User } from '@supabase/supabase-js'

export default function RiwayatPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [filterStatus, setFilterStatus] = useState('semua') // 'semua', 'dilaporkan', 'diproses', 'selesai'
  const [sortBy, setSortBy] = useState('created_at_desc') // 'created_at_desc', 'created_at_asc', 'vote_count_desc'
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // Wait 500ms after user stops typing

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  const fetchUserReports = React.useCallback(async (userId: string) => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select('*, photo_url, vote_count')
        .eq('user_id', userId)

      // Apply status filter
      if (filterStatus !== 'semua') {
        if (filterStatus === 'diproses') {
          query = query.in('status', ['diproses', 'ditindaklanjuti'])
        } else {
          query = query.eq('status', filterStatus)
        }
      }

      // Apply search term
      if (debouncedSearchTerm) {
        query = query.or(`description.ilike.%${debouncedSearchTerm}%,address.ilike.%${debouncedSearchTerm}%`)
      }

      // Apply sorting
      const [sortField, sortOrder] = sortBy.split('_')
      query = query.order(sortField, { ascending: sortOrder === 'asc' })
      
      const { data, error } = await query
      
      if (error) throw error
      setReports(data as Report[])
    } catch (err) {
      console.error('Fetch reports error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, sortBy, debouncedSearchTerm])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        fetchUserReports(user.id)
      } else {
        router.push('/login')
      }
    }

    checkUser()
  }, [router, fetchUserReports])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const reportStats = React.useMemo(() => {
    const total = reports.length
    const selesai = reports.filter(r => r.status === 'selesai').length
    const diproses = reports.filter(r => ['diproses', 'ditindaklanjuti'].includes(r.status)).length
    return { total, selesai, diproses }
  }, [reports])

  if (isLoading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-xs font-bold text-muted uppercase tracking-widest">Memuat Riwayat Laporan...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-muted-light flex flex-col max-w-lg mx-auto shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-5 bg-white/70 backdrop-blur-lg border-b border-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2.5 rounded-xl bg-muted-light/50 text-muted hover:text-foreground transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground uppercase tracking-tight leading-none">
              Riwayat Saya
            </h1>
            <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mt-1.5">
              {user?.email}
            </p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2.5 rounded-xl bg-danger-light/50 text-danger hover:bg-danger hover:text-white transition-all active:scale-95 shadow-sm shadow-danger/5"
          title="Keluar"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 space-y-8 bg-gradient-to-b from-transparent to-white/30">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50" />
          <input
            type="text"
            placeholder="Cari laporan (deskripsi, alamat)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/60 backdrop-blur-sm border border-border rounded-xl text-sm font-bold text-foreground placeholder:text-muted/50 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-border shadow-sm text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{reportStats.total}</p>
            <p className="text-[9px] font-bold text-muted/70 uppercase tracking-widest">Total</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-border shadow-sm text-center">
            <Clock className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{reportStats.diproses}</p>
            <p className="text-[9px] font-bold text-muted/70 uppercase tracking-widest">Diproses</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-border shadow-sm text-center">
            <CheckCircle2 className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{reportStats.selesai}</p>
            <p className="text-[9px] font-bold text-muted/70 uppercase tracking-widest">Selesai</p>
          </div>
        </div>

        {reports.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-8">
            <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-[40px] shadow-2xl flex items-center justify-center border border-white">
              <History className="w-10 h-10 text-muted/40" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Belum Ada Laporan</h2>
              <p className="text-xs font-bold text-muted/60 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                Kamu belum pernah melapor <br /> di sistem Cepuin.
              </p>
            </div>
            <Link 
              href="/lapor"
              className="px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Lapor Sekarang
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter and Sort Controls */}
            <div className="space-y-4">
              {/* Status Filter */}
              <div>
                <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-2 px-2">Filter Status</p>
                <div className="grid grid-cols-4 gap-2">
                  {['semua', 'dilaporkan', 'diproses', 'selesai'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                        filterStatus === status
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-white/60 hover:bg-white/90 text-foreground'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort By */}
              <div>
                <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mb-2 px-2">Urutkan</p>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-border rounded-lg text-sm font-bold text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="created_at_desc">Tanggal Terbaru</option>
                  <option value="created_at_asc">Tanggal Terlama</option>
                  <option value="vote_count_desc">Dukungan Terbanyak</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-muted/40 uppercase tracking-[0.25em]">
                {reports.length} Laporan Ditemukan
              </h3>
            </div>
            <div className="grid gap-5">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Nav */}
      <footer className="p-8 bg-white/80 backdrop-blur-md border-t border-border flex items-center justify-center">
        <p className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] text-center leading-relaxed">
          Laporan kamu membantu kota jadi lebih baik. <br /> <span className="text-primary/60">Terus pantau statusnya ya!</span>
        </p>
      </footer>
    </main>
  )
}
