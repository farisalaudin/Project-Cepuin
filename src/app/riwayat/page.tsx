'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronLeft, Clock, FileText, Loader2, LogOut, Search } from 'lucide-react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Report } from '@/types'
import ReportCard from '@/components/ReportCard'

type StatusFilter = 'semua' | 'dilaporkan' | 'diverifikasi' | 'dikerjakan' | 'selesai' | 'ditolak'
type SortFilter = 'created_at_desc' | 'created_at_asc' | 'vote_count_desc'

export default function RiwayatPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')
  const [sortBy, setSortBy] = useState<SortFilter>('created_at_desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)
    }
    void checkUser()
  }, [router])

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        let query = supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)

        if (statusFilter !== 'semua') {
          query = query.eq('status', statusFilter)
        }

        if (debouncedSearchTerm) {
          query = query.or(
            `description.ilike.%${debouncedSearchTerm}%,address.ilike.%${debouncedSearchTerm}%`
          )
        }

        if (sortBy === 'created_at_desc') {
          query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'created_at_asc') {
          query = query.order('created_at', { ascending: true })
        } else {
          query = query.order('vote_count', { ascending: false })
        }

        const { data, error } = await query
        if (error) throw error
        setReports((data as Report[]) ?? [])
      } catch (err) {
        console.error('Fetch reports error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void fetchReports()
  }, [user?.id, statusFilter, sortBy, debouncedSearchTerm])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const stats = useMemo(() => {
    return {
      total: reports.length,
      inProgress: reports.filter((r) =>
        ['dilaporkan', 'diverifikasi', 'dikerjakan'].includes(r.status)
      ).length,
      done: reports.filter((r) => r.status === 'selesai').length,
    }
  }, [reports])

  return (
    <main className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="rounded-xl border border-border bg-white p-2.5 text-muted hover:border-primary hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground sm:text-xl">Riwayat Laporan</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">
                {user?.email || 'Warga'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-danger/20 bg-danger-light/40 p-2.5 text-danger hover:bg-danger hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 pt-5 sm:px-6 lg:px-10">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-white p-4">
            <FileText className="h-5 w-5 text-primary" />
            <p className="mt-2 text-2xl font-black text-foreground">{stats.total}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">Total</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <Clock className="h-5 w-5 text-accent" />
            <p className="mt-2 text-2xl font-black text-foreground">{stats.inProgress}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">Diproses</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="mt-2 text-2xl font-black text-foreground">{stats.done}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">Selesai</p>
          </div>
        </section>

        <section className="rounded-[26px] border border-border bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari deskripsi atau alamat..."
                className="w-full rounded-xl border border-border bg-muted-light/50 py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-border bg-muted-light/50 px-3 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="semua">Semua Status</option>
              <option value="dilaporkan">Dilaporkan</option>
              <option value="diverifikasi">Diverifikasi</option>
              <option value="dikerjakan">Dikerjakan</option>
              <option value="selesai">Selesai</option>
              <option value="ditolak">Ditolak</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortFilter)}
              className="rounded-xl border border-border bg-muted-light/50 px-3 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="created_at_desc">Tanggal Terbaru</option>
              <option value="created_at_asc">Tanggal Terlama</option>
              <option value="vote_count_desc">Dukungan Terbanyak</option>
            </select>
          </div>
        </section>

        <section className="rounded-[26px] border border-border bg-white p-4 sm:p-5">
          {isLoading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-muted/70">Memuat riwayat...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <p className="text-lg font-black text-foreground">Belum Ada Laporan</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Anda belum memiliki laporan. Yuk mulai dari halaman lapor.
              </p>
              <Link
                href="/lapor"
                className="mt-5 rounded-2xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-white"
              >
                Lapor Sekarang
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

