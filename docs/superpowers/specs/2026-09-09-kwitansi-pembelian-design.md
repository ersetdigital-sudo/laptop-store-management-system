# Kwitansi Pembelian ke Supplier (Multi-Item)

## Ringkasan
Kwitansi pembelian = **pembungkus (wrapper)** dari alur pembelian yang sudah ada
(Beli Sparepart & Beli Unit Laptop), ditambah lapisan bukti transaksi dan dukungan
multi-item per transaksi. Setiap item otomatis menambah stok & tercatat sebagai
pengeluaran via **channel yang sama** dengan fitur lama — TANPA formula laba baru.

## Alur Data saat Kwitansi Disimpan
1. Insert header ke `supplier_receipts` → nomor auto-generate `KW-{tahun}-{0001}` (trigger).
2. Per item:
   - **Sparepart** → find-or-create produk (kategori Sparepart), insert
     `sparepart_purchases` (`receipt_id` ditandai) + `stock_movements`
     (`reference_type = 'pembelian_kwitansi'`) → otomatis masuk `pembelianSparepart`
     di `finance-core.ts` (mengurangi laba bersih).
   - **Unit** → buat produk baru (kategori Unit Laptop), insert `purchases`
     (`receipt_id` ditandai) + `stock_movements` → perilaku sama seperti Beli Unit
     (harga beli ikut margin saat terjual, bukan pengeluaran langsung).
3. Snapshot item (nama, brand, model, specs, kondisi, IMEI/SN, qty, harga beli/jual)
   disimpan di `supplier_receipt_items` — pola snapshot sparepart-ke-servis.
4. Gagal di tengah → rollback parsial (stok dikembalikan, baris purchase/movement/
   header dihapus) supaya tidak ada kwitansi yatim.

## Rollback "Batalkan Kwitansi" (bebas kapan saja)
1. Kurangi `products.quantity` per item (trigger DB hanya jalan saat INSERT, jadi manual).
2. Hapus `stock_movements` (`reference_type='pembelian_kwitansi'`).
3. Hapus `sparepart_purchases` & `purchases` dengan `receipt_id` → pengeluaran
   otomatis hilang dari formula laba.
4. Set `supplier_receipts.status = 'dibatalkan'` — kwitansi tetap tersimpan di
   riwayat, tidak bisa menambah stok lagi.

## Konsistensi Periode
`purchase_date` bertipe DATE dan dibandingkan sebagai `'YYYY-MM-DD'` — persis pola
`sparepart_purchases.purchase_date` di `finance.ts` (menghindari bug off-by-one
bulan/zona waktu). Item sparepart dari kwitansi otomatis muncul di Riwayat Pembelian.

## Tabel Baru
- `supplier_receipts` — header: receipt_number (unique), supplier_name, supplier_phone,
  purchase_date, total, payment_method, notes, status (`selesai`/`dibatalkan`), created_by.
- `supplier_receipt_items` — item: receipt_id (FK CASCADE), product_id (FK SET NULL),
  item_type (`sparepart`/`unit`), snapshot fields, quantity, buy_price, sell_price,
  `subtotal GENERATED ALWAYS AS (quantity * buy_price) STORED`.
- Kolom `receipt_id` ditambahkan (nullable) ke `sparepart_purchases` & `purchases`
  untuk rollback yang andal.
- `stock_movements.reference_type` + nilai `'pembelian_kwitansi'`.

## Halaman
- `/stok/buat-kwitansi` — form multi-item (tipe Sparepart/Unit, kondisi, IMEI/SN,
  qty, harga beli/jual), layar sukses + download PDF.
- `/stok/riwayat-kwitansi` — list + detail + download PDF + batalkan (rollback).
- Tombol "Buat Kwitansi Pembelian" di header `/stok`, link riwayat di `/stok`
  dan `/stok/riwayat-pembelian`.

## PDF
`NotaMultiPDF` mendapat prop `mode: 'penjualan' | 'pembelian'` (default penjualan —
output lama tidak berubah). Mode pembelian: header "Supplier", kolom "HARGA BELI",
tanpa BONUS, TTD "Diterima oleh"/"Diserahkan oleh", total = nilai pembelian.

## Non-Goals (iterasi 1)
- Tanpa master data supplier (cukup field teks).
- Tanpa approval multi-level.
- Tanpa kirim otomatis ke WhatsApp/email supplier.