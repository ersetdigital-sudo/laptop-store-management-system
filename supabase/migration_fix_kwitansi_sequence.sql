-- ============================================
-- FIX: Sinkronkan sequence kwitansi_seq dengan data yang ada
-- ============================================
-- Masalah: sequence kwitansi_seq tidak sync dengan receipt_number yang sudah ada,
-- sehingga trigger generate_kwitansi_number menghasilkan nomor duplikat
-- (error: duplicate key value violates unique constraint supplier_receipts_receipt_number_key).
-- Penyebab: data dimasukkan manual/import tanpa lewat sequence, atau sequence di-reset.
--
-- Solusi:
--   1. Reset sequence ke MAX receipt_number yang ada.
--   2. Update trigger supaya auto-sync sequence sebelum generate nomor baru
--      (mencegah masalah terulang jika data ditambah manual di kemudian hari).
-- ============================================

-- 1. Reset sequence ke nilai maksimum yang ada
SELECT setval('kwitansi_seq',
  COALESCE((SELECT MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER))
           FROM supplier_receipts
           WHERE receipt_number LIKE 'KW-' || EXTRACT(YEAR FROM now())::TEXT || '-%'), 1),
  true
);

-- 2. Update trigger function: auto-sync sequence sebelum generate nomor
CREATE OR REPLACE FUNCTION public.generate_kwitansi_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year text;
  v_max int;
  v_seq int;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.purchase_date)::TEXT;

  -- Cari nomor kwitansi tertinggi untuk tahun ini
  SELECT COALESCE(MAX(CAST(SPLIT_PART(receipt_number, '-', 3) AS INTEGER)), 0)
    INTO v_max
    FROM supplier_receipts
   WHERE receipt_number LIKE 'KW-' || v_year || '-%';

  -- Jika data lebih tinggi dari sequence, sync sequence
  SELECT last_value INTO v_seq FROM kwitansi_seq;
  IF v_max > v_seq THEN
    PERFORM setval('kwitansi_seq', v_max, true);
  END IF;

  NEW.receipt_number := 'KW-' || v_year || '-' || LPAD(nextval('kwitansi_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
