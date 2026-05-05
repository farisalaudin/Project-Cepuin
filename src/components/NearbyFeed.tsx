'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react'
import { getCurrentLocation } from '@/lib/geo'
import { getNearbyReports, getLatestReports } from '@/lib/reports'
import { Report } from '@/types'
import ReportCard from './ReportCard'
import LocationSearch from './LocationSearch'

interface FeedFetchOptions {
  forceLocation?: boolean
  manualCoords?: { lat: number; lng: number; address: string }
  keepCurrentList?: boolean
}

export default function NearbyFeed() {
  const [reports, setReports] = useState<Report[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<string>('Sekitar Kamu')
  const [isFallback, setIsFallback] = useState(false)
  const hasLoadedRef = useRef(false)
  const latestRequestRef = useRef(0)

  const fetchFeed = useCallback(async ({
    forceLocation = false,
    manualCoords,
    keepCurrentList = true
  }: FeedFetchOptions = {}) => {
    const requestId = ++latestRequestRef.current

    if (!hasLoadedRef.current || !keepCurrentList) {
      setIsInitialLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      let currentCoords = coords
      let fallbackMode = false
      let nextAddress = address
      let data: Report[] = []

      if (manualCoords) {
        currentCoords = { lat: manualCoords.lat, lng: manualCoords.lng }
        nextAddress = manualCoords.address
        data = await getNearbyReports(currentCoords.lat, currentCoords.lng)
      } else if (!currentCoords || forceLocation) {
        try {
          const pos = await getCurrentLocation()
          currentCoords = { lat: pos.latitude, lng: pos.longitude }
          nextAddress = 'Sekitar Kamu'
          data = await getNearbyReports(currentCoords.lat, currentCoords.lng)
        } catch (geoErr) {
          console.warn('GPS failed, falling back to latest reports:', geoErr)
          fallbackMode = true
          nextAddress = 'Terbaru di Kotamu'
          data = await getLatestReports()
        }
      } else {
        data = await getNearbyReports(currentCoords.lat, currentCoords.lng)
      }

      if (requestId === latestRequestRef.current) {
        if (currentCoords) {
          setCoords(currentCoords)
        }
        setAddress(nextAddress)
        setIsFallback(fallbackMode)
        setReports(data)
      }
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      if (requestId === latestRequestRef.current) {
        hasLoadedRef.current = true
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [coords, address])

  useEffect(() => {
    void (async () => {
      setIsInitialLoading(true)
      setIsFallback(true)
      setAddress('Terbaru di Kotamu')
      try {
        const data = await getLatestReports()
        setReports(data)
      } catch (err) {
        console.error('Initial feed error:', err)
      } finally {
        hasLoadedRef.current = true
        setIsInitialLoading(false)
      }
    })()
  }, [])

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Search Bar */}
      <div className="px-1">
        <LocationSearch 
          onLocationSelect={(lat, lng, addr) => {
            void fetchFeed({
              manualCoords: { lat, lng, address: addr },
              keepCurrentList: true
            })
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col flex-1 min-w-0 pr-4">
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            📍 <span className="truncate max-w-[200px] uppercase">{address}</span>
          </h2>
          <p className="text-[10px] font-black text-muted/60 uppercase tracking-widest flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Laporan dalam radius 2km
          </p>
        </div>
        <button
          onClick={() => void fetchFeed({ forceLocation: true, keepCurrentList: true })}
          disabled={isInitialLoading || isRefreshing}
          className="p-3 rounded-2xl bg-white/50 backdrop-blur-sm border border-border text-muted hover:text-primary transition-all active:rotate-180 active:scale-95 disabled:opacity-50 shadow-sm hover:border-primary/30"
        >
          {isInitialLoading || isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </button>
      </div>

      {isRefreshing && (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted/60">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          Memperbarui laporan...
        </div>
      )}

      {isInitialLoading && reports.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {isFallback && (
            <div className="p-4 bg-primary-light/30 border border-primary/10 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <AlertCircle className="w-4 h-4 text-primary" />
              </div>
              <p className="text-[10px] font-bold text-primary-dark uppercase leading-relaxed">
                Aktifkan lokasi untuk melihat masalah di sekitarmu.
              </p>
            </div>
          )}

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border-2 border-dashed border-border bg-white shadow-inner">
              <div className="w-12 h-12 bg-muted-light rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-muted" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Belum Ada Laporan</h3>
              <p className="text-[10px] text-muted max-w-xs mt-1 px-6 leading-relaxed">
                Sepertinya lingkunganmu aman atau belum ada yang melapor. Ayo jadi yang pertama!
              </p>
              <button
                onClick={() => window.location.href = '/lapor'}
                className="mt-6 px-6 py-2.5 bg-primary text-white text-[10px] font-bold rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Mulai Melaporkan
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onVoteSuccess={(reportId) => {
                    setReports((prev) =>
                      prev.map((item) =>
                        item.id === reportId
                          ? { ...item, vote_count: item.vote_count + 1 }
                          : item
                      )
                    )
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
