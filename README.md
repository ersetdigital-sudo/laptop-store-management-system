# Kasir POS Laptop

Sistem Kasir POS untuk toko laptop — kelola servis, unit laptop, sparepart, kwitansi pembelian supplier, dan laporan keuangan dalam satu dashboard.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

---

## 📸 Preview

| Dashboard | Stok Barang | Laporan |
|:---:|:---:|:---:|
| `docs/screenshots/dashboard.png` | `docs/screenshots/stok.png` | `docs/screenshots/laporan.png` |
| *(screenshot menyusul)* | *(screenshot menyusul)* | *(screenshot menyusul)* |

> Cara mengisi screenshot: lihat [docs/screenshots/README.md](docs/screenshots/README.md).

---

## ✨ Fitur Utama

- **Dashboard** — ringkasan omzet, profit, dan biaya per periode lengkap dengan grafik tren bulanan, profit per kategori, produk & customer teratas
- **Manajemen Servis** — input servis, track status (proses → menunggu → selesai), pemakaian sparepart otomatis mengurangi stok, nota PDF & notifikasi WhatsApp
- **Unit Laptop** — pembelian, penjualan multi-item (keranjang), garansi, DP, dan bonus
- **Stok Barang** — kelola sparepart & unit laptop, mutasi stok (kartu stok), peringatan stok menipis, penyesuaian stok, kategori
- **Kwitansi Pembelian ke Supplier** — beberapa item dalam satu kwitansi, nomor otomatis (`KW-2026-0001`), auto-update stok & pengeluaran, cetak PDF, dan pembatalan dengan rollback stok otomatis
- **Riwayat Penjualan** — daftar transaksi + invoice PDF (unit, sparepart, multi-item)
- **Laporan Keuangan** — laba bersih per periode (harian / bulanan / tahunan) dengan rincian laba rugi
- **Biaya Operasional** — pencatatan pengeluaran toko (sewa, listrik, gaji, dll.)
- **Manajemen Customer** — data pelanggan terhubung ke servis & penjualan
- **Role-based Access** — peran admin & karyawan
- **Pengaturan** — manajemen user, metode pembayaran, info toko & rekening bank

## 🛠️ Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [TypeScript](https://www.typescriptlang.org)
- [Supabase](https://supabase.com) — PostgreSQL, Authentication, Row Level Security
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix UI)
- [Recharts](https://recharts.org) — grafik dashboard
- [@react-pdf/renderer](https://react-pdf.org) — nota/invoice PDF

## 🚀 Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Buat file .env.local (isi dengan kredensial project Supabase kamu)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # opsional, untuk manajemen user

# 3. Setup database (schema + migration) — lihat docs/QUICKSTART.md

# 4. Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## 📁 Struktur Folder

```
├── src/
│   ├── app/(dashboard)/   # Halaman utama: servis, stok, unit-laptop, laporan, pengaturan
│   ├── components/        # Komponen UI & template PDF nota
│   └── lib/               # Supabase client, tipe data, logika finance
├── supabase/              # Schema & migration SQL
└── docs/                  # Dokumentasi & screenshot
```

## 📚 Dokumentasi

- [Quick Start](docs/QUICKSTART.md) — setup lengkap (termasuk database baru)
- [PRD Sistem Toko Laptop](docs/PRD-Sistem-Toko-Laptop.md) — spesifikasi kebutuhan
- Catatan proses development & migrasi: `docs/` (`FINAL-STATUS.md`, `MIGRATION-SUMMARY.md`, dll.)