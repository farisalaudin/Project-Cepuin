# Spesifikasi Fitur — Cepuin MVP

> Implementasikan fitur sesuai urutan Phase. Jangan lompat ke phase berikutnya.
> Setiap fitur harus selesai + ditest sebelum lanjut.

---

## PHASE 1: Foundation

### Setup Project & Database

**Langkah-langkah:**
1. Init Next.js project (lihat tech_stack.md)
2. Install semua dependencies
3. Setup Supabase: buat project, jalankan schema SQL dari AGENTS.md
4. Setup RLS policies di Supabase
5. Buat Supabase Storage bucket `report-photos`
6. Test koneksi: bisa insert dan baca dari database

**Test sukses:**
- `npm run dev` berjalan tanpa error
- Bisa connect ke Supabase dari code
- Supabase dashboard menampilkan tabel yang benar

---

## PHASE 2: Core Features

### F1 — Form Laporan

**User story:** "Sebagai warga yang buru-buru, saya ingin melapor tanpa daftar agar cepat"

**Halaman:** `/lapor`

**Elemen form (urutan tampil ke user):**

1. **Kategori** (required)
   - Pilihan: Radio button atau card select (visual lebih baik)
   - Icons per kategori (gunakan lucide-react)
   - Mapping kategori ke urgency value

2. **Foto** (optional tapi dianjurkan)
   - Upload dari kamera HP atau galeri
   - Preview setelah pilih foto
   - Compress otomatis sebelum upload (< 800KB)
   - Tampilkan progress upload

3. **Lokasi GPS** (required)
   - Auto-detect saat halaman dibuka
   - Tampilkan: "Mendeteksi lokasi..." → "Lokasi terdeteksi: [alamat]"
   - Reverse geocoding: konversi lat/lng ke nama jalan
   - Tampilkan mini-map dengan pin lokasi
   - Tombol "Ubah Lokasi" jika salah

4. **Deskripsi** (optional)
   - Textarea max 280 karakter
   - Counter karakter

5. **Tombol Submit**
   - Label: "Laporkan Sekarang"
   - Disable saat loading
   - Show spinner saat proses

**Flow setelah submit:**
```
Submit → Upload foto (jika ada) → Save ke database → 
Hitung urgency_score → Check duplikat →
Jika duplikat: tampilkan laporan existing + ajakan vote
Jika baru: tampilkan success screen + ajakan login
```

**Success screen:**
```
✅ Laporan Berhasil Dikirim!
Laporan #[ID singkat] sudah masuk sistem.
Warga lain bisa vote untuk naikan prioritas.

[Login untuk pantau status] [Lihat di Feed]
```

**Implementasi reverse geocoding (gratis):**
```typescript
// Pakai Nominatim OpenStreetMap - gratis, no API key
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  )
  const data = await res.json()
  return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
// CATATAN: Nominatim rate limit 1 request/detik. Gunakan dengan bijak.
```

---

### F2 — Validasi Duplikat GPS

**User story:** "Sebagai admin, saya tidak ingin 10 laporan sama untuk 1 jalan berlubang"

**Logic:**
```
Saat user submit laporan baru:
1. Ambil koordinat user (lat, lng)
2. Query laporan yang ada dalam radius 50 meter
3. Filter yang kategorinya sama
4. Filter yang statusnya bukan 'selesai' atau 'ditolak'
5. Jika ada → tampilkan laporan existing
6. Jika tidak ada → lanjut buat laporan baru
```

**Supabase query (menggunakan PostGIS-like calculation):**
```typescript
// src/lib/reports.ts
export const findNearbyDuplicates = async (
  lat: number, lng: number, category: string
) => {
  // Supabase belum punya PostGIS di free tier
  // Gunakan bounding box approximation (cukup akurat untuk 50m)
  const RADIUS_DEGREES = 0.00045 // ~50 meter dalam derajat

  const { data } = await supabase
    .from('reports')
    .select('*')
    .eq('category', category)
    .not('status', 'in', '("selesai","ditolak")')
    .gte('lat', lat - RADIUS_DEGREES)
    .lte('lat', lat + RADIUS_DEGREES)
    .gte('lng', lng - RADIUS_DEGREES)
    .lte('lng', lng + RADIUS_DEGREES)

  // Filter lebih presisi dengan Haversine
  return data?.filter(report => 
    getDistanceInMeters(lat, lng, report.lat, report.lng) <= 50
  ) ?? []
}
```

**UI saat duplikat terdeteksi:**
```
⚠️ Masalah Ini Sudah Dilaporkan!

[Card laporan existing dengan foto, kategori, vote count]

Ingin dukung laporan ini?
[Ini Juga Saya Alami! (+1 vote)]  [Lapor Tetap (Berbeda)]
```

---

