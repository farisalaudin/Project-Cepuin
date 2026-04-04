'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Loader2, 
  MapPin, 
  Clock, 
  AlertTriangle,
  History,
  LayoutDashboard,
  LogOut
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Report, STATUSES } from '@/types'
import ReportCard from '@/components/ReportCard'
import Link from 'next/link'

export default function RiwayatPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/riwayat')
        return
      }
      setUser(user)
      fetchUserReports(user.id)
    }

    checkUser()
  }, [])

  const fetchUserReports = async (userId: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReports(data as Report[])
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (isLoading) {
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
        {reports.length === 0 ? (
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
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-muted/40 uppercase tracking-[0.25em]">Total {reports.length} Laporan</h3>
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
