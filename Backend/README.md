# Bandar Pasar Backend

Backend FastAPI dengan liveness check, konfigurasi CORS, dan lazy Supabase client
dependency untuk handler API.

## Struktur

```text
Backend/
├── app/
│   ├── api/
│   │   └── health.py  # GET /health
│   ├── config.py      # Konfigurasi dari environment
│   ├── factory.py     # Pembuatan aplikasi FastAPI
│   ├── main.py        # Entry point ASGI
│   └── supabase.py    # Dependency client Supabase
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

# Edit .env and set SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.
```

## Menjalankan

```bash
cd Backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

API tersedia di `http://127.0.0.1:8000`, dokumentasi di `/docs`, dan liveness check
di `GET /health`.

Handler yang mengakses Supabase dapat menggunakan dependency berikut:

```python
from fastapi import Depends
from supabase import Client

from app.supabase import require_supabase_client


async def handler(client: Client = Depends(require_supabase_client)):
    return client.table("your_table").select("*").execute()
```

`SUPABASE_SECRET_KEY` hanya boleh digunakan di backend. Jangan mengeksposnya ke
frontend atau menyimpannya di repository. Jika secret key tidak tersedia, client
menggunakan publishable key.

## Quality checks

```bash
pytest
ruff check .
ruff format --check .
```