### F3 — Sistem Vote "Ini Juga Saya Alami"

**User story:** "Sebagai warga, saya ingin dukung laporan yang valid tanpa bikin baru"

**Aturan:**
- 1 user = 1 vote per laporan (enforce di database dengan UNIQUE constraint)
- User anonymous: track via localStorage session ID
- Setelah vote: counter langsung update (optimistic UI)
- Setelah vote: recalculate urgency_score

**Implementasi session ID untuk anonymous:**
```typescript
// src/lib/session.ts
export const getSessionId = (): string => {
  const key = 'cepuin_session_id'
  let sessionId = localStorage.getItem(key)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(key, sessionId)
  }
  return sessionId
}
```

**Vote function:**
```typescript
// src/lib/votes.ts
export const submitVote = async (reportId: string) => {
  const sessionId = getSessionId()
  const { data: user } = await supabase.auth.getUser()

  const { error } = await supabase.from('votes').insert({
    report_id: reportId,
    user_id: user?.user?.id ?? null,
    session_id: user?.user ? null : sessionId, // pakai session_id jika anonymous
  })

  if (error) {
    if (error.code === '23505') throw new Error('Sudah vote') // unique constraint
    throw error
  }

  // Update vote_count dan recalculate urgency
  await recalculateUrgency(reportId)
}
```

**Tampilan vote button:**
```
Sebelum vote:
[👍 Ini Juga Saya Alami! (12)]

Setelah vote:
[✅ Sudah Vote (13)] ← disabled, warna hijau
```

---

### F4 — Feed Laporan Sekitar

**User story:** "Sebagai warga, saya ingin tahu masalah apa saja di sekitar saya"

**Halaman:** `/` (home)

**Layout (mobile-first):**
```
┌─────────────────────────┐
│  🗺️ Peta mini (30% height) │
│  (laporan sebagai pins)  │
├─────────────────────────┤
│  📍 Sekitar [Lokasi Anda]│
│  [Filter: Semua | Urgent]│
├─────────────────────────┤
│  Card laporan 1          │
│  Card laporan 2          │
│  Card laporan 3          │
│  ...                     │
├─────────────────────────┤
│  [+ LAPORIN]  ← FAB     │
└─────────────────────────┘
```

**Floating Action Button (FAB):**
- Selalu visible di kanan bawah
- Warna primary blue
- Icon "+" atau "📢"
- Link ke `/lapor`

**Card laporan:**
```
┌────────────────────────┐
│ [Foto]  Jalan Berlubang│
│         Jl. Merdeka 12 │
│         ⭐ 12 votes    │
│         🕒 2 jam lalu  │
│         🟡 Dilaporkan  │
└────────────────────────┘
```

**Query feed:**
```typescript
// src/lib/reports.ts
export const getNearbyReports = async (lat: number, lng: number) => {
  const RADIUS_DEGREES = 0.018 // ~2 km

  const { data } = await supabase
    .from('reports')
    .select('*')
    .gte('lat', lat - RADIUS_DEGREES)
    .lte('lat', lat + RADIUS_DEGREES)
    .gte('lng', lng - RADIUS_DEGREES)
    .lte('lng', lng + RADIUS_DEGREES)
    .order('urgency_score', { ascending: false })
    .limit(20)

  return data?.filter(r =>
    getDistanceInMeters(lat, lng, r.lat, r.lng) <= 2000
  ) ?? []
}
```

**Jika GPS ditolak user:**
- Tampilkan semua laporan terbaru (tanpa filter lokasi)
- Tampilkan banner: "Aktifkan lokasi untuk melihat masalah di sekitar Anda"

---

### F5 — Skor Urgensi Otomatis

**User story:** "Sebagai admin, saya ingin tahu laporan mana yang paling urgent"

**Formula (dari AGENTS.md):**
```
urgency_score = (vote_count x 0.4) + (category_urgency x 0.4) + (time_decay x 0.2)
```

**Implementasi:**
```typescript
// src/lib/urgency.ts

const CATEGORY_URGENCY: Record<string, number> = {
  jalan_berlubang:  90,
  lampu_mati:       70,
  banjir:           95,
  sampah_menumpuk:  60,
  drainase_rusak:   75,
  fasilitas_umum:   55,
  lainnya:          50,
}

export const calculateUrgencyScore = (
  voteCount: number,
  category: string,
  createdAt: string
): number => {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / 86400000
  const timeScore = Math.min(100, daysSince * 3)
  const categorySCore = CATEGORY_URGENCY[category] ?? 50

  // Normalize vote (cap di 100, asumsikan 50 vote = max)
  const voteScore = Math.min(100, voteCount * 2)

  return Math.round(
    (voteScore * 0.4) + (categorySCore * 0.4) + (timeSScore * 0.2)
  )
}

// Panggil ini setiap ada vote baru
export const recalculateUrgency = async (reportId: string) => {
  const { data: report } = await supabase
    .from('reports')
    .select('vote_count, category, created_at')
    .eq('id', reportId)
    .single()

  if (!report) return

  const newScore = calculateUrgencyScore(
    report.vote_count,
    report.category,
    report.created_at
  )

  await supabase
    .from('reports')
    .update({ urgency_score: newScore })
    .eq('id', reportId)
}
```

