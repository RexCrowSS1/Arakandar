# Bandar Pasar Backend

Backend FastAPI dengan liveness check, konfigurasi CORS, dan lazy Supabase client
dependency untuk handler API. `POST /chat` menjalankan model
[`Timothyemmanuel/Arakandar`](https://huggingface.co/Timothyemmanuel/Arakandar)
secara lokal melalui Transformers.

## Model Arakandar lokal

```bash
cd Backend
source .venv/bin/activate
python -m pip install -e '.[dev,inference]'
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Model dimuat sekali saat startup. Startup pertama mengunduh sekitar 6,2 GB bobot
ke `Backend/.cache/huggingface/` (diabaikan Git); tunggu `Application startup complete`
sebelum mengirim chat. Gunakan satu worker agar bobot tidak diduplikasi di RAM.
CUDA dipilih jika tersedia, lalu Apple Silicon MPS, lalu CPU. CPU jauh lebih lambat
dan memakai float32; GPU/MPS memakai float16.

Konfigurasi opsional di `.env`:

```dotenv
BANDAR_PASAR_AI_ENABLED=true
BANDAR_PASAR_AI_MODEL_ID=Timothyemmanuel/Arakandar
BANDAR_PASAR_AI_MODEL_REVISION=1b7b0adc10b5da17f94e0f14af08399d0e67744d
BANDAR_PASAR_AI_DEVICE=auto
BANDAR_PASAR_AI_MAX_NEW_TOKENS=256
BANDAR_PASAR_AI_CONTEXT_TOKENS=4096
```

Revision dipatok agar perubahan repo model tidak mengubah runtime tanpa sengaja.
Set `BANDAR_PASAR_AI_ENABLED=false` untuk menjalankan endpoint non-AI tanpa memuat
model. `GET /health` hanya memeriksa proses, bukan kesiapan model. Jika pemuatan
gagal, backend tetap tersedia dan `/chat` mengembalikan 503; periksa log lalu restart.
Setelah file tercache, `HF_HUB_OFFLINE=1` dapat digunakan untuk startup tanpa internet.

```bash
curl http://127.0.0.1:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Halo, kamu bisa membantu apa?"}],"context":{"workspace":"market","ticker":"IHSG","indicators":[]}}'
```

Respons berisi `reply` dan `model`. Riwayat dikirim oleh client, tidak disimpan
di server. Satu inferensi berjalan pada satu waktu (429 jika sibuk). Prompt dibatasi
4096 token termasuk jawaban; turn lama dibuang jika diperlukan. Pesan terakhir yang
terlalu panjang mendapat 422. UI mengembalikan draft ketika gagal, tanpa respons demo.

Repo ini berisi bobot base Qwen2 3B, bukan adapter LoRA terpisah. Tidak ada adapter
tambahan yang dimuat. Data pasar aplikasi masih snapshot demo; model tidak mendapat
harga live, berita live, atau sinyal LightGBM. Prompt menandai batas tersebut dan
meminta model tidak mengarang angka atau sinyal. Konteks saat ini hanya workspace,
ticker, dan indikator yang diaktifkan, bukan data harga historis.

Endpoint lokal belum memiliki autentikasi; jalankan pada loopback. Tambahkan kontrol
akses sebelum mengekspos layanan ke jaringan publik.

## Struktur

```text
Backend/
├── app/
│   ├── api/
│   │   ├── chat.py    # POST /chat
│   │   └── health.py  # GET /health
│   ├── ai.py          # Runtime Transformers lokal
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
