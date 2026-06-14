# AGENTS.md — Cepuin MVP
> **Master Contract** — Baca file ini PERTAMA sebelum melakukan apapun.
> Jika ada konflik antara file ini dan file lain, file ini yang menang.

---

## Identitas Proyek

| | |
|---|---|
| **Nama App** | Cepuin |
| **Tagline** | Laporan Cepat Tanggap, Penyelesaian Masalah di Jalan |
| **Tipe** | Web app crowdsourced pelaporan infrastruktur kota |
| **Target Launch** | 3–7 hari |
| **Budget** | $0 — semua tools HARUS gratis |
| **Status Aktif** | MVP Phase 1 |

---

## Cara Berpikir yang Benar

Sebelum menulis satu baris kode pun, AI agent wajib:

1. **Pahami intent dulu** — Apa yang benar-benar dibutuhkan user, bukan yang tertulis harfiah
2. **Tanya jika ragu** — Jika ada info yang kurang, tanya SATU pertanyaan spesifik
3. **Plan dulu, baru code** — Ajukan rencana singkat, tunggu persetujuan, baru implement
4. **Satu fitur satu waktu** — Selesaikan & test dulu, baru lanjut fitur berikutnya
5. **Verifikasi setiap perubahan** — Cek tidak ada error sebelum lapor "selesai"
6. **Jelaskan trade-off** — Jika ada pilihan teknis, sebutkan opsi & rekomendasinya

---

## Tech Stack (TIDAK BOLEH DIUBAH tanpa diskusi)

| Layer | Tool | Alasan |
|-------|------|--------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS | Vercel gratis, performa baik |
| **Backend / DB** | Supabase (Postgres + Auth + Storage) | Free tier cukup, all-in-one |
| **Maps** | Leaflet.js + OpenStreetMap | 100% gratis, no API key |
| **Image Storage** | Supabase Storage | 1GB gratis |
| **Hosting** | Vercel (deploy dari GitHub) | Auto-deploy, free |
| **Analytics** | Google Analytics 4 | Gratis |
| **Language** | TypeScript | Type safety, tangkap error lebih awal |

> Detail stack lengkap -> lihat agent_docs/tech_stack.md

---

## Fitur MVP — Status Tracking

Centang saat fitur selesai dan sudah ditest:

### Phase 1: Foundation
- [ ] Project setup (Next.js + Supabase + Tailwind)
- [ ] Database schema lengkap
- [ ] Auth: anonymous session + optional email login

### Phase 2: Core Features (P0)
- [ ] F1 — Form laporan (kategori, foto, GPS, deskripsi)
- [ ] F2 — Validasi duplikat GPS (radius 50m)
- [ ] F3 — Sistem vote "Ini juga saya alami" (1 user = 1 vote)
- [ ] F4 — Feed laporan sekitar (radius 2km, load < 3 detik)
- [ ] F5 — Skor urgensi otomatis (formula di bawah)
- [ ] F6 — Dashboard admin (peta cluster + tabel + status workflow)

### Phase 3: Enhancement (P1)
- [ ] F7 — Cari lokasi manual (search + autocomplete)
- [ ] Halaman detail laporan
- [ ] Landing page (hero + CTA)
- [ ] Mobile testing & responsiveness

### Phase 4: Launch
- [ ] GA4 terpasang
- [ ] Beta test dengan 5-10 user
- [ ] Deploy ke Vercel production

> Detail setiap fitur -> lihat agent_docs/features.md

---

## Formula Skor Urgensi

```
urgency_score = (vote_count x 0.4) + (category_urgency x 0.4) + (time_decay x 0.2)
```

Category urgency values:
- jalan_berlubang  : 90
- lampu_mati       : 70
- banjir           : 95
- sampah_menumpuk  : 60
- drainase_rusak   : 75
- fasilitas_umum   : 55
- lainnya          : 50

Time decay (nilai 0-100, makin lama makin tinggi urgensinya):
```
time_decay = min(100, days_since_report x 3)
```

