# Arakan Ndar — Frontend

Landing page `/` dan `/landing` memakai `features/landing-page/LandingPage.jsx`
serta CSS Module tersendiri. Pratinjau terminal dapat memilih IHSG/BBCA/BBRI/BMRI/TLKM
serta rentang 1D/1M/3M/1Y; harga dan candlestick diambil dari `/api/market/chart`.
Status loading, data lama, dan kegagalan feed ditampilkan tanpa harga contoh.
Navigasi mengarahkan pengguna ke login, pendaftaran, atau workspace analisis.

Halaman analisis `/analysis` mengintegrasikan **Website Page UI.zip** melalui
`features/website-page-ui/WebsitePageUI.jsx`.
Ticker bergerak kanan ke kiri tanpa putus, berhenti saat hover/fokus, serta memiliki
kontrol jeda dan kecepatan. Klik quote menyiapkan pertanyaan di panel analyst.
Preferensi reduced motion menonaktifkan animasi dan menyediakan scroll manual.
Navigasi mobile memisahkan menu, workspace, dan analyst. Data pasar mengambil feed publik yang tertunda sesuai bursa.
Chat halaman analisis menggunakan model Arakandar lokal melalui
`POST /api/conversations/{id}/messages`, yang meneruskan pesan ke backend FastAPI. Atur
`API_URL=http://127.0.0.1:8000` di `.env.local` dan jalankan backend dengan dependensi
`inference` sesuai [panduan backend](../Backend/README.md#model-arakandar-lokal).
Model yang belum siap atau gagal merespons ditampilkan sebagai error, tanpa
menggantinya dengan respons demo. **New Conversation** langsung membuat record
Supabase milik akun yang sedang masuk. Daftar **Recent** dan pencarian sidebar
menggunakan riwayat database; memilih item memuat kembali pesan dan sumbernya.
Reload memulihkan percakapan terakhir, dan model menggunakan riwayat dari Supabase
untuk pertanyaan lanjutan. Draft belum terkirim tetap lokal.

Alur halaman: `/` (landing) → `/sign-up` atau `/sign-in` → `/analysis`.
`/landing` tetap tersedia. Form mencakup validasi, konfirmasi password, tombol
lihat password, status proses, dan pesan kesalahan. Pendaftaran yang memerlukan
verifikasi email menampilkan instruksi untuk memverifikasi lalu masuk.

Login menggunakan `/api/auth/*` sebagai perantara ke FastAPI. Token berada di
cookie HttpOnly, bukan localStorage; Next.js memverifikasi dan memperbarui sesi
sebelum membuka analisis/API. FastAPI memeriksa ulang identitas dan kepemilikan
percakapan. Pilihan percakapan terakhir di localStorage dipisahkan berdasarkan
ID akun. Menu profil menampilkan nama/email/role akun aktif dan tombol **SIGN OUT**.
Kunci Supabase hanya berada di backend. Lihat [pengaturan akun dan admin](../Backend/README.md#akun-dan-sesi).

Pengiriman ulang memakai ID yang sama agar tidak menggandakan pesan. Jika AI gagal,
pertanyaan yang sudah tersimpan tetap ada dan draft dikembalikan untuk dicoba lagi.

**Cari di internet** aktif secara default. Pertanyaan terakhir dan ticker dikirim
ke pencarian backend; riwayat lengkap tetap untuk inferensi lokal. Jawaban menyertakan
status pencarian, tautan sumber, waktu pencarian, dan tanggal terbit jika tersedia.
Jika pencarian gagal, panel menjelaskan bahwa informasi terbaru belum terverifikasi.
Google News RSS menjadi sumber berita default tanpa API key; pilihan mesin pencari
web umum tersedia di [konfigurasi backend](../Backend/README.md#koneksi-internet-dan-sumber-jawaban).
Batas waktu proxy chat adalah 240 detik untuk
mengakomodasi pencarian dan inferensi lokal.

## Grafik dan data pasar

Halaman analisis memakai `WebsitePageUI.jsx`, `use-market.mjs`, dan `market-data.mjs`.
Kode desain lama di `features/financial-platform` tidak menjadi route utama;
fungsi matematik indikatornya dipakai kembali. `website-page-ui/data.js` hanya
arsip fixture desain, tidak diimpor oleh website aktif.

- Ticker, market overview, OHLCV, volume, sektor, movers watchlist, dan berita
  memakai endpoint `/api/market/*` dari backend. Grafik mengikuti ticker/rentang
  yang dipilih, termasuk ketika memilih sektor atau top mover.
- Harga/grafik diperiksa otomatis setiap 60 detik; berita setiap 5 menit. Polling
  berhenti ketika tab tersembunyi dan dilanjutkan saat aktif. Request lama dibatalkan
  saat ticker/timeframe berganti, sehingga respons lama tidak menimpa pilihan baru.
- IDX menggunakan feed publik Yahoo dengan delay 10 menit. Waktu/sumber dan status
  stale/offline ditampilkan. Kegagalan tidak diganti angka demo; cache browser
  kedaluwarsa setelah 10 menit tanpa pembaruan.
- Breadth dan movers terbatas pada watchlist 9 saham. Broker summary, foreign flow,
  domestic flow, trade value/frequency dan new high/low memerlukan feed IDX berlisensi.
- Grafik teknikal memakai candle OHLCV asli dan indikator MA20, EMA20, RSI14,
  MACD12/26/9, Bollinger20, volume, stochastic %K14, serta VWAP intraday. Nilai
  warmup/volume hilang ditampilkan sebagai belum tersedia, bukan nol.
- Timeframe, ticker, dan indikator aktif ikut konteks percakapan Supabase dan
  dipulihkan saat membuka riwayat. Backend menyertakan bukti harga pada jawaban AI.
- Catatan/drawing masih lokal; reload atau unmount workspace menghapusnya.
  Drawing disimpan sebagai waktu/harga, sehingga tetap mengikuti zoom dan skala harga.
- Scroll/pinch atau tombol +/− memperbesar/memperkecil grafik; drag menggeser waktu.
  Interval candle otomatis mengikuti rentang, dari 1 menit sampai 1 tahun. Tombol
  timeframe memilih interval secara manual, RESET/Home kembali ke data terbaru.
  Intraday lama mungkin tidak tersedia dari penyedia; tampilan kosong menjelaskannya.
- FULLSCREEN memperluas grafik beserta kontrol dan indikator; Esc/EXIT mengembalikannya.
  Jika fullscreen native tidak didukung, grafik memenuhi viewport halaman.
  RSI memakai skala tetap 0–100, tick 0/25/50/75/100, dan panduan 30/70.

## Menjalankan

Gunakan Node.js 20.9 atau lebih baru.

```bash
cd Frontend
npm ci
npm run dev
```

Buka `http://localhost:3000`. Backend diperlukan untuk data pasar dan Supabase.
Jalankan backend dengan `BANDAR_PASAR_AI_ENABLED=false` jika hanya ingin data online
serta penyimpanan percakapan tanpa memuat model. Chat membutuhkan model aktif.

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
