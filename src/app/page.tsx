'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, AlertTriangle, ArrowRight, ThumbsUp, CheckCircle2, Navigation, RefreshCw } from "lucide-react"
import Link from 'next/link'
import NearbyFeed from '@/components/NearbyFeed'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { getCurrentLocation } from '@/lib/geo'

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
      
      const totalVotes = voteData?.reduce((acc, r) => acc + (r.vote_count || 0), 0) || 0

      setStats({
        reports: reportCount || 0,
        resolved: resolvedCount || 0,
        votes: totalVotes
      })
    } catch (err) {
      console.error('Stats fetch error:', err)
    } finally {
      setIsStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Request GPS permission on app load
  useEffect(() => {
    getCurrentLocation().then((coords) => {
      // Store location in localStorage for fallback use
      localStorage.setItem('defaultLat', coords.latitude.toString())
      localStorage.setItem('defaultLng', coords.longitude.toString())
    }).catch(() => {
      // Ignore errors - permission denied or unavailable
    })
  }, [])

  return (
    <main className="flex flex-col min-h-screen max-w-lg mx-auto bg-background shadow-2xl">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-8 py-20 text-center bg-gradient-to-br from-primary via-primary-dark to-[#1e3a8a] overflow-hidden rounded-b-[48px] shadow-xl">
        {/* Decorative elements */}
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full bg-white/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 rounded-full bg-accent/10 blur-2xl" />

        <div className="relative z-10 max-w-sm mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/20">
            <MapPin className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
              Cepu-in <br />
              <span className="text-accent text-3xl font-extrabold italic">Infrastruktur Kotamu</span>
            </h1>
            <p className="text-sm text-blue-100/80 max-w-[280px] mx-auto leading-relaxed font-medium">
              Laporkan jalan berlubang, lampu mati, atau banjir dalam <span className="text-accent-light font-bold">60 detik</span>. Tanpa daftar, langsung berdampak.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 pt-4">
            <Link
              href="/lapor"
              className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 text-sm font-black text-primary-dark bg-white rounded-2xl shadow-2xl shadow-black/20 hover:bg-blue-50 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <AlertTriangle className="w-5 h-5 text-primary" />
              Laporin Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-8 -mt-8 relative z-20">
        <div className="bg-white p-6 rounded-[32px] shadow-2xl shadow-primary/5 grid grid-cols-3 gap-4 border border-border/50 relative">
          {/* Refresh Stats Button */}
          <button 
            onClick={fetchStats}
            disabled={isStatsLoading}
            className="absolute -top-3 -right-3 p-2 bg-white border border-border rounded-full shadow-lg text-muted hover:text-primary transition-all active:rotate-180 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", isStatsLoading && "animate-spin")} />
          </button>

          <div className="flex flex-col items-center justify-center space-y-1 group">
            <div className="p-2.5 rounded-xl bg-primary-light/50 group-hover:bg-primary group-hover:text-white transition-colors">
              <Navigation className="w-4 h-4 text-primary group-hover:text-white" />
            </div>
            {isStatsLoading ? (
              <div className="h-7 w-8 bg-muted-light rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-foreground">{stats.reports}</p>
            )}
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Laporan</p>
          </div>
          <div className="flex flex-col items-center justify-center space-y-1 group border-x border-border/50 px-2">
            <div className="p-2.5 rounded-xl bg-success-light/50 group-hover:bg-success group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4 text-success group-hover:text-white" />
            </div>
            {isStatsLoading ? (
              <div className="h-7 w-8 bg-muted-light rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-foreground">{stats.resolved}</p>
            )}
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Selesai</p>
          </div>
          <div className="flex flex-col items-center justify-center space-y-1 group">
            <div className="p-2.5 rounded-xl bg-accent-light/50 group-hover:bg-accent group-hover:text-white transition-colors">
              <ThumbsUp className="w-4 h-4 text-accent group-hover:text-white" />
            </div>
            {isStatsLoading ? (
              <div className="h-7 w-8 bg-muted-light rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl font-black text-foreground">{stats.votes}</p>
            )}
            <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Dukungan</p>
          </div>
        </div>
      </section>

      {/* Feed Section */}
      <section className="flex-1 px-8 py-10 bg-background">
        <NearbyFeed />
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 text-center bg-white border-t border-border/50">
        <p className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.2em]">
          © 2026 Cepuin — Transparansi Pembangunan Kota
        </p>
      </footer>

      {/* Floating Action Button (FAB) */}
      <Link
        href="/lapor"
        className="fixed bottom-8 right-6 z-50 p-5 bg-primary text-white rounded-3xl shadow-2xl shadow-primary/40 hover:bg-primary-dark hover:scale-110 active:scale-95 transition-all duration-300 md:right-[calc(50%-220px)]"
      >
        <div className="relative">
          <AlertTriangle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-primary animate-ping" />
        </div>
      </Link>
    </main>
  );
}
