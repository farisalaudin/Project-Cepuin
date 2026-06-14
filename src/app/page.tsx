'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Session, User } from '@supabase/supabase-js'
import {
  ArrowRight,
  Camera,
  FilePlus2,
  History,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react'
import NearbyFeed from '@/components/NearbyFeed'
import { supabase } from '@/lib/supabase/client'

export default function Home() {
  const [stats, setStats] = useState({ reports: 0, resolved: 0, votes: 0 })
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const router = useRouter()

  const fetchStats = useCallback(async () => {
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
        voteData?.reduce(
          (total: number, report: { vote_count: number | null }) =>
            total + (report.vote_count || 0),
          0
        ) || 0

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
  }, [])

  useEffect(() => {
    let isMounted = true

    const getUser = async () => {
      try {
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2500)
        )

        const result = await Promise.race([userPromise, timeoutPromise])
        const nextUser =
          result && typeof result === 'object' && 'data' in result
            ? result.data.user
            : null

        if (isMounted) {
          setUser(nextUser ?? null)
        }
      } catch (error) {
        console.warn('Auth check fallback to guest:', error)
        if (isMounted) {
          setUser(null)
        }
      }
    }

    void getUser()
    void fetchStats()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (isMounted) {
          setUser(session?.user ?? null)
        }
      }
    )

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [fetchStats])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <main className="relative min-h-screen bg-background/95 pb-24 md:pb-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.24),_transparent_56%)]" />

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/90">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">
              Cepuin
            </p>
            <h1 className="mt-1 text-base font-black tracking-tight text-foreground sm:text-lg">
              Portal Warga Cepuin
            </h1>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/"
              className="rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary"
            >
              Beranda
            </Link>
            <Link
              href="/lapor"
              className="rounded-full bg-accent px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white"
            >
              Lapor
            </Link>
            {user ? (
              <Link
                href="/riwayat"
                className="rounded-full border border-border bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-muted transition hover:border-primary hover:text-primary"
              >
                Riwayat
              </Link>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="rounded-full border border-border bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-muted transition hover:border-primary hover:text-primary"
              >
                Login
              </button>
            )}
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-full border border-border bg-white p-2 text-muted shadow-sm transition hover:border-primary hover:text-primary"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-border bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted shadow-sm transition hover:border-primary hover:text-primary md:hidden"
            >
              Masuk
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-4 pt-5 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:px-10 lg:pt-7">
        <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(145deg,#115e59_0%,#0f766e_50%,#0b4c49_100%)] px-5 pb-6 pt-5 text-white shadow-[0_30px_80px_-35px_rgba(15,118,110,0.9)] sm:px-6 sm:pb-7 sm:pt-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              Fokus utama: lapor dulu
            </div>

            <h2 className="mt-4 max-w-xl text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">
              Lapor masalah kota, cepat dan jelas.
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-white/80 sm:text-base">
              Dirancang untuk handphone dan desktop: satu klik ke form, satu klik ke area sekitar,
              dan progress laporan langsung terlihat.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <MapPin className="h-4 w-4 text-accent-light" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  GPS
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Deteksi cepat</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <Camera className="h-4 w-4 text-accent-light" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  Foto
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Dukungan visual</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
                <FilePlus2 className="h-4 w-4 text-accent-light" />
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                  Form
                </p>
                <p className="mt-1 text-xs font-semibold text-white">Super singkat</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/lapor"
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-black uppercase tracking-[0.17em] text-primary-dark shadow-2xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                Lapor Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#feed"
                className="flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3.5 text-sm font-black uppercase tracking-[0.17em] text-white transition hover:bg-white/15"
              >
                Lihat Sekitar
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[26px] border border-white/70 bg-white/95 p-5 shadow-[0_25px_75px_-40px_rgba(15,23,42,0.48)]">
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

            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="rounded-2xl bg-primary-light/60 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                  Laporan
                </p>
                <p className="mt-2 text-xl font-black tracking-tight text-primary-dark sm:text-2xl">
                  {isStatsLoading ? '...' : stats.reports}
                </p>
              </div>
              <div className="rounded-2xl bg-success-light/70 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-success/70">
                  Selesai
                </p>
                <p className="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl">
                  {isStatsLoading ? '...' : stats.resolved}
                </p>
              </div>
              <div className="rounded-2xl bg-accent-light/65 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-dark/70">
                  Dukungan
                </p>
                <p className="mt-2 text-xl font-black tracking-tight text-accent-dark sm:text-2xl">
                  {isStatsLoading ? '...' : stats.votes}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {user ? (
              <Link
                href="/riwayat"
                className="rounded-2xl border border-border bg-white px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-muted transition hover:border-primary hover:text-primary"
              >
                Riwayat Saya
              </Link>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="rounded-2xl border border-border bg-white px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-muted transition hover:border-primary hover:text-primary"
              >
                Login Dulu
              </button>
            )}
            <Link
              href="/lapor"
              className="rounded-2xl border border-border bg-white px-4 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-muted transition hover:border-primary hover:text-primary"
            >
              Buat Laporan
            </Link>
          </div>
        </section>

        <section
          id="feed"
          className="rounded-[30px] border border-white/70 bg-white/92 px-4 py-5 shadow-[0_30px_90px_-48px_rgba(15,23,42,0.42)] lg:col-span-2 lg:px-6 lg:py-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted/70">
                Area Sekitar
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground sm:text-xl">
                Masalah yang butuh perhatian
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-danger-light/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-danger">
              <ThumbsUp className="h-3.5 w-3.5" />
              Vote aktif
            </div>
          </div>
          <NearbyFeed />
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg px-4 pb-4 md:hidden">
        <div className="pointer-events-auto grid grid-cols-[0.95fr_1.25fr_0.95fr] gap-3 rounded-[30px] border border-white/70 bg-white/95 p-3 shadow-[0_28px_90px_-36px_rgba(15,23,42,0.5)]">
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
          {user ? (
            <Link
              href="/riwayat"
              className="flex flex-col items-center justify-center gap-1 rounded-[22px] px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted"
            >
              <History className="h-4 w-4" />
              Riwayat
            </Link>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[22px] px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted/60"
            >
              <History className="h-4 w-4" />
              Riwayat
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
