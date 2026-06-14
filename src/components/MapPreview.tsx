'use client'

import React, { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L, { type LeafletEventHandlerFnMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issue with Next.js/Leaflet
const icon = L.icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 16)
  }, [lat, lng, map])
  return null
}

function MapClickHandler({
  interactive,
  onLocationChange,
}: {
  interactive: boolean
  onLocationChange?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(event) {
      if (!interactive || !onLocationChange) return
      onLocationChange(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

interface MapPreviewProps {
  lat: number
  lng: number
  interactive?: boolean
  onLocationChange?: (lat: number, lng: number) => void
}

export default function MapPreview({
  lat,
  lng,
  interactive = false,
  onLocationChange,
}: MapPreviewProps) {
  const markerEventHandlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragend(event) {
        if (!interactive || !onLocationChange) return
        const marker = event.target as L.Marker
        const nextPosition = marker.getLatLng()
        onLocationChange(nextPosition.lat, nextPosition.lng)
      },
    }),
    [interactive, onLocationChange]
  )

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[lat, lng]}
        icon={icon}
        draggable={interactive}
        eventHandlers={markerEventHandlers}
      />
      <MapController lat={lat} lng={lng} />
      <MapClickHandler interactive={interactive} onLocationChange={onLocationChange} />
    </MapContainer>
  )
}
