# Tech Stack — Cepuin

> Semua tools di sini GRATIS. Jangan sarankan alternatif berbayar tanpa diskusi.

---

## Setup Awal (Lakukan Sekali)

### 1. Buat Akun yang Dibutuhkan
- [ ] GitHub: github.com (gratis)
- [ ] Supabase: supabase.com (gratis tier)
- [ ] Vercel: vercel.com (gratis, login pakai GitHub)
- [ ] Google Analytics: analytics.google.com (gratis)

### 2. Inisialisasi Project

```bash
# Buat Next.js project
npx create-next-app@latest cepuin \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd cepuin

# Install dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install leaflet react-leaflet
npm install @types/leaflet
npm install lucide-react
npm install clsx tailwind-merge
```

### 3. Konfigurasi Environment

Buat file `.env.local` di root project:
```
NEXT_PUBLIC_SUPABASE_URL=https://ekwkohemvghbiscylmht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrd2tvaGVtdmdoYmlzY3lsbWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMTgzMDMsImV4cCI6MjA5MDY5NDMwM30.PGF062PGMC4ESROG2CAJ7ShDFO8oqq1tJc-7LzZ5sic
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Cara dapat Supabase keys:
1. Buka supabase.com, buat project baru
2. Settings -> API
3. Copy "Project URL" dan "anon public key"

### 4. Setup Supabase Client

```typescript
// src/lib/supabase.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()
```

---

## Frontend: Next.js 14

**Kenapa Next.js:**
- Vercel gratis untuk Next.js
- Server-side rendering untuk performa & SEO
- App Router: routing modern, lebih clean
- TypeScript out-of-the-box

**Konvensi:**
- Semua halaman di `src/app/`
- Komponen reusable di `src/components/`
- Logic/utility di `src/lib/`
- Types di `src/types/`

**Naming conventions:**
```
Komponen:  PascalCase   (ReportCard.tsx)
Fungsi:    camelCase    (calculateUrgency)
File:      kebab-case   (report-card.tsx) untuk folder
Konstanta: UPPER_SNAKE  (MAX_RADIUS_KM)
```

---

## Styling: Tailwind CSS

**Color palette Cepuin:**
```css
/* tailwind.config.ts - extend colors */
colors: {
  primary: {
    DEFAULT: '#2563EB',  /* Blue-600 — trust, pemerintah */
    light:   '#DBEAFE',  /* Blue-100 */
    dark:    '#1D4ED8',  /* Blue-700 */
  },
  accent: {
    DEFAULT: '#F59E0B',  /* Amber-500 — urgent, warning */
    light:   '#FEF3C7',  /* Amber-100 */
  },
  success: '#10B981',    /* Emerald-500 — selesai */
  danger:  '#EF4444',    /* Red-500 — ditolak */
}
```

**Status colors:**
```
dilaporkan  → amber    (🟡)
diverifikasi → blue    (🔵)
dikerjakan  → orange   (🟠)
selesai     → green    (🟢)
ditolak     → red      (🔴)
```

---

## Backend / Database: Supabase

**Free tier limits (cukup untuk MVP):**
- Database: 500MB storage
- Auth: Unlimited users
- Storage: 1GB
- Edge Functions: 500k invocations/bulan
- Bandwidth: 2GB

**Setup Database:**
1. Buka Supabase Dashboard -> SQL Editor
2. Paste dan run schema dari AGENTS.md
3. Enable Row Level Security (RLS)

**RLS Policies yang wajib dibuat:**
```sql
-- Reports: semua bisa baca, hanya authenticated yang bisa insert
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports"
ON reports FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert"
ON reports FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Admin can update"
ON reports FOR UPDATE
USING (auth.jwt() ->> 'email' LIKE '%@admin.cepuin.id');

-- Votes: semua bisa insert (1 per session/user)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can vote"
ON votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read votes"
ON votes FOR SELECT USING (true);
```

**Supabase Storage (foto laporan):**
```
Bucket name: report-photos
Public: true (foto bisa diakses publik)
Max file size: 5MB per file
Allowed MIME: image/jpeg, image/png, image/webp
```

---

## Maps: Leaflet.js

**Kenapa Leaflet:**
- 100% gratis, tidak butuh API key
- Ringan (~40KB)
- Tile dari OpenStreetMap (gratis)

**Setup dasar:**
```typescript
// src/components/map/ReportMap.tsx
'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// PENTING: Fix Leaflet default icon di Next.js
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Map harus di-import secara dynamic di Next.js (no SSR)
// Gunakan: const Map = dynamic(() => import('@/components/map/ReportMap'), { ssr: false })
```

**Tile URL OpenStreetMap (gratis):**
```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## Geolocation: Browser API

```typescript
// src/lib/geo.ts

export const getCurrentLocation = (): Promise<GeolocationCoordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung browser ini'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}

// Hitung jarak antara 2 titik GPS (Haversine formula, hasil dalam meter)
export const getDistanceInMeters = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371000 // radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// Cek apakah ada laporan duplikat dalam radius 50m
export const DUPLICATE_RADIUS_METERS = 50
export const FEED_RADIUS_KM = 2
```

---

## Image Upload

```typescript
// src/lib/storage.ts
import { supabase } from './supabase'

export const uploadReportPhoto = async (file: File, reportId: string) => {
  // Compress sebelum upload (target < 800KB)
  const compressedFile = await compressImage(file, 800 * 1024)
  
  const fileName = `${reportId}/${Date.now()}.${file.name.split('.').pop()}`
  const { data, error } = await supabase.storage
    .from('report-photos')
    .upload(fileName, compressedFile)
  
  if (error) throw error
  
  const { data: urlData } = supabase.storage
    .from('report-photos')
    .getPublicUrl(fileName)
  
  return urlData.publicUrl
}

// Simple image compression menggunakan Canvas API
const compressImage = (file: File, maxBytes: number): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    img.onload = () => {
      let { width, height } = img
      const maxDim = 1200
      
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = (height / width) * maxDim; width = maxDim }
        else { width = (width / height) * maxDim; height = maxDim }
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.75)
    }
    
    img.src = URL.createObjectURL(file)
  })
}
```

---

## TypeScript Types Utama

```typescript
// src/types/index.ts

export type ReportCategory =
  | 'jalan_berlubang'
  | 'lampu_mati'
  | 'banjir'
  | 'sampah_menumpuk'
  | 'drainase_rusak'
  | 'fasilitas_umum'
  | 'lainnya'

export type ReportStatus =
  | 'dilaporkan'
  | 'diverifikasi'
  | 'dikerjakan'
  | 'selesai'
  | 'ditolak'

export interface Report {
  id: string
  user_id: string | null
  category: ReportCategory
  description: string | null
  photo_url: string | null
  lat: number
  lng: number
  address: string | null
  status: ReportStatus
  urgency_score: number
  vote_count: number
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface Vote {
  id: string
  report_id: string
  user_id: string | null
  session_id: string | null
  created_at: string
}

export interface StatusHistory {
  id: string
  report_id: string
  old_status: ReportStatus | null
  new_status: ReportStatus
  changed_by: string
  note: string | null
  created_at: string
}
```

---

## Hosting: Vercel

**Deploy otomatis:**
1. Push code ke GitHub
2. Buka vercel.com -> New Project -> Import dari GitHub
3. Add environment variables (sama dengan .env.local)
4. Deploy — selesai!

**Custom domain (opsional):**
- Beli domain di Niagahoster/Domainesia (~Rp 100k/tahun)
- Tambah di Vercel: Settings -> Domains
- Update nameserver sesuai instruksi Vercel

---
*Untuk detail fitur dan implementasi, lihat features.md*
