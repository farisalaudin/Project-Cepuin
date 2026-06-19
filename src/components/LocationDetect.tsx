'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Navigation,
} from 'lucide-react'
import { getCurrentLocation, reverseGeocodeDetails } from '@/lib/geo'
import { cn } from '@/lib/cn'
import dynamic from 'next/dynamic'
import { matchWilayahId } from '@/lib/wilayah'
import type { DetectedLocation } from '@/types'

// Dynamically import Leaflet Map to avoid SSR issues
const MapPreview = dynamic(() => import('./MapPreview'), {
  ssr: false,
  loading: () => (
    <div className="h-56 bg-muted-light rounded-2xl animate-pulse flex items-center justify-center text-xs text-muted">
      Memuat Peta...
    </div>
  ),
})

interface LocationDetectProps {
  onLocationFound: (location: DetectedLocation) => void
}

/**
 * PinLocationPicker — user places a draggable pin on the map to mark the
 * INCIDENT location. Reporter's GPS (where they are now) is:
 *   - used only as the default starting position of the pin
 *   - collected separately at submit time (silently, for audit)
 *   - NEVER used to determine which admin receives the report
 */
export default function LocationDetect({ onLocationFound }: LocationDetectProps) {
  // Pin coordinates — this is the incident location (determines admin routing)
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [pinAddress, setPinAddress] = useState<string>('')
  const [pinWilayahId, setPinWilayahId] = useState<string | null>(null)
  const [pinGeoFields, setPinGeoFields] = useState<{
    kelurahan: string | null
    kecamatan: string | null
    kabupaten: string | null
    provinsi: string | null
  } | null>(null)

  const [isLoadingGPS, setIsLoadingGPS] = useState(false)
  const [isResolvingAddress, setIsResolvingAddress] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const latestGeocodeRequestRef = useRef(0)
  const onLocationFoundRef = useRef(onLocationFound)

  useEffect(() => {
    onLocationFoundRef.current = onLocationFound
  }, [onLocationFound])

  // Reverse geocode the pin and notify parent — called every time pin moves
  const resolvePin = useCallback(async (lat: number, lng: number) => {
    const requestId = ++latestGeocodeRequestRef.current
    setIsResolvingAddress(true)
    setPinAddress('Memperbarui alamat lokasi kejadian...')

    try {
      const geocodeResult = await reverseGeocodeDetails(lat, lng)
      const matchedWilayahId = await matchWilayahId(geocodeResult)

      if (requestId !== latestGeocodeRequestRef.current) return

      setPinAddress(geocodeResult.displayName)
      setPinWilayahId(matchedWilayahId)
      setPinGeoFields({
        kelurahan: geocodeResult.kelurahan,
        kecamatan: geocodeResult.kecamatan,
        kabupaten: geocodeResult.kabupaten,
        provinsi: geocodeResult.provinsi,
      })

      onLocationFoundRef.current({
        lat,
        lng,
        accuracy: null, // Pin accuracy is exact — no GPS error margin
        wilayahId: matchedWilayahId,
        ...geocodeResult,
      })
    } finally {
      if (requestId === latestGeocodeRequestRef.current) {
        setIsResolvingAddress(false)
      }
    }
  }, [])

  // Set pin to a new position (triggered by drag, click, or GPS init)
  const movePin = useCallback(
    (lat: number, lng: number) => {
      setPinCoords({ lat, lng })
      void resolvePin(lat, lng)
    },
    [resolvePin]
  )

  // Detect GPS to use as default pin starting position
  const initFromGPS = useCallback(async () => {
    setIsLoadingGPS(true)
    setGpsError(null)
    try {
      const pos = await getCurrentLocation()
      movePin(pos.latitude, pos.longitude)
    } catch (err) {
      const geoError = err as GeolocationPositionError
      if (geoError?.code === 1) {
        setGpsError('Izin lokasi ditolak. Geser pin secara manual ke lokasi kejadian.')
      } else {
        setGpsError('GPS tidak tersedia. Geser pin ke lokasi kejadian di peta.')
      }
      // Fallback: center map on Indonesia
      movePin(-7.25, 112.75)
    } finally {
      setIsLoadingGPS(false)
      setHasInitialized(true)
    }
  }, [movePin])

  // Initialize on mount
  useEffect(() => {
    if (!hasInitialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void initFromGPS()
    }
  }, [hasInitialized, initFromGPS])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-foreground">
          Lokasi Kejadian <span className="text-danger">*</span>
        </label>
        <button
          type="button"
          onClick={initFromGPS}
          disabled={isLoadingGPS}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoadingGPS ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          Posisi GPS Saya
        </button>
      </div>

      {/* Informational note — dual location concept explained to user */}
      <div className="flex items-start gap-2 rounded-2xl border border-primary/15 bg-primary-light/20 px-4 py-3">
        <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-primary-dark/80 leading-relaxed">
          <span className="font-bold">Tandai lokasi kejadian di peta.</span>{' '}
          Geser pin ke titik yang tepat. GPS Anda hanya dipakai sebagai titik awal — Anda
          tidak harus berada di lokasi saat melaporkan.
        </p>
      </div>

      {/* GPS Error Banner */}
      {gpsError && (
        <div className="flex items-start gap-2 rounded-2xl border border-accent/20 bg-accent-light/40 px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-accent-dark mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-accent-dark leading-relaxed">{gpsError}</p>
        </div>
      )}

      {/* Interactive Map */}
      {isLoadingGPS && !pinCoords ? (
        <div className="h-56 bg-muted-light rounded-2xl animate-pulse flex items-center justify-center">
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted">Mendeteksi posisi GPS awal...</p>
          </div>
        </div>
      ) : pinCoords ? (
        <div className="space-y-2">
          <div className="h-56 w-full rounded-2xl overflow-hidden border-2 border-border shadow-inner relative">
            <MapPreview
              lat={pinCoords.lat}
              lng={pinCoords.lng}
              interactive={true}
              onLocationChange={movePin}
            />
            {/* Drag hint overlay — fades after first interaction */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold text-white/90 shadow-lg">
                <MapPin className="w-3 h-3" />
                Geser pin ke lokasi kejadian
              </div>
            </div>
          </div>

          {/* Address preview card */}
          <div className={cn(
            'p-4 rounded-2xl border-2 transition-all duration-300',
            isResolvingAddress
              ? 'border-primary/20 bg-primary-light/10'
              : 'border-border bg-white'
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-xl mt-0.5 flex-shrink-0',
                isResolvingAddress ? 'bg-primary-light text-primary' : 'bg-success-light text-success'
              )}>
                {isResolvingAddress ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted/60 mb-1">
                  Lokasi Kejadian Terdeteksi
                </p>
                {isResolvingAddress ? (
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-muted-light rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted-light rounded w-1/2 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-foreground leading-relaxed">
                    {pinAddress || 'Memuat alamat...'}
                  </p>
                )}

                {/* Administrative details */}
                {pinGeoFields && !isResolvingAddress && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pinGeoFields.kelurahan && (
                      <span className="px-2 py-0.5 rounded-full bg-muted-light text-[10px] font-bold text-muted">
                        {pinGeoFields.kelurahan}
                      </span>
                    )}
                    {pinGeoFields.kecamatan && (
                      <span className="px-2 py-0.5 rounded-full bg-muted-light text-[10px] font-bold text-muted">
                        {pinGeoFields.kecamatan}
                      </span>
                    )}
                    {pinGeoFields.kabupaten && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-light text-[10px] font-bold text-primary-dark">
                        {pinGeoFields.kabupaten}
                      </span>
                    )}
                  </div>
                )}

                {/* Wilayah status */}
                {!isResolvingAddress && pinAddress && (
                  <p className={cn(
                    'mt-2 text-[10px] font-bold uppercase tracking-widest',
                    pinWilayahId ? 'text-success' : 'text-accent-dark'
                  )}>
                    {pinWilayahId
                      ? '✓ Wilayah terdaftar — laporan akan diteruskan ke admin'
                      : '⚠ Wilayah belum terdaftar — masuk antrian review admin pusat'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Coordinates readout */}
          <p className="text-[10px] font-bold text-center text-muted/50 tracking-widest uppercase">
            Pin: {pinCoords.lat.toFixed(6)}, {pinCoords.lng.toFixed(6)}
          </p>
        </div>
      ) : null}
    </div>
  )
}
