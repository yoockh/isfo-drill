# DrillKu

Aplikasi web latihan soal cerdas cermat **multi-bidang** dengan soal buatan AI
dan simulasi tekanan waktu. Cocok untuk KSR (Kompetisi Sains Ruangguru), OSN,
latihan sains/informatika, cybersecurity, hingga drill mandiri.

## Fitur

- **Multi-bidang**: pilih bidang (Matematika, Fisika, Kimia, Biologi,
  Informatika, Ekonomi, Bahasa, Keuangan Syariah/ISFO, Cybersecurity, Umum) +
  jenjang + instruksi tambahan, sehingga soal yang dibuat AI relevan.
- **Dua mode input soal**:
  - _Dari Materi_ — tempel/unggah materi, AI membuat draft soal pilihan ganda.
  - _Impor Soal Jadi_ — tempel/unggah teks yang sudah berupa daftar soal, AI
    hanya menatanya menjadi soal terstruktur (mendeteksi kunci jawaban).
- **Unggah PDF / TXT**: teks diekstrak langsung di browser (tanpa penyimpanan
  server), lalu dipakai untuk generate/impor.
- **Rumus & kode**: soal mendukung LaTeX (`$...$`, `$$...$$`) dan blok kode
  ```` ``` ````, dirender rapi di editor & saat kuis (KaTeX).
- **2–6 opsi** per soal (mendukung soal 5 opsi A–E atau benar/salah).
- Pembahasan AI untuk jawaban salah (di-cache agar hemat kuota).

## Tech Stack

- Next.js 16 (App Router)
- Firebase Auth + Firestore
- Groq API (Structured Outputs — `openai/gpt-oss-120b`)
- pdfjs-dist (ekstraksi teks PDF di browser) + KaTeX (render rumus)
- Tailwind CSS
- Deploy ke Vercel

## Setup

1. Copy `.env.example` ke `.env.local` dan isi semua variabel
2. `npm install`
3. `npm run dev`

## Development

```bash
npm run dev    # jalankan development server
npm run build  # build production
npm run start  # jalankan production server
```
