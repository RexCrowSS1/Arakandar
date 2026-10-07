# Bandar Pasar Backend

Backend FastAPI dengan liveness check, konfigurasi CORS, dan lazy Supabase client
dependency untuk handler API. Percakapan website disimpan di Supabase dengan
satu user Admin bersama, tanpa login. `POST /chat` menjalankan model
[`Timothyemmanuel/Arakandar`](https://huggingface.co/Timothyemmanuel/Arakandar)
secara lokal melalui Transformers.

## Model Arakandar lokal

```bash
cd Backend
source .venv/bin/activate
python -m pip install -e '.[dev,inference]'
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Model dimuat sekali saat startup dan memakai snapshot revision dari cache lebih
dahulu. Bila cache belum lengkap, backend mencoba mengunduh dari Hugging Face;
akses repo yang dibatasi memerlukan `HF_TOKEN` dengan izin yang sesuai.
Startup pertama mengunduh sekitar 6,2 GB bobot
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

Endpoint inferensi langsung `/chat` berisi `reply`, `model`, `market`, dan `web` (status,
query, waktu pencarian, sumber). Website menggunakan endpoint percakapan persisten
di bawah; riwayat model dibaca kembali dari Supabase. Satu inferensi berjalan pada
satu waktu (429 jika sibuk). Prompt dibatasi
4096 token termasuk jawaban; turn lama dibuang jika diperlukan. Pesan terakhir yang
terlalu panjang mendapat 422. UI mengembalikan draft ketika gagal, tanpa respons demo.

Repo ini berisi bobot base Qwen2 3B, bukan adapter LoRA terpisah. Tidak ada adapter
tambahan yang dimuat. Model menerima hasil pencarian internet sebelum menjawab.
Data grafik memakai feed publik Yahoo Finance yang tertunda sesuai bursa. Konteks
AI berisi ticker, timeframe, OHLCV terbaru, dan nilai indikator dari backend; bukti
harga beserta waktu/sumber disimpan bersama jawaban di Supabase. Tidak ada sinyal
LightGBM yang terhubung.

## Koneksi internet dan sumber jawaban

Pencarian aktif secara default, tanpa API key. Backend mengambil judul/cuplikannya
melalui Google News RSS, mengurutkan berita berdasarkan tanggal terbit, lalu
memberikannya kepada Arakandar sebagai bukti. Ini tidak mengubah bobot model dan
tidak mengunduh isi penuh artikel. Model diminta menyebut sumber dengan `[1]`,
`[2]`, dst.; frontend menampilkan tautan sumber asli dari backend. Tautan Google
News membuka artikel melalui agregator tersebut. Kualitas jawaban dan kepatuhan
sitasi tetap bergantung pada model lokal.

```dotenv
BANDAR_PASAR_WEB_ENABLED=true
BANDAR_PASAR_WEB_BACKEND=google_news
BANDAR_PASAR_WEB_TIMEOUT_SECONDS=8
BANDAR_PASAR_WEB_MAX_RESULTS=3
```

`google_news` sesuai untuk berita pasar. Untuk pencarian web umum, gunakan `bing`
(RSS), atau `duckduckgo`, `brave`, `google` melalui
[DDGS](https://github.com/deedy5/ddgs). Penyedia publik dapat membatasi permintaan,
menolak koneksi, atau mengembalikan hasil kurang relevan. Verifikasi TLS tetap aktif.
Batas waktu berlaku per permintaan jaringan; respons RSS dibatasi 1 MB dan hasil
yang diberikan ke model dibatasi maksimal lima sumber.

Hanya pertanyaan terakhir (maksimal 400 karakter) dan ticker yang dikirim ke mesin
pencari. Riwayat chat tidak dikirim ke sana. Nonaktifkan per pesan dengan
`"use_web": false` atau tombol **Cari di internet** di frontend. Untuk mematikan
seluruh pencarian, atur `BANDAR_PASAR_WEB_ENABLED=false`.

Uji internet tanpa memuat bobot model dengan menjalankan backend menggunakan
`BANDAR_PASAR_AI_ENABLED=false`, kemudian:

```bash
curl http://127.0.0.1:8000/web/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"BBCA berita terbaru"}'
```

`web.status` bernilai `ok`, `empty`, `unavailable`, atau `disabled`.
Jika pencarian gagal, model tetap dapat menjawab dengan batas data yang dijelaskan
di prompt dan UI menampilkan kegagalan tersebut. `searched_at` adalah waktu
pengambilan; `published_at` adalah tanggal terbit bila tersedia. Sumber dapat
dikurangi agar pertanyaan terbaru dan jawaban tetap muat dalam batas token.
Cuplikan diperlakukan sebagai data tidak tepercaya, bukan instruksi model.
Pencarian internet ini bukan feed harga real-time dan tidak memperbarui grafik.

## Percakapan Supabase tanpa login

Gunakan `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` di `Backend/.env`.
Kunci server hanya dibaca backend; kunci publishable tidak cukup untuk penulisan
admin. Proyek yang terhubung sudah memiliki tabel berikut, sehingga integrasi
tidak memerlukan perubahan atau penghapusan schema yang ada:

| Tabel | Data |
| --- | --- |
| `users` | Satu profil `Admin`, email identitas `admin@bandarpasar.local` |
| `conversations` | Pemilik, judul, waktu dibuat dan diperbarui |
| `messages` | Teks setiap pesan user dan jawaban AI |
| `agent_logs` | Konteks workspace/ticker/indikator, pilihan internet, model, sumber web, status/error |

Admin adalah profil aplikasi dalam `public.users`, bukan akun login Supabase Auth
atau administrator dashboard. Semua pengunjung memakai profil dan riwayat yang
sama sesuai mode tanpa login ini. Server menetapkan pemilik; browser tidak dapat
memilih `user_id` lain. Profil dibuat secara idempoten dengan ID
`7da1eb14-f6de-5a34-b61d-a4b8156acc84`; profil dengan email admin yang sama dipakai
kembali jika sudah ada.

| Endpoint | Perilaku |
| --- | --- |
| `GET /conversations?offset=0` | Admin dan riwayat, halaman 100 item |
| `POST /conversations` | Buat percakapan dengan `{ "id": "UUID" }` |
| `GET /conversations/{id}` | Muat seluruh pesan, sumber, konteks, dan status |
| `POST /conversations/{id}/messages` | Simpan pertanyaan, jalankan model dengan riwayat DB, simpan jawaban |

Contoh payload pengiriman:

```json
{
  "request_id": "0cd72fe3-1fdd-48d8-a20d-72872144bd77",
  "content": "Apa berita terbaru BBCA?",
  "context": { "workspace": "technical", "ticker": "BBCA", "indicators": ["RSI"] },
  "use_web": true
}
```

ID yang sama dipakai ketika mencoba ulang permintaan yang sama. ID berbeda untuk
pesan baru. Pesan user disimpan sebelum inferensi, termasuk ketika model tidak
siap. Hasil model dicatat sebelum penulisan pesan assistant sehingga penulisan
parsial dapat dipulihkan tanpa membuat jawaban berbeda. Data API Supabase memakai
beberapa operasi; ini bukan transaksi lintas tabel. Kegagalan ditampilkan dan
dapat dicoba ulang. Jangan mengganti isi pesan sambil memakai `request_id` lama.

Jalankan **satu worker backend**: inferensi dan pengiriman percakapan diserialkan
dalam proses. Setelah reload, client memuat pesan dari database dan memantau
jawaban yang masih diproses. Memilih New Conversation tidak membatalkan penyimpanan
jawaban percakapan sebelumnya. Draft yang belum dikirim tetap lokal.

Untuk Supabase baru yang belum memiliki tabel, jalankan
[`supabase/schema.sql`](./supabase/schema.sql) melalui SQL Editor. File ini juga
menyiapkan indeks dan membatasi akses tabel ke backend menggunakan RLS/grants.
Tidak perlu menjalankannya ulang pada proyek yang saat ini terhubung.

Endpoint aplikasi menggunakan mode admin bersama tanpa autentikasi, sehingga
pengunjung website dapat mengakses riwayat bersama. Gunakan loopback untuk
development atau batasi akses deployment sesuai kebutuhan penggunaan bersama.

## Struktur

```text
Backend/
├── app/
│   ├── api/
│   │   ├── chat.py    # POST /chat
│   │   ├── health.py  # GET /health
│   │   └── web.py     # POST /web/search
│   ├── ai.py          # Runtime Transformers lokal
│   ├── web.py         # Pengambilan bukti web
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


## Data pasar dan grafik online

Endpoint baca berikut bekerja saat `BANDAR_PASAR_AI_ENABLED=false`:

- `GET /market/overview`: 8 indeks/kurs, watchlist 9 saham IDX, dan 5 indeks sektor.
- `GET /market/chart?ticker=BBCA&timeframe=15M&mode=technical`: OHLCV dan quote harian.
- `GET /market/news?ticker=IHSG`: hingga 5 berita Google News RSS beserta sumber/tanggal.

Frontend meneruskannya melalui `/api/market/*`. Harga/grafik diperiksa setiap 60 detik,
berita setiap 5 menit. Cache backend memakai kunci ticker/rentang/interval dan lock
per sumber; penyedia dipanggil paralel dengan maksimal 6 thread untuk overview.
Kegagalan mempertahankan cache maksimal 10 menit dengan status `stale`, kemudian
mengembalikan `unavailable`. Data kosong tidak diganti angka demo atau nol.

```dotenv
BANDAR_PASAR_MARKET_REFRESH_SECONDS=60
BANDAR_PASAR_MARKET_TIMEOUT_SECONDS=8
```

Mode `market` mendukung `1D,5D,1M,3M,6M,1Y,ALL`; mode `technical` mendukung
`1M,5M,15M,30M,1H,4H,1D,1W,1MTH`. Di mode technical, `1M` berarti menit;
`1MTH` berarti bulan. Candle 4 jam digabung dari bar 60 menit, dimulai dari bar
pertama setiap sesi/tanggal bursa. Grafik teknikal menampilkan 120 candle terakhir;
indikator memakai hingga 1.500 bar untuk warmup. MA/EMA20, RSI14 Wilder, MACD12/26/9,
Bollinger20 ±2 standar deviasi, stochastic %K14, volume, dan VWAP sesi dihitung dari
OHLCV. VWAP tersedia untuk intraday dengan volume lengkap, bukan candle harian.
Quote perubahan harian memakai penutupan sesi sebelumnya dari permintaan intraday,
bukan harga awal rentang grafik. `as_of` dan `fetched_at` dipisahkan.

**Batas feed:** endpoint chart publik Yahoo tidak memberi jaminan layanan atau SLA.
[Yahoo mencantumkan delay IDX 10 menit](https://help.yahoo.com/kb/finance/article-exchanges-data-delays-sln2310.html);
bursa lain memiliki keterlambatan masing-masing. Di luar jam perdagangan, harga
terakhir tetap ditampilkan bersama waktunya. Sumber ini bukan streaming real-time.
Broker summary, foreign/domestic flow, nilai/frekuensi perdagangan, new high/low,
dan breadth seluruh IDX memerlukan [feed berlisensi](https://data.idx.co.id/).
Website menampilkan “—”/status belum tersedia untuk data tersebut. Movers dan
breadth yang dihitung hanya mencakup watchlist 9 saham, bukan seluruh bursa.

`market` pada jawaban AI memuat quote, 5 bar terbaru, indikator, dan keterbatasan.
Backend mengambilnya sendiri; client tidak dapat menyisipkan harga palsu melalui
`ChatContext`. Pilihan `use_web` mengatur pencarian artikel; data pasar tetap mengikuti
konteks grafik. Model AI yang nonaktif tidak dimuat oleh permintaan data pasar.
