'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, RefreshCw, AlertCircle, Search, X } from 'lucide-react'
import { getCurrentLocation, reverseGeocode, searchLocation } from '@/lib/geo'
import { cn } from '@/lib/cn'
import dynamic from 'next/dynamic'
import type { SearchLocationResult } from '@/types'

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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchLocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const detectLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setSearchQuery('')
    setShowSearch(false)
    try {
      const pos = await getCurrentLocation()
      const { latitude, longitude } = pos
      setCoords({ lat: latitude, lng: longitude })
      
      const addr = await reverseGeocode(latitude, longitude)
      setAddress(addr)
      onLocationFound(latitude, longitude, addr)
    } catch (err) {
      console.error('Location detection error:', err)
      const geoError = err as GeolocationPositionError
      if (geoError?.code === 1) {
        setError('Izin lokasi ditolak. Mohon izinkan GPS di browser Anda.')
      } else if (geoError?.code === 2) {
        setError('Lokasi tidak tersedia. Pastikan perangkat Anda memiliki akses GPS.')
      } else if (geoError?.code === 3) {
        setError('Waktu deteksi lokasi habis. Coba lagi dengan sinyal yang lebih baik.')
      } else {
        setError('Gagal mendeteksi lokasi. Pastikan GPS aktif dan izinkan akses.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [onLocationFound])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length >= 3) {
      setIsSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchLocation(query)
        setSearchResults(results)
        setIsSearching(false)
      }, 500)
    } else {
      setSearchResults([])
      setIsSearching(false)
    }
  }

  const handleSelectLocation = (result: SearchLocationResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const addr = result.display_name

    setCoords({ lat, lng })
    setAddress(addr)
    setSearchQuery('')
    setSearchResults([])
    setShowSearch(false)
    setError(null)
    onLocationFound(lat, lng, addr)
  }

  // Detect location on mount
  useEffect(() => {
    detectLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          Lokasi Kejadian <span className="text-danger">*</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-all active:scale-95"
          >
            {showSearch ? (
              <><X className="w-3.5 h-3.5" /> Tutup Cari</>
            ) : (
              <><Search className="w-3.5 h-3.5" /> Cari Lokasi</>
            )}
          </button>
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
            GPS Otomatis
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        Browser akan meminta izin GPS secara otomatis saat halaman ini dimuat. Jika diminta, pilih &quot;Izinkan&quot; agar lokasi kejadian terisi otomatis.
      </p>

      {showSearch && (
        <div className="relative animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Cari jalan, kelurahan, atau kecamatan..."
              className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-2 border-primary/20 focus:border-primary focus:outline-none transition-all text-sm font-medium"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl border-2 border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectLocation(result)}
                  className="w-full px-4 py-3 text-left hover:bg-muted-light transition-colors flex items-start gap-3 border-b border-border last:border-0"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground line-clamp-2">
                    {result.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