---

### F6 — Dashboard Admin

**User story:** "Sebagai admin pemkot, saya ingin kelola semua laporan dari 1 dashboard"

**Akses:** `/admin` — protected, hanya email tertentu (hardcode untuk MVP)

**Proteksi sederhana untuk MVP:**
```typescript
// src/app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

const ADMIN_EMAILS = ['admin@cepuin.id', 'test@admin.com'] // hardcode untuk MVP

export default async function AdminLayout({ children }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/login?next=/admin')
  }
  
  return <>{children}</>
}
```

**Layout dashboard:**
```
Header: Logo | Statistik ringkas | Logout

Baris atas:
┌─────────────────┬──────────────────┐
│ Total Laporan   │ Laporan Bulan Ini│
│ 127             │ 43               │
├─────────────────┼──────────────────┤
│ Terselesaikan   │ Rata-rata Urgency│
│ 38 (30%)        │ 67.3             │
└─────────────────┴──────────────────┘

Peta:
┌────────────────────────────────────┐
│  [Peta full-width dengan marker]   │
│  [Cluster otomatis jika banyak]    │
│  [Click marker → detail laporan]   │
└────────────────────────────────────┘

Tabel laporan:
┌──────┬─────────────┬────────┬───────┬────────┬────────┐
│ Skor │ Kategori    │ Lokasi │ Votes │ Status │ Aksi   │
├──────┼─────────────┼────────┼───────┼────────┼────────┤
│ 89   │ Jalan Bolong│ Jl...  │ 23    │ 🟡 Dlp │ [Edit] │
└──────┴─────────────┴────────┴───────┴────────┴────────┘
```

**Filter & sort tabel:**
- Filter by status (dropdown)
- Filter by kategori (dropdown)
- Sort by urgency_score, created_at, vote_count
- Search by lokasi/deskripsi

**Modal edit laporan:**
```
Update Status: [Dropdown: Diverifikasi | Dikerjakan | Selesai | Ditolak]
Assign Petugas: [Input nama petugas]
Catatan: [Textarea]
[Simpan Perubahan]
```

**Setelah update status:**
- Simpan ke `status_history`
- Update `updated_at` di reports
- Recalculate urgency (status selesai = tidak perlu)

---

## PHASE 3: Enhancement

### F7 — Cari Lokasi Manual

**User story:** "Sebagai user, saya ingin lihat daerah lain meski GPS saya error"

**Implementasi:**
```typescript
// Pakai Nominatim untuk geocoding (gratis)
const searchLocation = async (query: string) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=id`
  )
  return res.json()
}
```

**UI:**
- Search bar di atas feed
- Autocomplete dengan debounce 500ms
- Pilih lokasi → update peta + feed

---

### Halaman Detail Laporan

**URL:** `/laporan/[id]`

**Konten:**
- Foto (fullsize jika ada)
- Kategori + badge status (warna sesuai status)
- Lokasi + mini peta
- Deskripsi
- Vote count + tombol vote
- Timeline status (dari status_history)
- Tombol share (Web Share API)

---

## Checklist Testing Sebelum Launch

### Functional Testing
- [ ] Form laporan bisa disubmit tanpa login
- [ ] GPS detect otomatis berfungsi
- [ ] Foto upload dan tampil di feed
- [ ] Deteksi duplikat bekerja (test manual: submit 2 laporan lokasi sama)
- [ ] Vote berfungsi: counter bertambah, tidak bisa vote dua kali
- [ ] Urgency score berubah setelah ada vote
- [ ] Feed menampilkan laporan terdekat
- [ ] Dashboard admin bisa akses dan update status
- [ ] Status history tersimpan

### Mobile Testing (WAJIB)
- [ ] Test di Chrome Android
- [ ] Test di Safari iOS
- [ ] GPS permission dialog muncul dengan benar
- [ ] Camera upload berfungsi di HP
- [ ] Layout tidak rusak di layar kecil (320px)
- [ ] FAB (tombol Laporin) tidak tertutup elemen lain

### Performance
- [ ] Feed load < 3 detik pada koneksi 4G
- [ ] Foto dicompress sebelum upload
- [ ] Peta tidak lag saat ada 20+ marker

---
*Untuk setup teknis, lihat tech_stack.md*
*Master contract ada di AGENTS.md*