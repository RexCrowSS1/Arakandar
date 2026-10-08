# Bandar Pasar

Monorepo aplikasi Bandar Pasar dengan frontend Next.js dan backend FastAPI.
Frontend Arakan Ndar menyediakan workspace Market/Technical serta panel analyst
berdasarkan desain Figma, menggunakan data pasar online dengan delay bursa dan model Arakandar lokal
untuk chat dengan sumber internet. Backend menyediakan endpoint liveness,
`POST /chat`, `POST /web/search`, serta `/market/overview`, `/market/sectors`,
`/market/chart`, dan `/market/news`.

Alur website: **landing (`/`) → sign up (`/sign-up`) atau sign in (`/sign-in`) →
analisis AI (`/analysis`)**. Supabase Auth menyimpan akun dan password; profil serta
percakapan tersimpan di database Supabase, terpisah untuk setiap pengguna.
Halaman analisis dan API chat/percakapan memerlukan sesi login. Tombol **SIGN OUT**
ada di menu profil. Lihat [akun dan sesi](./Backend/README.md#akun-dan-sesi).

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

Model AI yang digunakan adalah
[Timothyemmanuel/Arakandar](https://huggingface.co/Timothyemmanuel/Arakandar).

Pencarian internet aktif secara default melalui Google News RSS tanpa API key.
Arakandar menerima judul/cuplikannya sebelum menjawab; panel chat menampilkan
tautan sumber, tanggal terbit, dan status pencarian. **Cari di internet** dapat
dimatikan per pesan. Grafik mengambil OHLCV Yahoo Finance; IDX tertunda 10 menit.
Broker summary dan foreign flow memerlukan feed IDX berlisensi. Lihat
[konfigurasi internet](./Backend/README.md#koneksi-internet-dan-sumber-jawaban).

### Sectors API

Gunakan `GET http://127.0.0.1:8000/market/sectors` untuk mengambil quote sektor
IDX yang tersedia dari Yahoo Finance. Respons berisi `status`, `fetched_at`,
`refresh_seconds`, `provider`, dan array `sectors` dengan `ticker`, `label`,
`price`, `change`, serta `change_percent`. Feed ini bersifat publik dan
tertunda; respons dapat berstatus `partial`, `stale`, atau `unavailable`.
Frontend meneruskannya melalui `GET /api/market/sectors`.
Saat chat dikirim, backend mengambil snapshot endpoint ini sendiri dan
menyertakannya sebagai `market_data.sectors` untuk Arakandar, bersama dengan
`market_data.sector_status`. Jadi model dapat membandingkan ticker yang dipilih
dengan kinerja sektor, tetapi tetap harus menyebutkan jika feed tertunda,
parsial, atau tidak tersedia.

Pengguna juga dapat memasukkan URL sectors API sendiri pada kolom **Custom
sectors API URL** di bagian atas workspace Market. URL tersebut disimpan hanya
di browser pengguna, digunakan untuk memperbarui data sektor, dan dikirim
sebagai konteks ke Arakandar. API kustom harus mengembalikan JSON dalam salah
satu bentuk berikut:

```json
{"sectors": [{"ticker": "IDXFINANCE", "label": "Financials", "change_percent": 1.5}]}
```

atau langsung berupa array sektor. Field `ticker` wajib ada; `label`, `price`,
`change`, dan `change_percent` opsional. Tombol **DEFAULT** mengembalikan feed
Yahoo Finance bawaan. Backend menolak URL non-HTTP(S) dan alamat private/local.

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
