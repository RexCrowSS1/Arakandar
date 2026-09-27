# Bandar Pasar

Monorepo aplikasi Bandar Pasar dengan frontend Next.js dan backend FastAPI.
Frontend Arakan Ndar menyediakan workspace Market/Technical serta panel analyst
berdasarkan desain Figma, menggunakan data pasar snapshot dan model Arakandar lokal
untuk chat. Backend menyediakan endpoint liveness dan `POST /chat`.

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

Startup backend pertama mengunduh model ±6,2 GB. Tunggu sampai startup selesai.
Lihat [konfigurasi Arakandar lokal](./Backend/README.md#model-arakandar-lokal)
untuk pengaturan perangkat, cache, dan batas data model.

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
