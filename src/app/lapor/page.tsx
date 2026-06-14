'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Info } from 'lucide-react'
import ReportForm from '@/components/ReportForm'

export default function LaporPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-border bg-white p-2.5 text-muted transition-all hover:border-primary hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground sm:text-xl">Kirim Laporan</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted/70">
                Mode Warga
              </p>
            </div>
          </div>

          <button
            className="rounded-xl border border-border bg-white p-2.5 text-primary transition-all hover:bg-primary-light/50"
            onClick={() => alert('Tips: isi kategori, lokasi, lalu kirim. Foto opsional.')}
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto mt-5 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,#115e59_0%,#0f766e_55%,#0b4c49_100%)] p-6 text-white shadow-[0_28px_80px_-40px_rgba(15,118,110,0.9)] sm:p-7">
          <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            Bantu kota jadi lebih cepat tanggap.
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-white/85 sm:text-base">
            Laporan Anda akan langsung masuk antrean penanganan. Isi singkat, jelas, dan sesuai lokasi.
          </p>
        </section>

        <section className="mt-5 rounded-[30px] border border-border bg-white p-5 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.35)] sm:p-6 lg:p-8">
          <ReportForm />
        </section>

        <footer className="mt-6 rounded-2xl border border-border bg-white/80 p-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted/70">
            Bukan untuk keadaan darurat. Hubungi <span className="text-primary">112</span> untuk ambulans/pemadam.
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
            Butuh lihat status? <Link href="/riwayat" className="text-primary hover:underline">Buka riwayat</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}