Final score: 0-100, diupdate setiap ada vote baru.

---

## Database Schema (Supabase Postgres)

```sql
-- REPORTS (laporan)
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),
  category      TEXT NOT NULL,
  description   TEXT,
  photo_url     TEXT,
  lat           DECIMAL(10, 8) NOT NULL,
  lng           DECIMAL(11, 8) NOT NULL,
  address       TEXT,
  status        TEXT DEFAULT 'dilaporkan',
  urgency_score DECIMAL(5,2) DEFAULT 0,
  vote_count    INT DEFAULT 0,
  assigned_to   TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- VOTES (gabung laporan / upvote)
CREATE TABLE votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id     UUID,
  session_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, user_id),
  UNIQUE(report_id, session_id)
);

-- STATUS HISTORY (audit trail)
CREATE TABLE status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID REFERENCES reports(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT,
  changed_by  TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Status Workflow Laporan

```
Dilaporkan -> Diverifikasi -> Dikerjakan -> Selesai
     |              |
  Ditolak       Ditolak (duplikat/spam)
```

Aturan:
- Hanya admin yang bisa ubah status
- Setiap perubahan HARUS masuk status_history
- Status "Ditolak" wajib ada catatan alasan

---

## Struktur Folder Project

```
cepuin/
├── AGENTS.md                       <- File ini (baca pertama!)
├── GEMINI.md                       <- Config Antigravity/Gemini
├── agent_docs/
│   ├── project_brief.md            <- Konteks produk lengkap
│   ├── tech_stack.md               <- Setup & konfigurasi teknis
│   └── features.md                 <- Spesifikasi detail fitur
├── src/
│   ├── app/
│   │   ├── page.tsx                <- Landing page / home feed
│   │   ├── lapor/page.tsx          <- Form laporan
│   │   ├── laporan/[id]/page.tsx   <- Detail laporan
│   │   └── admin/
│   │       ├── page.tsx            <- Dashboard admin
│   │       └── layout.tsx          <- Admin layout (auth guard)
│   ├── components/
│   │   ├── ui/                     <- Button, Card, Badge, dll
│   │   ├── map/                    <- Komponen peta Leaflet
│   │   ├── report/                 <- Form & card laporan
│   │   └── admin/                  <- Komponen dashboard
│   ├── lib/
│   │   ├── supabase.ts             <- Supabase client
│   │   ├── geo.ts                  <- Geolocation & proximity
│   │   └── urgency.ts              <- Kalkulasi skor urgensi
│   └── types/
│       └── index.ts                <- TypeScript types
├── .env.local                      <- Keys (JANGAN di-commit!)
└── package.json
```

---

## Larangan Keras (WAJIB DIPATUHI)

- DILARANG hapus file tanpa konfirmasi eksplisit
- DILARANG ubah database schema tanpa memberitahu user
- DILARANG tambah fitur di luar phase aktif
- DILARANG pakai tools/library berbayar
- DILARANG skip testing mobile
- DILARANG placeholder "Lorem ipsum" di production
- DILARANG gunakan tipe `any` di TypeScript
- DILARANG panggil database langsung dari route handlers
- DILARANG commit jika ada error TypeScript atau ESLint

---

## Cara Memulai Setiap Sesi

```
1. Baca AGENTS.md (file ini)
2. Baca agent_docs/ yang relevan
3. Cek Phase mana yang sedang aktif
4. Rangkum: "Saya akan [task]. Rencananya: [langkah]. Boleh saya mulai?"
5. Tunggu persetujuan, baru implement
```

---

## Perintah Berguna

```bash
npm install          # Setup awal
npm run dev          # Start localhost:3000
npm run lint         # Cek ESLint sebelum commit
npm run type-check   # Cek TypeScript sebelum commit
npm run build        # Test build sebelum deploy
git push origin main # Deploy otomatis ke Vercel
```

---

*AGENTS.md v1.0 — Cepuin MVP | Dibuat: 2 April 2026*