'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Camera,
  FilePlus2,
  History,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react'
import NearbyFeed from '@/components/NearbyFeed'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [stats, setStats] = useState({ reports: 0, resolved: 0, votes: 0 })
  const [isStatsLoading, setIsStatsLoading] = useState(true)

  const fetchStats = async () => {
    setIsStatsLoading(true)
    try {
      const { count: reportCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })

      const { count: resolvedCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'selesai')

      const { data: voteData } = await supabase
        .from('reports')
        .select('vote_count')

      const totalVotes =
        voteData?.reduce((total, report) => total + (report.vote_count || 0), 0) || 0

      setStats({
        reports: reportCount || 0,
        resolved: resolvedCount || 0,
        votes: totalVotes,
      })
    } catch (error) {
      console.error('Stats fetch error:', error)
    } finally {
      setIsStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background/90 pb-28 shadow-[0_40px_140px_-60px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(234,88,12,0.18),_transparent_55%)]" />

      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/75 px-5 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Cepuin
            </p>
            <h1 className="mt-1 text-base font-black tracking-tight text-foreground">
              Dashboard Lapor Cepat
            </h1>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-border bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted shadow-sm transition hover:border-primary hover:text-primary"
          >
            Masuk
          </Link>
        </div>
      </header>

      <section className="px-5 pt-5">
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(145deg,#115e59_0%,#0f766e_55%,#0b4c49_100%)] px-5 pb-6 pt-5 text-white shadow-[0_32px_70px_-36px_rgba(15,118,110,0.85)]">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-14 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              Fokus utama: lapor dulu
            </div>

            <h2 className="mt-4 max-w-xs text-3xl font-black leading-[1.05] tracking-tight">
              Buka aplikasi, langsung tekan <span className="text-accent-light">Lapor</span>.
            </h2>

            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/78">
              Buat pengalaman smartphone yang benar-benar cepat: pilih kategori, ambil lokasi,
              tambah foto kalau perlu, lalu kirim.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 text-left">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
                <MapPin className="h-4 w-4 text-accent-light" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  GPS
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Deteksi cepat</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
                <Camera className="h-4 w-4 text-accent-light" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  Foto
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Opsional tapi berguna</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3">
                <FilePlus2 className="h-4 w-4 text-accent-light" />
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  Form
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Singkat dan jelas</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Link
                href="/lapor"
                className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-primary-dark shadow-2xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                Lapor Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="#feed"
                  className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
                >
                  Lihat Sekitar
                </Link>
                <Link
                  href="/riwayat"
                  className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/15"
                >
                  Riwayat Saya
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="rounded-[28px] border border-white/60 bg-white/78 p-5 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted/70">
                Ringkasan Kota
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Pantau dampak laporan warga
              </h3>
            </div>
            <button
              onClick={fetchStats}
              disabled={isStatsLoading}
              className="rounded-full border border-border bg-white p-2.5 text-muted shadow-sm transition hover:border-primary hover:text-primary disabled:opacity-60"
              aria-label="Muat ulang statistik"
            >
              <RefreshCw className={`h-4 w-4 ${isStatsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-primary-light/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">
                Laporan
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-primary-dark">
                {isStatsLoading ? '...' : stats.reports}
              </p>
            </div>
            <div className="rounded-[24px] bg-success-light/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-success/70">
                Selesai
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-success">
                {isStatsLoading ? '...' : stats.resolved}
              </p>
            </div>
            <div className="rounded-[24px] bg-accent-light/65 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent-dark/70">
                Dukungan
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-accent-dark">
                {isStatsLoading ? '...' : stats.votes}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="feed" className="flex-1 px-5 pb-8 pt-5">
        <div className="rounded-[32px] border border-white/60 bg-white/72 px-4 py-5 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.38)] backdrop-blur-xl">
          <div className="mb-5 flex items-start justify-between gap-4 px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted/70">
                Area Sekitar
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Masalah yang butuh perhatian
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-danger-light/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-danger">
              <ThumbsUp className="h-3.5 w-3.5" />
              Vote aktif
            </div>
          </div>

          <NearbyFeed />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg px-4 pb-4">
        <div className="grid grid-cols-[0.95fr_1.25fr_0.95fr] gap-3 rounded-[30px] border border-white/70 bg-white/86 p-3 shadow-[0_28px_90px_-36px_rgba(15,23,42,0.5)] backdrop-blur-2xl">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 rounded-[22px] px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary"
          >
            <MapPin className="h-4 w-4" />
            Beranda
          </Link>
          <Link
            href="/lapor"
            className="flex items-center justify-center gap-2 rounded-[24px] bg-accent px-4 py-4 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_20px_40px_-20px_rgba(234,88,12,0.85)] transition hover:-translate-y-0.5"
          >
            <FilePlus2 className="h-4 w-4" />
            Lapor
          </Link>
          <Link
            href="/riwayat"
            className="flex flex-col items-center justify-center gap-1 rounded-[22px] px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted"
          >
            <History className="h-4 w-4" />
            Riwayat
          </Link>
        </div>
      </div>
    </main>
  )
}
