# Bandar Pasar

Monorepo aplikasi Bandar Pasar dengan frontend Next.js dan backend FastAPI. Proyek
ini masih berupa fondasi: halaman frontend, konfigurasi runtime, dan endpoint
liveness sudah berjalan; fitur bisnis belum ditambahkan.

## Struktur

| Folder | Teknologi | Fungsi |
| --- | --- | --- |
| [`Frontend`](./Frontend) | Next.js, React, JSX | Antarmuka web dan pemeriksaan status backend |
| [`Backend`](./Backend) | FastAPI, Python | API dan endpoint `GET /health` |

## Persyaratan

- Python 3.11 atau lebih baru
- Node.js 20.9 atau lebih baru (Node.js 22 direkomendasikan)

## Setup lokal

Backend:

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --reload
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
npm run build
```

Workflow [`CI`](./.github/workflows/ci.yml) menjalankan seluruh pemeriksaan tersebut
untuk setiap push dan pull request.
