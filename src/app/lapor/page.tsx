'use client'

import React from 'react'
import { ChevronLeft, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReportForm from '@/components/ReportForm'

export default function LaporPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background flex flex-col max-w-lg mx-auto shadow-xl">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-muted-light text-muted hover:text-foreground transition-all active:scale-95 hover:bg-border"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Laporin Masalah
            </h1>
            <p className="text-[10px] font-medium text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Laporan Real-time
            </p>
          </div>
        </div>
        
        <button 
          className="p-2.5 rounded-xl bg-primary-light/50 text-primary hover:bg-primary-light transition-all active:scale-95"
          onClick={() => alert('Fitur bantuan belum tersedia')}
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* Hero Header */}
      <div className="px-6 py-8 bg-gradient-to-br from-primary-light/30 via-white to-background">
        <div className="max-w-xs space-y-2">
          <h2 className="text-2xl font-black text-primary-dark tracking-tight">
            Ayo Bantu Perbaiki <span className="text-accent">Kota Kita!</span>
          </h2>
          <p className="text-sm text-muted font-medium leading-relaxed">
            Laporkan masalah infrastruktur di sekitarmu. Cukup pilih kategori, foto, dan kirim.
          </p>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="px-6 flex-1 bg-white rounded-t-[40px] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.05)] pt-10">
        <ReportForm />
      </div>

      {/* Footer Navigation (Mobile Style) */}
      <footer className="sticky bottom-0 p-4 bg-white/90 backdrop-blur-md border-t border-border flex justify-center">
        <p className="text-[10px] text-muted font-medium italic">
          Bukan untuk keadaan darurat (Ambulans/Pemadam). Hubungi 112.
        </p>
      </footer>
    </main>
  )
}
