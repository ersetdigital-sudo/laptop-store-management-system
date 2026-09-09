# PRD — Sistem Manajemen Toko Laptop (Servis, Jual-Beli Unit, Stok & Laporan)

**Versi:** 1.0
**Tanggal:** 18 Juli 2026
**Disusun oleh:** OOS SHOP
**Status:** Draft untuk review client

---

## 1. Latar Belakang

Client membutuhkan sistem internal berbasis web untuk mengelola operasional toko laptop yang mencakup 3 lini bisnis:
1. **Jasa servis** laptop/komputer
2. **Jual-beli unit laptop** (beli dari supplier/customer, jual ke customer)
3. **Inventory/stok barang** (sparepart & unit)

Saat ini pencatatan kemungkinan masih manual, sehingga rawan selisih data, sulit menghitung laba bersih riil, dan proses kirim nota servis ke customer belum otomatis.

## 2. Tujuan Produk

- Semua transaksi (servis, beli unit, jual unit) tercatat rapi dan real-time.
- Stok barang (unit laptop & sparepart) update otomatis setiap ada transaksi masuk/keluar.
- Nota/struk servis bisa langsung dikirim ke WhatsApp customer dalam format PDF.
- Owner bisa melihat laporan bulanan dengan **laba bersih** (omzet dikurangi biaya operasional), bukan cuma omzet kotor.
- Karyawan hanya punya akses terbatas sesuai tanggung jawabnya (servis), sehingga data pembelian/penjualan unit & keuangan tetap terjaga.

## 3. Target Pengguna

| Role | Jumlah User | Deskripsi |
|---|---|---|
| **Admin (Owner)** | 1 | Akses penuh ke semua modul |
| **Karyawan** | 1 | Akses terbatas ke modul servis saja |

Total: **2 user**, sistem single-tenant (1 toko).

---

## 4. Hak Akses per Role

### 4.1 Admin
- Kelola semua transaksi (servis, beli unit, jual unit)
- Kelola stok barang (tambah, edit, hapus, adjust manual)
- Kelola data operasional/biaya (listrik, sewa, gaji, dll)
- Lihat & export semua laporan (harian, bulanan, laba rugi)
- Kelola user (buat/nonaktifkan akun karyawan)
- Generate & kirim nota PDF (servis maupun unit)
- Lihat riwayat transaksi penuh, termasuk yang diinput karyawan

### 4.2 Karyawan
- Input transaksi **pemasukan servis** (data customer, jenis servis, biaya, sparepart terpakai)
- Generate **nota PDF servis**
- Kirim nota tersebut langsung ke WhatsApp customer
- **Tidak bisa** akses: data pembelian/penjualan unit, laporan keuangan, data operasional, laporan laba

---

## 5. Ruang Lingkup Fitur (Functional Requirements)

### 5.1 Modul Servis
- Form input servis: nama customer, no. WA customer, jenis perangkat, keluhan, sparepart yang dipakai (ambil dari stok), biaya jasa, biaya sparepart, total biaya, status (proses/selesai), tanggal masuk & keluar.
- Jika sparepart dipakai → stok otomatis berkurang.
- Setelah servis selesai & dibayar → generate nota PDF otomatis.
- Kirim nota PDF ke nomor WA customer (via tombol "Kirim ke WhatsApp").
- Riwayat servis per customer (opsional, untuk referensi histori laptop yang sama servis ulang).

### 5.2 Modul Jual-Beli Unit Laptop
- **Pembelian unit** (input oleh Admin): data unit (merk, tipe, spesifikasi, kondisi, no. IMEI/SN kalau ada), harga beli, sumber (customer/supplier), tanggal beli.
  → Otomatis menambah stok unit dengan status "Ready".
- **Penjualan unit** (input oleh Admin): pilih unit dari stok, harga jual, data pembeli, metode bayar, tanggal jual.
  → Otomatis mengurangi stok, status unit berubah jadi "Terjual".
  → Otomatis hitung margin per unit (harga jual − harga beli − biaya reparasi kalau unit sempat diperbaiki dulu).
- Generate nota/invoice PDF untuk penjualan unit.

### 5.3 Modul Stok Barang
- Kategori stok: **Unit Laptop** & **Sparepart** (RAM, SSD, charger, dll — kalau dipakai untuk servis).
- Stok bertambah otomatis saat ada input pembelian unit/sparepart baru.
- Stok berkurang otomatis saat ada penjualan unit atau pemakaian sparepart di servis.
- Notifikasi/indikator stok menipis (khusus sparepart, opsional threshold).
- Riwayat mutasi stok (kartu stok): tanggal, jenis (masuk/keluar), jumlah, sisa stok, keterangan (dari transaksi apa).

### 5.4 Modul Operasional
- Input biaya operasional: sewa tempat, listrik, internet, gaji karyawan, biaya lain-lain — per periode (bulanan).
- Biaya ini yang akan mengurangi laba kotor di laporan bulanan.
- Hanya bisa diakses/input oleh Admin.

### 5.5 Modul Laporan
- **Laporan Harian**: rekap pemasukan servis hari itu, transaksi unit (beli/jual) hari itu.
- **Laporan Bulanan**:
  - Total omzet servis
  - Total omzet penjualan unit
  - Total margin unit (jual − beli)
  - Total biaya operasional
  - **Laba bersih** = (Omzet servis + Margin unit) − Biaya operasional
