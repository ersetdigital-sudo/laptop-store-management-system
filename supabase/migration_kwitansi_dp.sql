-- ============================================
-- FITUR: DP (Uang Muka) pada kwitansi pembelian
-- ============================================
-- Jalankan di Supabase SQL Editor (atau lewat Management API).
--
-- Konsep: DP = uang muka yang KITA bayar ke supplier. Kwitansi mencatat
-- berapa yang sudah dibayar (dp_amount) dan sisanya dihitung di frontend
-- (sisa = total - dp_amount). Nilai `total` dan alur pengeluaran/laba
-- tidak berubah — DP hanya informasi pembayaran.

ALTER TABLE public.supplier_receipts
  ADD COLUMN IF NOT EXISTS dp_amount BIGINT NOT NULL DEFAULT 0;

UPDATE public.supplier_receipts SET dp_amount = 0 WHERE dp_amount IS NULL;

COMMENT ON COLUMN public.supplier_receipts.dp_amount IS 'DP/Uang muka yang dibayar ke supplier (sisa = total - dp_amount)';
