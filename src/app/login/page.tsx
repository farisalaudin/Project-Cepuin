'use client'

import React, { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Lock, Mail, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { ensureUserProfile } from '@/lib/profiles'
import { cn } from '@/lib/cn'

const ADMIN_EMAILS = ['admin@cepuin.id', 'test@admin.com']

type AuthMode = 'login' | 'register'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/riwayat'

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdminPath = useMemo(() => next.startsWith('/admin'), [next])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'register') {
        if (username.trim().length < 3) {
          throw new Error('Username minimal 3 karakter.')
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        if (data.session?.user?.id) {
          await ensureUserProfile(data.session.user.id, data.session.user.email, username)
        }

        setMessage('Akun berhasil dibuat. Silakan login untuk melanjutkan.')
        setMode('login')
        return
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!data.user) throw new Error('Gagal memuat data pengguna.')

      try {
        await ensureUserProfile(data.user.id, data.user.email)
      } catch (profileErr) {
        console.warn('Profile sync warning:', profileErr)
      }

      const isAdmin = ADMIN_EMAILS.includes(data.user.email ?? '')
      if (isAdminPath) {
        if (!isAdmin) {
          throw new Error('Akses admin ditolak untuk akun ini.')
        }
        router.push('/admin')
        return
      }

      router.push(next)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-10">
        <section className="mb-8 rounded-[30px] bg-[linear-gradient(145deg,#115e59_0%,#0f766e_55%,#0b4c49_100%)] p-6 text-white shadow-[0_30px_90px_-45px_rgba(15,118,110,0.88)] lg:mb-0 lg:flex-1 lg:p-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Akun Warga Cepuin
          </h1>
          <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-white/85 sm:text-base">
            Masuk untuk memantau riwayat laporan, dukungan warga, dan perkembangan penanganan.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-wider text-white/90 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3">Pantau Status</div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3">Riwayat Aman</div>
            <div className="rounded-2xl border border-white/25 bg-white/10 px-3 py-3">Akun Personal</div>
          </div>
        </section>

        <section className="rounded-[30px] border border-border bg-white p-5 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)] sm:p-6 lg:w-[440px] lg:flex-shrink-0">
          <div className="mb-5 flex rounded-2xl border border-border bg-muted-light/50 p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
                mode === 'login' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              )}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={cn(
                'flex-1 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
                mode === 'register' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
              )}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted/70">
                  Username Warga
                </label>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: warga_malang"
                    required
                    className="w-full rounded-2xl border border-border bg-muted-light/50 py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted/70">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full rounded-2xl border border-border bg-muted-light/50 py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted/70">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border border-border bg-muted-light/50 py-3 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-all focus:border-primary"
                />
              </div>
            </div>

            {message && (
              <div className="rounded-2xl border border-success/25 bg-success-light/60 px-4 py-3 text-xs font-bold text-success">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-danger/25 bg-danger-light/60 px-4 py-3 text-xs font-bold text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-primary-dark disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'login' ? 'Masuk Sekarang' : 'Buat Akun'}
            </button>
          </form>

          <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-widest text-muted/60">
            Melapor tetap bisa tanpa login. Login dipakai untuk fitur riwayat.
          </p>
        </section>
      </div>
    </main>
  )
}

function LoginPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
