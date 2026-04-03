'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { searchLocation } from '@/lib/geo'
import { cn } from '@/lib/cn'

interface LocationSearchProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 3) {
        setIsLoading(true)
        const data = await searchLocation(query)
        setResults(data)
        setIsLoading(false)
        setShowResults(true)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const handleSelect = (res: any) => {
    onLocationSelect(parseFloat(res.lat), parseFloat(res.lon), res.display_name)
    setQuery('')
    setShowResults(false)
  }

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari lokasi lain (Kota, Jalan...)"
          className="w-full pl-11 pr-10 py-3.5 bg-white rounded-2xl border border-border focus:border-primary focus:ring-4 focus:ring-primary/5 focus:outline-none transition-all text-sm font-medium shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted-light rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {showResults && (results.length > 0 || isLoading) && (
        <div className="absolute z-[60] top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center gap-3 text-muted text-xs font-bold uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Mencari Lokasi...
            </div>
          ) : (
            <div className="divide-y divide-border">
              {results.map((res, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(res)}
                  className="w-full px-5 py-4 text-left hover:bg-primary-light/30 transition-colors flex items-start gap-3 group"
                >
                  <MapPin className="w-4 h-4 text-muted mt-0.5 group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="text-xs font-medium text-foreground leading-relaxed">
                    {res.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
