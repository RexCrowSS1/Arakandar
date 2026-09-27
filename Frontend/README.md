# Arakan Ndar — Frontend

Halaman utama mengintegrasikan **Website Page UI.zip** melalui
`features/website-page-ui/WebsitePageUI.jsx` dan `data.js`.
Ticker bergerak kanan ke kiri tanpa putus, berhenti saat hover/fokus, serta memiliki
kontrol jeda dan kecepatan. Klik quote menyiapkan pertanyaan di panel analyst.
Preferensi reduced motion menonaktifkan animasi dan menyediakan scroll manual.
Navigasi mobile memisahkan menu, workspace, dan analyst. Harga masih snapshot demo.
Chat halaman utama menggunakan model Arakandar lokal melalui `POST /api/chat`,
yang meneruskan percakapan ke `POST /chat` pada backend FastAPI. Atur
`API_URL=http://127.0.0.1:8000` di `.env.local` dan jalankan backend dengan dependensi
`inference` sesuai [panduan backend](../Backend/README.md#model-arakandar-lokal).
Model yang belum siap atau gagal merespons ditampilkan sebagai error, tanpa
menggantinya dengan respons demo. Riwayat dan draft bertahan saat panel diperbesar
atau ditutup, dan dihapus saat membuat percakapan baru atau memuat ulang halaman.

Implementasi sebelumnya tetap tersedia di `features/financial-platform`.
Detail di bawah mendokumentasikan implementasi sebelumnya.

Implementasi Next.js App Router dari desain **AI Financial Platform UI**.
Tampilan memakai Tailwind CSS sepenuhnya. Palet, font, dan animasi berada di
`tailwind.config.mjs`; `app/globals.css` hanya memuat Tailwind dan konfigurasinya.
Barlow, Barlow Condensed, dan JetBrains Mono disajikan lokal melalui `next/font`.

## Struktur

```text
app/
  page.jsx                       Route utama
  layout.jsx                     Metadata, font, dan layout dokumen
  fonts.js                       Font lokal dari paket Fontsource
  globals.css                    Entry Tailwind
features/financial-platform/
  FinancialPlatform.jsx          Shell, workspace aktif, catatan, dan drawing
  components/                    Ticker, sidebar, header, input, kontrol bersama
  workspaces/                    Market dan Technical
  analyst/                       Panel percakapan dan respons demo
  chart/                         Rendering SVG, drawing, perhitungan indikator
  data/                          Snapshot pasar dan daftar recent dari desain
  ui.js                          Utility dan recipe interaksi Tailwind
tests/
  chart-math.test.mjs             Regresi indikator dan kasus data kosong
tailwind.config.mjs               Token desain dan animasi
```

`page.jsx` tetap berupa Server Component yang merender `FinancialPlatform` sebagai
client boundary. State input disimpan dekat komponennya; state lintas workspace
berada di shell. Perhitungan indikator berupa fungsi murni agar dapat diuji tanpa
browser. Konfigurasi Vite dan skrip deployment dari ZIP tidak digunakan.

## Menjalankan

Gunakan Node.js 20.9 atau lebih baru.

```bash
cd Frontend
npm ci
npm run dev
```

Buka `http://localhost:3000`. Preview market tetap bisa dibuka tanpa backend;
chat membutuhkan backend lokal dan bobot Arakandar. Kunci API tidak diperlukan
untuk repo model publik ini.

## Fitur dan batas data

- Layout tiga kolom pada desktop; menu dan panel analyst terpisah pada mobile.
- Pencarian memfilter Recent. Memilih item membuka workspace dan ticker terkait.
- Catatan bertahan ketika berpindah workspace/ticker selama sesi halaman berjalan.
  Catatan dan drawing belum disimpan permanen; reload akan menghapusnya.
- Sample harga intraday tersedia untuk IHSG dan BBCA. Ticker lain atau rentang
  waktu lain menampilkan keadaan tanpa data.
- LINE/AREA, SMA5, EMA10, RSI14, Bollinger20, dan volume dapat digunakan.
  Candle/OHLC dinonaktifkan karena ZIP hanya menyediakan closing prices.
  MACD dinonaktifkan untuk snapshot 25 harga; perhitungannya memerlukan minimal 26.
- Drawing: klik titik di chart atau gunakan tombol panah + Enter, Escape untuk
  membatalkan draft, dan Undo untuk menghapus drawing terakhir. Koordinat disimpan
  sebagai indeks dan nilai harga agar tetap mengikuti chart ketika ukurannya berubah.
- Panel analyst mendukung Expand dan Fullscreen. Percakapan menggunakan respons
  demo lokal, tanpa koneksi model AI atau feed pasar live.
- Angka merupakan snapshot 6 September 2024 dari desain. Quote IHSG diselaraskan
  antara ticker, workspace, dan titik chart terakhir; indikator dihitung dari
  closing prices, bukan angka label hard-coded di ZIP.

## Pemeriksaan

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Jika sandbox membatasi proses internal Turbopack, build yang sama dapat dijalankan
melalui webpack dengan `npm run build -- --webpack`.

Jalankan `npm run format` untuk merapikan format kode secara konsisten.