- Bisa difilter per tanggal/periode.
- Export laporan ke PDF (dan idealnya Excel untuk fleksibilitas Admin).

### 5.6 Modul Nota/Invoice PDF
- Template nota servis: logo toko, nama customer, no. WA, jenis servis, rincian biaya (jasa + sparepart), total, tanggal, nomor nota otomatis (auto-increment).
- Template invoice unit: logo toko, data unit, harga, tanggal, nomor invoice otomatis.
- Nota dikirim via integrasi WhatsApp (API pihak ketiga — lihat bagian 7).

---

## 6. Alur Utama (User Flow Singkat)

**Karyawan — Servis:**
1. Login → Menu Servis → Input data servis baru
2. Pilih sparepart yang dipakai (stok otomatis kepotong)
3. Simpan → status "Selesai" saat customer bayar
4. Klik "Buat Nota" → PDF ter-generate otomatis
5. Klik "Kirim ke WhatsApp" → nota terkirim ke no. WA customer

**Admin — Beli/Jual Unit:**
1. Login → Menu Unit Laptop → Tambah Pembelian
2. Isi data unit → stok bertambah otomatis
3. Saat ada pembeli → Menu Penjualan → pilih unit dari stok → isi harga jual
4. Simpan → stok berkurang, margin otomatis terhitung, invoice bisa dicetak

**Admin — Cek Laporan:**
1. Login → Menu Laporan → pilih periode (harian/bulanan)
2. Sistem menampilkan omzet, margin unit, biaya operasional, dan laba bersih akhir

---

## 7. Kebutuhan Teknis & Integrasi

| Komponen | Rencana |
|---|---|
| Frontend & Backend | Next.js (konsisten dengan stack OOS SHOP) |
| Database | Supabase (PostgreSQL) |
| Autentikasi | Login berbasis role (Admin/Karyawan), session-based |
| Generate PDF | Library PDF (misal react-pdf / puppeteer) untuk nota & laporan |
| Kirim WhatsApp | Integrasi API WhatsApp (misal Fonnte — sudah pernah dipakai di project lain, atau WhatsApp Business API resmi) |
| Hosting & Domain | **Disediakan oleh client** (perlu diinfokan provider hosting & domain existing, atau baru mau beli) |

**Catatan:** Perlu dikonfirmasi ke client:
- Domain yang mau dipakai apa (sudah ada atau perlu beli baru?)
- Preferensi hosting (VPS/shared hosting, provider apa)
- Untuk kirim WA, apakah pakai nomor WA toko yang sudah ada, dan device HP-nya standby buat scan QR (kalau pakai gateway unofficial kayak Fonnte)

---

## 8. Non-Functional Requirements

- Sistem harus bisa diakses via browser (desktop & mobile-friendly, karena karyawan mungkin akses dari HP/tablet di meja servis).
- Data tersimpan aman, backup rutin (harian) via Supabase.
- Waktu generate nota PDF & kirim WA maksimal beberapa detik setelah tombol ditekan.
- Log aktivitas transaksi (siapa input, kapan) untuk audit trail sederhana.

## 9. Di Luar Cakupan (Out of Scope) — Fase 1

- Multi-cabang/multi-toko
- Aplikasi mobile native (Android/iOS) — cukup web responsive dulu
- Sistem POS kasir fisik dengan printer thermal (bisa jadi fase 2 kalau dibutuhkan)
- Integrasi akuntansi pihak ketiga (misal Jurnal.id, Accurate)
- Payment gateway online (kalau transaksi masih tunai/transfer manual)

## 10. Pertanyaan Tambahan untuk Client (Perlu Dikonfirmasi Sebelum Development)

1. Domain: sudah punya atau perlu dibantu daftarkan?
2. Hosting: sudah ada provider (VPS/cloud), atau perlu rekomendasi dari OOS SHOP?
3. Nomor WhatsApp toko yang dipakai kirim nota — nomor baru atau existing?
4. Apakah butuh multi kategori sparepart yang detail (RAM, SSD, LCD, dll) atau cukup 1 kategori umum "Sparepart"?
5. Format penomoran nota/invoice yang diinginkan (misal: SRV-0001, INV-0001)?
6. Logo & identitas toko (warna, nama usaha) untuk template nota — sudah ada asset-nya?

---

## 11. Timeline & Milestone (Estimasi — perlu disesuaikan setelah scope fix)

| Fase | Deliverable | Estimasi |
|---|---|---|
| 1 | Setup project, database schema, autentikasi 2 role | 3-5 hari |
| 2 | Modul Servis + Nota PDF + Kirim WA | 5-7 hari |
| 3 | Modul Beli-Jual Unit + Stok otomatis | 5-7 hari |
| 4 | Modul Operasional + Laporan Harian/Bulanan + Laba | 4-6 hari |
| 5 | Testing, revisi, deploy ke hosting client | 3-5 hari |

*Total estimasi: ± 20-30 hari kerja, tergantung kompleksitas final & kecepatan feedback client.*

---

*Dokumen ini adalah draft awal berdasarkan requirement yang disampaikan client secara lisan/chat. Perlu direview & disetujui client sebelum masuk tahap development.*
