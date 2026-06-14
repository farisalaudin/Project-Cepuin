# Langkah Pasca-Implementasi (Post-Implementation Steps)

Setelah fitur lokasi dua-lapis diimplementasikan dan diverifikasi secara lokal di codebase, ikuti langkah-langkah berikut untuk menerapkannya di server database Supabase dan production (Vercel).

---

## 1. Terapkan SQL Patch ke Supabase

Karena database dikelola langsung oleh Supabase, Anda perlu menjalankan patch SQL secara manual:

1. Buka **Supabase Dashboard** proyek Anda.
2. Navigasikan ke menu **SQL Editor** di panel sebelah kiri.
3. Buat query baru (klik **New Query**).
4. Buka berkas [manual_patch_2026_06_14_reporter_gps.sql](file:///c:/Users/User/.gemini/antigravity/scratch/Project-Cepuin/supabase/manual_patch_2026_06_14_reporter_gps.sql).
5. Salin (Copy) seluruh isi berkas SQL tersebut.
6. Tempel (Paste) ke dalam SQL Editor Supabase.
7. Klik **Run** di pojok kanan bawah.
8. Pastikan muncul pesan sukses:
   ```text
   Patch 2026-06-14 berhasil dijalankan.
     + Kolom reporter GPS, jarak_pelapor_km, risk_flag, disclaimer ditambahkan ke reports
     + Fungsi haversine_km tersedia
     + Trigger trg_jarak_risk aktif (BEFORE INSERT)
     + RPC submit_report diperbarui dengan parameter reporter GPS & disclaimer
   ```

---

## 2. Deploy Codebase ke Vercel

Setelah SQL patch berhasil diterapkan di database Supabase:

1. Commit semua perubahan kode di repositori lokal Anda:
   ```bash
   git add .
   git commit -m "feat: implement two-layer location tracking (incident pin vs reporter GPS)"
   ```
2. Push commit tersebut ke branch utama Anda di GitHub untuk memicu auto-deploy di Vercel:
   ```bash
   git push origin main
   ```
3. Buka **Vercel Dashboard** dan pastikan proses build selesai tanpa error.

---

## 3. Lakukan Pengujian Manual (Quality Assurance)

Uji fitur di lingkungan production/staging untuk memastikan sistem lokasi dua-lapis berjalan sesuai spesifikasi:

### Skenario A: Pelaporan Normal (GPS Sesuai Kejadian)
1. Buka halaman pelaporan warga (`/lapor`).
2. Izinkan akses lokasi (GPS) pada peramban/browser Anda.
3. Geser pin peta (lokasi kejadian) ke titik terdekat dengan lokasi Anda saat ini.
4. Setujui disclaimer dan kirim laporan.
5. **Verifikasi**: Laporan terkirim, masuk ke admin wilayah yang sesuai, nilai `risk_flag = false`, dan `jarak_pelapor_km` bernilai kecil (di bawah 50 km).

### Skenario B: Deteksi Lokasi Jauh (Risk Flag Terdeteksi)
1. Buka halaman pelaporan warga (`/lapor`).
2. Aktifkan GPS Anda (misal berada di Jakarta).
3. Geser pin kejadian di peta ke kota lain yang jauhnya > 50 km (misal Kota Malang).
4. Setujui disclaimer dan kirim laporan.
5. **Verifikasi**: Laporan tetap masuk ke wilayah Kota Malang (sesuai pin kejadian), tetapi di dashboard admin muncul tanda **⚠️ Risk Flag** dengan catatan jarak yang akurat.

### Skenario C: Tanpa Akses GPS
1. Matikan izin lokasi (GPS) pada browser/perangkat Anda.
2. Buka halaman pelaporan warga (`/lapor`).
3. Tentukan lokasi kejadian di peta secara manual.
4. Kirim laporan.
5. **Verifikasi**: Laporan tetap berhasil terkirim tanpa hambatan, kolom koordinat reporter bernilai `null` di database, dan tidak memicu `risk_flag`.
