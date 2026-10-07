# Bandar Pasar

Monorepo aplikasi Bandar Pasar dengan frontend Next.js dan backend FastAPI.
Frontend Arakan Ndar menyediakan workspace Market/Technical serta panel analyst
berdasarkan desain Figma, menggunakan data pasar online dengan delay bursa dan model Arakandar lokal
untuk chat dengan sumber internet. Backend menyediakan endpoint liveness,
`POST /chat`, `POST /web/search`, serta `/market/overview`, `/market/chart`, dan `/market/news`.

Percakapan website tersimpan di Supabase menggunakan satu profil **Admin** bersama,
tanpa login. **New Conversation** membuat record baru; **Recent** membuka kembali
pesan yang tersimpan, termasuk setelah reload. Model menerima riwayat dari database.
Lihat [penyimpanan percakapan](./Backend/README.md#percakapan-supabase-tanpa-login).

## Struktur

| Folder | Teknologi | Fungsi |
| --- | --- | --- |
| [`Frontend`](./Frontend) | Next.js, React, Tailwind CSS | Workspace market, chart teknikal, dan panel analyst |
| [`Backend`](./Backend) | FastAPI, Python, Transformers | `GET /health` dan chat model lokal |

## Persyaratan

- Python 3.11 atau lebih baru
- Node.js 20.9 atau lebih baru (Node.js 22 direkomendasikan)

## Setup lokal

Backend:

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev,inference]'
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend, dari terminal lain:

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Layanan lokal:

- Frontend: `http://localhost:3000`
- Dokumentasi API: `http://127.0.0.1:8000/docs`
- Liveness API: `http://127.0.0.1:8000/health`

Jika `BANDAR_PASAR_AI_ENABLED=true`, startup pertama mengunduh model ±6,2 GB.
Gunakan `false` untuk menjalankan data pasar/Supabase tanpa memuat AI. Tunggu sampai startup selesai.
Lihat [konfigurasi Arakandar lokal](./Backend/README.md#model-arakandar-lokal)
untuk pengaturan perangkat, cache, dan batas data model.

Pencarian internet aktif secara default melalui Google News RSS tanpa API key.
Arakandar menerima judul/cuplikannya sebelum menjawab; panel chat menampilkan
tautan sumber, tanggal terbit, dan status pencarian. **Cari di internet** dapat
dimatikan per pesan. Grafik mengambil OHLCV Yahoo Finance; IDX tertunda 10 menit.
Broker summary dan foreign flow memerlukan feed IDX berlisensi. Lihat
[konfigurasi internet](./Backend/README.md#koneksi-internet-dan-sumber-jawaban).

File `.env` lokal tidak boleh di-commit. Nilai yang aman untuk development tersedia
di `.env.example` masing-masing aplikasi.

## Pemeriksaan kualitas

Backend:

```bash
cd Backend
python -m pytest
python -m ruff check .
python -m ruff format --check .
```

Frontend:

```bash
cd Frontend
npm run lint
npm test
npm run build
```

Workflow [`CI`](./.github/workflows/ci.yml) menjalankan seluruh pemeriksaan tersebut
untuk setiap push dan pull request.
