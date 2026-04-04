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
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-white/70 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl bg-muted-light/50 text-muted hover:text-foreground transition-all active:scale-95 hover:bg-border"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black text-foreground uppercase tracking-tight leading-none">
              Laporin Masalah
            </h1>
            <p className="text-[10px] font-bold text-muted/60 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Laporan Real-time
            </p>
          </div>
        </div>
        
        <button 
          className="p-2.5 rounded-xl bg-primary-light/50 text-primary hover:bg-primary-light transition-all active:scale-95 shadow-sm shadow-primary/5"
          onClick={() => alert('Fitur bantuan belum tersedia')}
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* Hero Header */}
      <div className="px-6 py-10 bg-gradient-to-br from-primary-light/30 via-white to-background relative overflow-hidden">
        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full bg-accent/5 blur-2xl" />
        <div className="relative z-10 max-w-xs space-y-3">
          <h2 className="text-2xl font-black text-primary-dark tracking-tight leading-tight uppercase">
            Ayo Bantu <br /> Perbaiki <span className="text-accent">Kota Kita!</span>
          </h2>
          <p className="text-xs text-muted/80 font-bold uppercase tracking-wider leading-relaxed">
            Laporkan masalah infrastruktur di sekitarmu dalam hitungan detik.
          </p>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="px-6 flex-1 bg-white/50 backdrop-blur-sm rounded-t-[48px] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.05)] border-t border-border/50 pt-12">
        <ReportForm />
      </div>

      {/* Footer Navigation (Mobile Style) */}
      <footer className="sticky bottom-0 p-5 bg-white/80 backdrop-blur-md border-t border-border flex justify-center">
        <p className="text-[9px] font-black text-muted/60 uppercase tracking-[0.15em] text-center leading-relaxed">
          Bukan untuk keadaan darurat. <br /> Hubungi <span className="text-primary-dark">112</span> untuk Ambulans/Pemadam.
        </p>
      </footer>
    </main>
  )
}
