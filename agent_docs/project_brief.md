# Project Brief — Cepuin

## Apa Itu Cepuin?

Cepuin adalah aplikasi web crowdsourced untuk melaporkan masalah infrastruktur kota (jalan berlubang, lampu mati, drainase rusak, dll). Warga bisa lapor dalam < 60 detik, warga lain bisa vote untuk menaikkan prioritas, dan admin pemkot bisa kelola semua laporan dari satu dashboard.

**Analogi:** "Waze untuk jalan berlubang" — tapi dengan integrasi ke sistem pemerintah.

## Target User Utama

**Andi** — Mahasiswa 21 tahun, naik motor tiap hari, peduli keselamatan, tidak mau repot daftar akun hanya untuk lapor.

Pain points-nya:
- Tidak tahu harus lapor ke mana
- Proses konvensional ribet dan lama
- Tidak ada feedback apakah laporannya ditindaklanjuti
- Takut datanya dipakai untuk hal yang tidak perlu

**Apa yang dia mau:**
- Lapor dalam < 60 detik tanpa daftar
- Lihat status laporannya
- Tau laporannya berdampak

## Target Launch

- 50 laporan di bulan pertama
- 30% laporan terselesaikan
- 20 pengguna aktif per minggu
- Waktu submit < 90 detik

## Kompetitor & Kekurangan Mereka

| Kompetitor | Kekurangan |
|------------|------------|
| LAPOR! SP4N | Proses panjang, tidak real-time, tidak ada feedback visual |
| Waze | Fokus lalu lintas, bukan infrastruktur, tidak terhubung ke pemerintah |
| Aplikasi Pemkot | Terfragmentasi per kota, UX buruk, tidak ada sistem prioritas |

## Nilai Utama Cepuin

1. **Frictionless** — Lapor tanpa daftar, form singkat
2. **Transparan** — Status laporan bisa dipantau publik
3. **Berbobot** — Voting sistem membuat laporan yang paling penting naik ke atas
4. **Action-oriented** — Bukan sekadar lapor, tapi mendorong tindakan nyata

## User Journey Utama

```
Andi hampir celaka di jalan berlubang
       ↓
Buka Cepuin, klik "Laporin"
       ↓
Isi form: pilih kategori, foto, GPS otomatis, deskripsi singkat
       ↓
Submit → muncul di feed publik
       ↓
User lain vote: "Ini juga saya alami"
       ↓
Skor urgensi naik → admin prioritaskan
       ↓
Admin update status: Dikerjakan → Selesai
       ↓
Andi lihat status berubah → trust terbangun
```

## Kategori Laporan (MVP)

- Jalan Berlubang
- Lampu Jalan Mati
- Banjir / Genangan Air
- Sampah Menumpuk
- Drainase Rusak
- Fasilitas Umum Rusak
- Lainnya

## Batasan MVP (Jangan Dibangun Sekarang)

- Push notification (V2)
- Gamifikasi / badge (V2)
- Multi-bahasa (V2)
- API publik (V2)
- AI deteksi foto otomatis (V3)

---
*Untuk spesifikasi teknis, lihat tech_stack.md*
*Untuk detail fitur, lihat features.md*
