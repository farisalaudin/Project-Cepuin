# GEMINI.md — Antigravity Config untuk Cepuin

> File ini adalah instruksi ringkas untuk Antigravity/Gemini agent.
> Untuk detail lengkap, SELALU baca AGENTS.md dan agent_docs/ terlebih dahulu.

## Perintah Wajib Pertama

Setiap kali sesi baru dimulai, jalankan urutan ini:
1. Baca `AGENTS.md` — master contract proyek
2. Baca `agent_docs/project_brief.md` — konteks produk
3. Baca `agent_docs/tech_stack.md` — stack & environment
4. Baca `agent_docs/features.md` — spesifikasi fitur

Baru kemudian konfirmasi ke user: "Sudah baca semua docs. Saya siap lanjut [phase aktif]. Apakah ada yang perlu diklarifikasi sebelum mulai?"

## Stack Aktif

- Next.js 14 + TypeScript + Tailwind CSS
- Supabase (DB + Auth + Storage)
- Leaflet.js (maps)
- Vercel (hosting)
- Semua gratis — JANGAN sarankan tools berbayar

## Prinsip Kerja

PLAN dulu → TUNGGU APPROVAL → EXECUTE → VERIFY

Jangan langsung coding. Selalu ajukan rencana singkat dan tunggu user setuju.

## Anti-Pattern (Jangan Lakukan)

- Jangan gunakan `any` di TypeScript
- Jangan panggil Supabase langsung dari page/route — gunakan lib/
- Jangan tambah npm package baru tanpa diskusi
- Jangan ubah schema database tanpa konfirmasi
- Jangan lanjut ke fitur berikutnya jika ada error yang belum terselesaikan

## Konteks Bahasa

- Komunikasi dengan user: Bahasa Indonesia
- Kode & komentar: Bahasa Inggris
- Nama variabel/fungsi: Bahasa Inggris (camelCase)
- UI text: Bahasa Indonesia

## Jika Sesi Terlalu Panjang

Jangan buka chat baru yang kosong. Minta Gemini untuk:
"Buat ringkasan progress sesi ini dalam 5 poin, lalu kita lanjut dari sana."

Simpan ringkasan ke `agent_docs/session-recap.md`.

---
*GEMINI.md v1.0 — Cepuin | 2 April 2026*