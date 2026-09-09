# 🚀 Quick Start Guide

## Setup in 3 Minutes

### 1. Install Dependencies (2 min)
```bash
cd "c:\Users\chemz\Downloads\Pembukuan OOS\poskarisv2"
npm install
```

### 2. Setup Environment (30 sec)
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2b. Fresh Database Setup (2 min) — HANYA jika database masih kosong

Jika project Supabase kamu **baru/kosong** (belum ada tabel sama sekali), jangan jalankan
migration satu per satu — beberapa file akan error karena saling bergantung. Cukup:

1. Buka **Supabase Dashboard → SQL Editor → New query**
2. Buka file **`supabase/setup-fresh-database.sql`** (sudah berisi: base schema + semua migration
   dalam urutan benar + perbaikan `get_my_role()` + fitur kwitansi pembelian)
3. Copy seluruh isi → paste → **Run**
4. Buat user admin pertama via **Authentication → Users → Add user**
   (setelah login, isi nama & role `admin` di tabel `profiles` via Table Editor)

> Optional: jalankan `supabase/demo_data.sql` untuk data contoh.
>
> Jika database **sudah terpakai** (sudah ada tabel & data), cukup jalankan
> `supabase/migration_kwitansi_pembelian.sql` saja untuk fitur kwitansi baru.

### 3. Run Dev Server (30 sec)
```bash
npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🎨 Visual Check (30 sec)

When you open the app, check these:

✅ **Buttons are pill-shaped** (fully rounded ends)
✅ **Cards have shadows** (not borders)
✅ **Everything is black & white** (no purple/blue)
✅ **Font looks clean** (DM Sans)
✅ **Buttons are tall** (44px - easy to click)

If all ✅, **design migration is working perfectly!**

---

## 📁 Project Structure (Quick Reference)

```
poskarisv2/
├── src/app/(dashboard)/
│   ├── page.tsx              ← Homepage/Dashboard
│   ├── servis/               ← Servis laptop
│   ├── unit-laptop/          ← Jual-beli unit
│   ├── stok/                 ← Inventory
│   ├── operasional/          ← Biaya operasional
│   ├── laporan/              ← Reports
│   └── pengaturan/           ← Settings
│
├── src/components/ui/        ← Uber-styled components
│   ├── button.tsx            ← Pill buttons
│   ├── card.tsx              ← Shadow cards
│   ├── input.tsx             ← Black border inputs
│   └── ...
│
└── DESIGN.md                 ← Design system rules
```

---

## 🎯 Key Features

1. **Servis Module** - Input servis, generate & send nota PDF ke WA
2. **Jual-Beli Unit** - Track pembelian & penjualan laptop
3. **Stok Management** - Auto update inventory
4. **Laporan** - Harian & bulanan dengan **laba bersih**
5. **Role-Based** - Admin full access, Karyawan servis only

---

## 🛠️ Common Commands

```bash
# Development
npm run dev

# Build production
npm run build

# Start production
npm start

# Lint
npm run lint
```

---

## 📖 Documentation

- **FINAL-STATUS.md** - Complete status & checklist
- **DESIGN.md** - Design system rules
- **BEFORE-AFTER.md** - Visual comparison
- **MIGRATION-SUMMARY.md** - What changed

---

## 🐛 Troubleshooting

### npm install lama banget?
```bash
# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Port 3000 already in use?
```bash
npm run dev -- -p 3001
```

### DM Sans font not loading?
Check `src/app/layout.tsx` - should import DM_Sans from next/font/google

### Colors still purple?
Run `npm run dev` again, hard refresh browser (Ctrl+Shift+R)

---

## ✅ You're Ready!

Project udah siap bro! Just run `npm install` then `npm run dev` 🔥

**Questions?** Check FINAL-STATUS.md or DESIGN.md
