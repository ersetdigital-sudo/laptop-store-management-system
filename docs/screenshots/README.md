# 📸 Screenshot untuk README Portofolio

Folder ini menampung screenshot halaman utama aplikasi yang akan ditampilkan di `README.md` (bagian **Preview**).

## Cara mengisi (manual)

1. Jalankan aplikasi: `npm run dev` → buka `http://localhost:3000`
2. Login dengan akun admin (buat data demo dulu di halaman Stok/Unit supaya tampilannya hidup)
3. Screenshot halaman-halaman berikut, simpan dengan **nama file persis** seperti di bawah:

| File | Halaman | Tips |
|---|---|---|
| `dashboard.png` | Dashboard | Tampilkan KPI (omzet/profit) + grafik tren bulanan |
| `stok.png` | Stok Barang | Tab Sparepart/Unit + kartu aset inventori |
| `laporan.png` | Laporan | Rincian laba rugi per periode |

> Gunakan ukuran layar desktop (±1440px) dan pastikan tidak ada data customer asli
> (nama, no. HP, alamat) yang terlihat di screenshot sebelum di-publish publik.
> Boleh pakai data demo saja.

## Setelah file tersedia

README bagian **Preview** otomatis menampilkan gambar dari referensi berikut:

```md
![Dashboard](docs/screenshots/dashboard.png)
![Stok Barang](docs/screenshots/stok.png)
![Laporan](docs/screenshots/laporan.png)
```