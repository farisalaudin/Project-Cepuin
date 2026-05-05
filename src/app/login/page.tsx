'use client'

import React, { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<'petugas' | 'warga'>('petugas')

  const ADMIN_EMAILS = ['admin@cepuin.id', 'test@admin.com'] // Hardcoded for MVP

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const user = data.user
      const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '')

      // Redirect based on type if next is not specified
      if (next === '/') {
        if (loginType === 'petugas') {
          if (!isAdmin) {
            throw new Error('Akses ditolak. Email Anda tidak terdaftar sebagai petugas.')
          }
          router.push('/admin')
        } else {
          router.push('/riwayat')
        }
      } else {
        // Prevent unauthorized access to admin via next param
        if (next.startsWith('/admin') && !isAdmin) {
          router.push('/riwayat')
        } else {
          router.push(next)
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted-light flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 p-3 bg-white rounded-2xl shadow-sm text-muted hover:text-primary transition-all active:scale-95 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Kembali</span>
          </Link>
          <div className="w-20 h-20 bg-primary rounded-[32px] flex items-center justify-center text-white font-black text-3xl mx-auto shadow-2xl shadow-primary/20">
            C
          </div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight mt-6">
            Masuk {loginType === 'petugas' ? 'Petugas' : 'Warga'}
          </h1>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">
            {loginType === 'petugas' ? 'Dashboard Administrasi Cepuin' : 'Pantau Riwayat Laporan Kamu'}
          </p>
        </div>

        {/* Login Type Switcher */}
        <div className="flex bg-white p-1 rounded-2xl border border-border/50 shadow-sm">
          <button
            onClick={() => setLoginType('petugas')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
              loginType === 'petugas' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-foreground"
            )}
          >
            Petugas
          </button>
          <button
            onClick={() => setLoginType('warga')}
            className={cn(
              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
              loginType === 'warga' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted hover:text-foreground"
            )}
          >
            Warga
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-[40px] shadow-2xl border border-border/50 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-primary-light/30 rounded-2xl border border-primary/10">
            {loginType === 'petugas' ? (
              <>
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-bold text-primary-dark uppercase leading-relaxed">
                  Khusus petugas pemerintah kota yang terdaftar.
                </p>
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-bold text-primary-dark uppercase leading-relaxed">
                  Masuk untuk melihat status dan notifikasi laporan Anda.
                </p>
              </>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted/60 uppercase tracking-widest ml-2">Email {loginType === 'petugas' ? 'Petugas' : 'Kamu'}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginType === 'petugas' ? "admin@cepuin.id" : "nama@email.com"}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-muted-light/50 rounded-2xl border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-sm font-bold text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted/60 uppercase tracking-widest ml-2">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-muted-light/50 rounded-2xl border border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all text-sm font-bold text-foreground"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-danger-light/50 border border-danger/20 rounded-2xl text-[10px] font-bold text-danger uppercase text-center animate-in shake duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2",
                isLoading ? "bg-muted" : "bg-primary hover:bg-primary-dark active:scale-95 shadow-primary/20"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk Sekarang"
              )}
            </button>
          </form>
          
          {loginType === 'warga' && (
            <div className="text-center pt-2">
              <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest leading-relaxed">
                Tidak wajib login untuk melapor.
                {' '}
                <Link href="/lapor" className="text-primary hover:underline">
                  Kirim laporan cepat dari beranda
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Help Footer */}
        <p className="text-[10px] text-center font-bold text-muted/60 uppercase tracking-widest">
          {loginType === 'petugas' ? 'Lupa akses? Hubungi tim IT Pemerintah Kota.' : 'Masalah login? Hubungi bantuan@cepuin.id'}
        </p>
      </div>
    </main>
  )
}

function LoginPageFallback() {
  return (
    <main className="min-h-screen bg-muted-light flex flex-col items-center justify-center p-6">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-xs font-bold text-muted uppercase tracking-widest">
        Memuat Halaman Login...
      </p>
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
