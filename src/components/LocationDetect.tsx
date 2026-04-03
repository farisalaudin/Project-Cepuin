'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { getCurrentLocation, reverseGeocode } from '@/lib/geo'
import { cn } from '@/lib/cn'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet Map to avoid SSR issues
const MapPreview = dynamic(() => import('./MapPreview'), { 
  ssr: false,
  loading: () => <div className="h-40 bg-muted-light rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted">Memuat Peta...</div>
})

interface LocationDetectProps {
  onLocationFound: (lat: number, lng: number, address: string) => void
}

export default function LocationDetect({ onLocationFound }: LocationDetectProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectLocation = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const pos = await getCurrentLocation()
      const { latitude, longitude } = pos
      setCoords({ lat: latitude, lng: longitude })
      
      const addr = await reverseGeocode(latitude, longitude)
      setAddress(addr)
      onLocationFound(latitude, longitude, addr)
    } catch (err) {
      console.error('Location detection error:', err)
      setError('Gagal mendeteksi lokasi. Pastikan GPS aktif.')
    } finally {
      setIsLoading(false)
    }
  }

  // Detect location on mount
  useEffect(() => {
    detectLocation()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          Lokasi Kejadian <span className="text-danger">*</span>
        </label>
        <button
          type="button"
          onClick={detectLocation}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Perbarui Lokasi
        </button>
      </div>

      <div className={cn(
        "p-4 rounded-2xl border-2 transition-all duration-300",
        error ? "border-danger/30 bg-danger-light/50" : "border-border bg-white"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-xl mt-0.5",
            error ? "bg-danger-light text-danger" : "bg-primary-light text-primary"
          )}>
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-muted-light rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-muted-light rounded w-1/2 animate-pulse" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-1.5 text-sm text-danger font-medium">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            ) : address ? (
              <p className="text-sm text-foreground font-medium leading-relaxed">
                {address}
              </p>
            ) : (
              <p className="text-sm text-muted italic">Mendeteksi lokasi...</p>
            )}
          </div>
        </div>
      </div>

      {coords && !isLoading && !error && (
        <div className="h-40 w-full rounded-2xl overflow-hidden border-2 border-border shadow-inner">
          <MapPreview lat={coords.lat} lng={coords.lng} />
        </div>
      )}
    </div>
  )
}
