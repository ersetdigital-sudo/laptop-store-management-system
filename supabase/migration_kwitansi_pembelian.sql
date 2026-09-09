-- ============================================
-- FITUR: KWITANSI PEMBELIAN KE SUPPLIER (multi-item)
-- ============================================
-- Jalankan di Supabase SQL Editor sebelum deploy frontend.
--
-- Konsep: kwitansi = pembungkus (wrapper) dari alur pembelian yang sudah ada.
--   - Item sparepart  -> masuk ke tabel `sparepart_purchases` (channel pengeluaran
--                        yang sudah dibaca finance.ts => ikut formula laba yang sama).
--   - Item unit       -> masuk ke tabel `purchases` (sama seperti fitur Beli Unit).
--   - Setiap item juga menambah `stock_movements` (reference_type 'pembelian_kwitansi')
--     sehingga stok produk otomatis bertambah via trigger DB yang sudah ada.
--   - Harga beli/jual per item di-snapshot di `supplier_receipt_items`.

-- 1. Tabel header kwitansi pembelian
CREATE TABLE IF NOT EXISTS public.supplier_receipts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL, -- auto-generate: KW-2026-0001 (trigger)
  supplier_name TEXT NOT NULL,         -- input bebas teks, belum pakai master data
  supplier_phone TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total BIGINT NOT NULL DEFAULT 0,     -- total nilai pembelian (snapshot)
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'selesai' CHECK (status IN ('selesai', 'dibatalkan')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel item kwitansi (snapshot harga beli per item)
CREATE TABLE IF NOT EXISTS public.supplier_receipt_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.supplier_receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('sparepart', 'unit')),
  item_name TEXT NOT NULL,             -- snapshot nama barang
  brand TEXT,                          -- snapshot (unit)
  model TEXT,                          -- snapshot (unit)
  specs TEXT,                          -- snapshot
  condition TEXT CHECK (condition IN ('baru', 'bekas', 'refurbished')),
  imei_serial TEXT,                    -- snapshot (unit)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  buy_price BIGINT NOT NULL DEFAULT 0, -- snapshot harga beli saat pembelian
  sell_price BIGINT NOT NULL DEFAULT 0, -- snapshot harga jual (opsional)
  subtotal BIGINT GENERATED ALWAYS AS (quantity * buy_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_receipt_items_receipt ON public.supplier_receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS idx_supplier_receipts_date ON public.supplier_receipts (purchase_date);

-- 3. Auto-generate nomor kwitansi: KW-{tahun}-{urutan 4 digit}
CREATE SEQUENCE IF NOT EXISTS kwitansi_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_kwitansi_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_number := 'KW-' || EXTRACT(YEAR FROM NEW.purchase_date)::TEXT || '-' || LPAD(nextval('kwitansi_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_kwitansi ON public.supplier_receipts;
CREATE TRIGGER trigger_generate_kwitansi
  BEFORE INSERT ON public.supplier_receipts
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL)
  EXECUTE FUNCTION public.generate_kwitansi_number();

-- 4. RLS — mengikuti pola tabel pengeluaran lain (admin only, seperti sparepart_purchases)
ALTER TABLE public.supplier_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view supplier receipts" ON public.supplier_receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can create supplier receipts" ON public.supplier_receipts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update supplier receipts" ON public.supplier_receipts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can view supplier receipt items" ON public.supplier_receipt_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can create supplier receipt items" ON public.supplier_receipt_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Referensi balik: tandai baris pembelian (sparepart_purchases & purchases)
--    yang berasal dari kwitansi ini — dipakai untuk rollback "Batalkan Kwitansi".
ALTER TABLE public.sparepart_purchases
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.supplier_receipts(id);

ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES public.supplier_receipts(id);

-- 6. Tambah nilai reference_type untuk mutasi stok masuk pembelian via kwitansi
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_reference_type_check;

ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reference_type_check
  CHECK (reference_type IN ('pembelian_unit', 'penjualan_unit', 'servis', 'adjustment', 'pembelian_sparepart', 'pembelian_kwitansi'));