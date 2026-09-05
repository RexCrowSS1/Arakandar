# Bandar Pasar Frontend

Frontend Next.js untuk antarmuka market intelligence Arakan Ndar. Proyek memakai
App Router, JavaScript JSX, dan utility Tailwind CSS sepenuhnya.

## Struktur

```text
app/                          Route, metadata, dan entry Tailwind
features/market-terminal/     Orkestrasi fitur dan fixture market
  components/                 Top bar, sidebar, chart, panel, dan composer
  market-data.js              Satu sumber data statis untuk seluruh UI
  ui-classes.js               Recipe Tailwind yang benar-benar dipakai bersama
```

`MarketTerminal.jsx` menjadi satu-satunya client boundary dan pemilik state yang
dipakai lintas komponen. Komponen kecil yang hanya dipakai satu bagian tetap
berada di file pemiliknya agar struktur tidak terfragmentasi. Seluruh styling
ditulis sebagai utility Tailwind; tidak ada stylesheet fitur atau komponen UI
generik yang tidak diperlukan.

## Setup

Gunakan Node.js 20.9 atau lebih baru.

```bash
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Data ticker dan chart saat ini berupa fixture lokal
agar UI dapat dikembangkan tanpa ketergantungan ke backend.

## Pemeriksaan

```bash
npm run lint
npm run build
```
