# Bandar Pasar Backend

Fondasi FastAPI minimal. Saat ini backend hanya menyediakan liveness check dan
konfigurasi CORS. Database, autentikasi, dan layer bisnis belum ditambahkan karena
belum ada requirement yang membutuhkannya.

## Struktur

```text
Backend/
├── app/
│   ├── api/
│   │   └── health.py  # GET /health
│   ├── config.py      # Konfigurasi dari environment
│   ├── factory.py     # Pembuatan aplikasi FastAPI
│   └── main.py        # Entry point ASGI
├── tests/
│   └── test_health.py
├── .env.example
└── pyproject.toml
```

Folder database, model, repository, atau service dibuat nanti ketika sudah ada kode
nyata yang menggunakannya.

## Setup pertama kali

Gunakan Python 3.11 atau lebih baru.

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

## Menjalankan

```bash
cd Backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

API tersedia di `http://127.0.0.1:8000`, dokumentasi di `/docs`, dan liveness check
di `GET /health`.

## Quality checks

```bash
pytest
ruff check .
ruff format --check .
```
