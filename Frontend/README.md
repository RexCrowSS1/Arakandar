# Bandar Pasar Frontend

Frontend Next.js menggunakan App Router dan JavaScript dengan ekstensi `.jsx`.
Tailwind, state manager, dan folder abstraksi belum ditambahkan karena belum ada
kebutuhan yang memakainya.

## Setup

Gunakan Node.js 20.9 atau lebih baru.

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Halaman utama memeriksa endpoint `/health` milik
backend melalui Server Component, sehingga alamat backend tidak diekspos ke browser.

## Pemeriksaan

```bash
npm run lint
npm run build
```
