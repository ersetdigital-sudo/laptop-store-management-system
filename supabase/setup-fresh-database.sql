-- ============================================
-- Sistem Manajemen Toko Laptop
-- Database Schema untuk Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS & AUTHENTICATION
-- ============================================

-- Tabel profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'karyawan')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies untuk profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can update profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 2. KATEGORI STOK
-- ============================================

CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- 'Unit Laptop', 'Sparepart'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS untuk categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies untuk categories
CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed categories
INSERT INTO public.categories (name, description) VALUES
  ('Unit Laptop', 'Laptop bekas/baru untuk dijual kembali'),
  ('Sparepart', 'Komponen untuk servis (RAM, SSD, LCD, dll)');

-- ============================================
-- 3. STOK BARANG (UNIT & SPAREPART)
-- ============================================

CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  description TEXT,
  -- Untuk unit laptop
  brand TEXT,
  model TEXT,
  specs TEXT,
  condition TEXT CHECK (condition IN ('baru', 'bekas', 'refurbished')),
  imei_serial TEXT,
  -- Harga
  buy_price BIGINT DEFAULT 0, -- harga beli (dalam rupiah)
  sell_price BIGINT DEFAULT 0, -- harga jual (untuk unit)
  -- Stok
  quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
  min_quantity INTEGER DEFAULT 0, -- threshold stok minimum (sparepart)
  -- Status unit
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'sold', 'reserved', 'repairing')),
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage products" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 4. MUTASI STOK (KARTU STOK)
-- ============================================

CREATE TABLE public.stock_movements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reference_type TEXT CHECK (reference_type IN ('pembelian_unit', 'penjualan_unit', 'servis', 'adjustment')),
  reference_id UUID, -- ID transaksi terkait
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock movements" ON public.stock_movements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 5. TRANSAKSI SERVIS
-- ============================================

CREATE TABLE public.services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Nota
  nota_number TEXT UNIQUE NOT NULL, -- SRV-0001
  -- Customer
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  -- Perangkat
  device_type TEXT NOT NULL, -- 'Laptop', 'PC', dll
  device_brand TEXT,
  device_model TEXT,
  complaint TEXT, -- keluhan
  kelengkapan TEXT, -- barang bawaan customer (Charger, Tas, dll)
  -- Biaya
  service_fee BIGINT DEFAULT 0, -- biaya jasa
  parts_fee BIGINT DEFAULT 0, -- biaya sparepart
  total_fee BIGINT DEFAULT 0, -- total
  -- Garansi
  garansi TEXT DEFAULT 'Tanpa Garansi', -- durasi garansi
  warranty_end_date TIMESTAMPTZ, -- tanggal berakhir garansi
  -- Status
  status TEXT DEFAULT 'proses' CHECK (status IN ('proses', 'menunggu', 'selesai', 'dibatalkan')),
  -- Tanggal
  date_in TIMESTAMPTZ DEFAULT now(),
  date_out TIMESTAMPTZ,
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view services" ON public.services
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create services" ON public.services
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update services" ON public.services
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- 6. DETAIL SPAREPART YANG DIPAKAI DI SERVIS
-- ============================================

CREATE TABLE public.service_parts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price BIGINT NOT NULL, -- harga saat itu
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view service parts" ON public.service_parts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create service parts" ON public.service_parts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 7. PEMBELIAN UNIT LAPTOP
-- ============================================

CREATE TABLE public.purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  -- Supplier/Customer (sumber)
  source_type TEXT CHECK (source_type IN ('supplier', 'customer')),
  source_name TEXT,
  source_phone TEXT,
  -- Harga
  buy_price BIGINT NOT NULL,
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'returned')),
  -- Metadata
  date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view purchases" ON public.purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can create purchases" ON public.purchases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 8. PENJUALAN UNIT LAPTOP
-- ============================================

CREATE TABLE public.sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Invoice
  invoice_number TEXT UNIQUE NOT NULL, -- INV-0001
  product_id UUID REFERENCES public.products(id),
  -- Pembeli
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  -- Harga
  sell_price BIGINT NOT NULL,
  buy_price BIGINT NOT NULL, -- harga beli (untuk hitung margin)
  margin BIGINT GENERATED ALWAYS AS (sell_price - buy_price) STORED,
  -- Metode bayar
  payment_method TEXT DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer', 'tempo')),
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'returned', 'cancelled')),
  -- Metadata
  date TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view sales" ON public.sales
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can create sales" ON public.sales
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 9. BIAYA OPERASIONAL
-- ============================================

CREATE TABLE public.operational_costs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- 'Sewa Tempat', 'Listrik', 'Internet', 'Gaji Karyawan'
  amount BIGINT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  cost_date DATE DEFAULT CURRENT_DATE, -- tanggal biaya terjadi
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.operational_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view operational costs" ON public.operational_costs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage operational costs" ON public.operational_costs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 10. AUTO-INCREMENT NOTA & INVOICE
-- ============================================

-- Sequence untuk nota servis
CREATE SEQUENCE nota_servis_seq START 1;

-- Sequence untuk invoice penjualan
CREATE SEQUENCE invoice_sales_seq START 1;

-- Function untuk generate nota number
CREATE OR REPLACE FUNCTION generate_nota_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nota_number := 'SRV-' || LPAD(nextval('nota_servis_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function untuk generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || LPAD(nextval('invoice_sales_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk auto-generate nota
CREATE TRIGGER trigger_generate_nota
  BEFORE INSERT ON public.services
  FOR EACH ROW
  WHEN (NEW.nota_number IS NULL)
  EXECUTE FUNCTION generate_nota_number();

-- Trigger untuk auto-generate invoice
CREATE TRIGGER trigger_generate_invoice
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================
-- 11. FUNCTION: AUTO-UPDATE STOK SAAT SERVIS
-- ============================================

CREATE OR REPLACE FUNCTION update_stock_on_service()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'keluar' THEN
    UPDATE public.products
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  ELSIF NEW.type = 'masuk' THEN
    UPDATE public.products
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_service();

-- ============================================
-- 12. VIEW: LAPORAN BULANAN
-- ============================================

-- security_invoker: view mengikuti RLS milik pemanggil, sehingga anon tidak bisa
-- membaca omzet & margin tanpa login (RLS tidak berlaku otomatis pada view)
CREATE VIEW public.monthly_report
WITH (security_invoker = true) AS
SELECT
  EXTRACT(YEAR FROM s.date)::INTEGER AS year,
  EXTRACT(MONTH FROM s.date)::INTEGER AS month,
  -- Omzet servis
  COALESCE(SUM(DISTINCT sv.total_fee), 0) AS omzet_servis,
  -- Omzet penjualan unit
  COALESCE(SUM(DISTINCT s.sell_price), 0) AS omzet_penjualan,
  -- Margin unit
  COALESCE(SUM(DISTINCT s.margin), 0) AS margin_unit,
  -- Total transaksi
  COUNT(DISTINCT s.id) AS total_transaksi_unit,
  COUNT(DISTINCT sv.id) AS total_transaksi_servis
FROM public.sales s
FULL OUTER JOIN public.services sv ON
  EXTRACT(YEAR FROM s.date) = EXTRACT(YEAR FROM sv.date_in) AND
  EXTRACT(MONTH FROM s.date) = EXTRACT(MONTH FROM sv.date_in)
WHERE s.status = 'completed' OR sv.status = 'selesai' OR s.id IS NULL OR sv.id IS NULL
GROUP BY year, month;

-- ============================================
-- SELESAI
-- ============================================


-- ============================================
-- [FRESH-SETUP] Helper get_my_role
-- Dibutuhkan policy "Admin can manage settings" di migration_settings.sql
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Settings table untuk menyimpan konfigurasi toko
-- Jalankan ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Semua user yang login bisa baca settings (sidebar butuh baca nama toko)
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
CREATE POLICY "Authenticated users can view settings" ON public.settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Hanya admin yang bisa ubah settings
DROP POLICY IF EXISTS "Admin can manage settings" ON public.settings;
CREATE POLICY "Admin can manage settings" ON public.settings
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- Default values (jalankan sekali saja)
INSERT INTO public.settings (key, value, description) VALUES
  ('store_name', 'Kasir POS', 'Nama toko yang tampil di nota dan sidebar'),
  ('store_address', 'Jl. Contoh No. 123, Kota', 'Alamat toko'),
  ('store_phone', '0812-3456-7890', 'Telepon toko'),
  ('fonnte_api_key', '', 'API Key Fonnte untuk kirim WhatsApp'),
  ('admin_phone', '', 'Nomor HP admin untuk notifikasi')
ON CONFLICT (key) DO NOTHING;
-- Migration: Tambah pengaturan rekening bank
-- Jalankan di Supabase SQL Editor

-- Insert default values (will be updated by user via settings page)
INSERT INTO public.settings (key, value) VALUES
  ('bank_name', 'BCA'),
  ('bank_account_number', ''),
  ('bank_account_holder', '')
ON CONFLICT (key) DO NOTHING;
-- Migration: Tambah kolom email ke tabel profiles (safe version)
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom email (abaikan jika sudah ada)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- 2. Cek dan tambah INSERT policy jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Authenticated users can insert profiles'
  ) THEN
    CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
-- Migration: Tabel metode pembayaran + update sales
-- Jalankan di Supabase SQL Editor

-- 1. Buat tabel payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payment methods" ON public.payment_methods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage payment methods" ON public.payment_methods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default payment methods
INSERT INTO public.payment_methods (name, description, sort_order) VALUES
  ('Cash', 'Pembayaran tunai', 1),
  ('Transfer BCA', 'Transfer ke rekening BCA', 2),
  ('QRIS', 'Pembayaran via QRIS', 3)
ON CONFLICT (name) DO NOTHING;

-- 2. Tambah kolom garansi ke tabel sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS garansi TEXT DEFAULT 'Tanpa Garansi';

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMPTZ;

COMMENT ON COLUMN public.sales.garansi IS 'Durasi garansi unit';
COMMENT ON COLUMN public.sales.warranty_end_date IS 'Tanggal berakhir garansi';

-- 3. Update payment_method constraint (hapus constraint lama jika ada)
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_payment_method_check;

-- Tambah constraint baru yang lebih fleksibel
ALTER TABLE public.sales 
ADD CONSTRAINT sales_payment_method_check 
CHECK (payment_method IS NOT NULL AND length(payment_method) > 0);
-- ============================================
-- MIGRATION: Enable RLS + Policies untuk categories
-- ============================================
-- Run ini di Supabase Dashboard → SQL Editor
-- Fix error "gagal menyimpan kategori"
-- ============================================

-- Enable RLS untuk categories (kalau belum)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy: semua user yang login bisa lihat kategori
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: admin bisa tambah/edit/hapus kategori
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;
CREATE POLICY "Admin can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Cek hasil
-- ============================================
-- Jalankan query ini untuk verify:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'categories';
-- SELECT * FROM pg_policies WHERE tablename = 'categories';
-- ============================================
-- FITUR: BELI SPAREPART (pembelian = pengeluaran toko)
-- ============================================

-- 1. Tabel pembelian sparepart (expense channel, terpisah dari operational_costs)
CREATE TABLE IF NOT EXISTS public.sparepart_purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  buy_price BIGINT NOT NULL,
  total BIGINT NOT NULL, -- buy_price * quantity
  source_type TEXT DEFAULT 'supplier' CHECK (source_type IN ('supplier', 'customer')),
  source_name TEXT,
  source_phone TEXT,
  purchase_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sparepart_purchases_date ON public.sparepart_purchases (purchase_date);
CREATE INDEX IF NOT EXISTS idx_sparepart_purchases_product ON public.sparepart_purchases (product_id);

ALTER TABLE public.sparepart_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view sparepart purchases" ON public.sparepart_purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can create sparepart purchases" ON public.sparepart_purchases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete sparepart purchases" ON public.sparepart_purchases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Tambah nilai reference_type untuk mutasi stok masuk pembelian sparepart
ALTER TABLE public.stock_movements DROP CONSTRAINT stock_movements_reference_type_check;

ALTER TABLE public.stock_movements ADD CONSTRAINT stock_movements_reference_type_check
  CHECK (reference_type IN ('pembelian_unit', 'penjualan_unit', 'servis', 'adjustment', 'pembelian_sparepart'));
-- Migration: Tabel sale_items untuk multi-item per nota
-- Jalankan di Supabase SQL Editor

-- 1. Buat tabel sale_items
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('unit', 'sparepart')),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  buy_price BIGINT NOT NULL DEFAULT 0,
  sell_price BIGINT NOT NULL DEFAULT 0,
  subtotal BIGINT GENERATED ALWAYS AS (quantity * sell_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Authenticated users can view sale_items" ON public.sale_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sale_items" ON public.sale_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sale_items" ON public.sale_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Index untuk performa
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS sale_items_product_id_idx ON public.sale_items (product_id);

-- 5. Tambah kolom is_multi_item di sales (opsional, untuk flag)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_multi_item BOOLEAN DEFAULT false;
-- ============================================
-- Migration: Snapshot modal sparepart servis + simpan stok ATOMIK
-- Jalankan di Supabase SQL Editor (sebelum deploy frontend)
-- ============================================

-- 1. Kolom snapshot HARGA BELI saat sparepart dipakai (dipakai utk hitung modal/laba)
ALTER TABLE public.service_parts
ADD COLUMN IF NOT EXISTS buy_price BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.service_parts.buy_price IS 'Harga beli saat sparepart dipakai (snapshot modal)';

-- 2. RPC: simpan seluruh set sparepart servis secara atomik (row lock + validasi stok)
--    Pemakaian:
--    - Servis BARU : kirim items final (belum ada parts lama)
--    - EDIT servis : kirim items final, fungsi hitung selisih (restore/kurangi stok otomatis)
--    - HAPUS + restore stok : kirim p_items = '[]'
CREATE OR REPLACE FUNCTION public.save_service_parts(
  p_service_id uuid,
  p_items jsonb,
  p_created_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_price bigint;
  v_buy_price bigint;
  v_old_qty integer;
  v_delta integer;
  v_stok integer;
  v_name text;
  old_part RECORD;
  new_parts uuid[] := '{}';
BEGIN
  -- Kunci semua produk lama (masih terpakai servis ini)
  FOR old_part IN SELECT product_id FROM public.service_parts WHERE service_id = p_service_id
  LOOP
    PERFORM 1 FROM public.products WHERE id = old_part.product_id FOR UPDATE;
  END LOOP;

  -- Validasi & kunci produk baru (qty > 0 saja)
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::uuid;
    v_qty := (item->>'quantity')::integer;
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'product_id tidak valid pada salah satu item';
    END IF;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;
    SELECT quantity, name INTO v_stok, v_name FROM public.products WHERE id = v_product_id FOR UPDATE;
    IF v_stok IS NULL THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;
    new_parts := array_append(new_parts, v_product_id);
  END LOOP;

  -- Selisih untuk produk yang masih ada di daftar baru
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::uuid;
    v_qty := (item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;
    v_price := (item->>'price')::numeric::bigint;
    v_buy_price := COALESCE((item->>'buy_price')::numeric::bigint, 0);

    SELECT quantity, name INTO v_stok, v_name FROM public.products WHERE id = v_product_id;
    SELECT COALESCE(SUM(quantity), 0) INTO v_old_qty
    FROM public.service_parts WHERE service_id = p_service_id AND product_id = v_product_id;

    v_delta := v_qty - v_old_qty;

    IF v_delta > 0 THEN
      IF v_stok < v_delta THEN
        RAISE EXCEPTION 'Stok % tidak mencukupi (tersedia %, butuh tambahan %)', v_name, v_stok, v_delta;
      END IF;
      INSERT INTO public.stock_movements (product_id, type, quantity, reference_type, reference_id, notes, created_by)
      VALUES (v_product_id, 'keluar', v_delta, 'servis', p_service_id, 'Sparepart dipakai untuk servis', p_created_by);
    ELSIF v_delta < 0 THEN
      INSERT INTO public.stock_movements (product_id, type, quantity, reference_type, reference_id, notes, created_by)
      VALUES (v_product_id, 'masuk', -v_delta, 'servis', p_service_id, 'Restore stok (sparepart dikurangi dari servis)', p_created_by);
    END IF;
  END LOOP;

  -- Produk lama yang dihapus total dari servis -> restore penuh
  FOR old_part IN SELECT product_id, quantity FROM public.service_parts WHERE service_id = p_service_id
  LOOP
    IF NOT (old_part.product_id = ANY (new_parts)) THEN
      INSERT INTO public.stock_movements (product_id, type, quantity, reference_type, reference_id, notes, created_by)
      VALUES (old_part.product_id, 'masuk', old_part.quantity, 'servis', p_service_id, 'Restore stok (sparepart dihapus dari servis)', p_created_by);
    END IF;
  END LOOP;

  -- Ganti seluruh baris service_parts dengan set final
  DELETE FROM public.service_parts WHERE service_id = p_service_id;
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::uuid;
    v_qty := (item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      CONTINUE;
    END IF;
    v_price := (item->>'price')::numeric::bigint;
    v_buy_price := COALESCE((item->>'buy_price')::numeric::bigint, 0);
    INSERT INTO public.service_parts (service_id, product_id, quantity, price, buy_price)
    VALUES (p_service_id, v_product_id, v_qty, v_price, v_buy_price);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_service_parts(uuid, jsonb, uuid) TO authenticated;
-- Migration: Tambah field dp_amount, bonus ke tabel sales
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom dp_amount
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS dp_amount BIGINT DEFAULT 0;

-- 2. Tambah kolom bonus (array text untuk checkbox)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS bonus TEXT[];

-- 3. Tambah kolom bonus_lainnya (text bebas)
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS bonus_lainnya TEXT;

COMMENT ON COLUMN public.sales.dp_amount IS 'DP/Uang Muka dalam rupiah';
COMMENT ON COLUMN public.sales.bonus IS 'Array bonus yang dipilih (Mouse, Keyboard, Tas, Mousepad)';
COMMENT ON COLUMN public.sales.bonus_lainnya IS 'Bonus lainnya (text bebas)';
-- Migration: Support sparepart sales + invoice number prefixes
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom tipe_barang ke sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'unit' CHECK (item_type IN ('unit', 'sparepart'));

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS item_name TEXT;

COMMENT ON COLUMN public.sales.item_type IS 'Tipe barang: unit atau sparepart';
COMMENT ON COLUMN public.sales.quantity IS 'Jumlah barang yang dijual (untuk sparepart)';
COMMENT ON COLUMN public.sales.item_name IS 'Nama barang (denormalized untuk riwayat)';

-- 2. Update sequence untuk invoice number
-- Buat sequence terpisah untuk sparepart
CREATE SEQUENCE IF NOT EXISTS invoice_sparepart_seq START 1;

-- 3. Update function generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'sparepart' THEN
    NEW.invoice_number := 'JSP-' || LPAD(nextval('invoice_sparepart_seq')::TEXT, 4, '0');
  ELSE
    NEW.invoice_number := 'JUL-' || LPAD(nextval('invoice_sales_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_sales_item_type ON public.sales(item_type);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);
-- Migration: Add dp_amount column to services table
-- Run this in Supabase SQL Editor

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS dp_amount NUMERIC DEFAULT 0;

-- Update existing records to have dp_amount = 0
UPDATE services SET dp_amount = 0 WHERE dp_amount IS NULL;
-- Migration: Tambah field kelengkapan, garansi, dan warranty_end_date ke tabel services
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom kelengkapan (barang bawaan customer)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS kelengkapan TEXT;

-- 2. Tambah kolom garansi (durasi garansi)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS garansi TEXT DEFAULT 'Tanpa Garansi';

-- 3. Tambah kolom warranty_end_date (tanggal berakhir garansi)
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMPTZ;

-- Update comment
COMMENT ON COLUMN public.services.kelengkapan IS 'Barang bawaan customer (Charger, Tas, dll)';
COMMENT ON COLUMN public.services.garansi IS 'Durasi garansi: Tanpa Garansi, 7 Hari, 14 Hari, 30 Hari, 3 Bulan';
COMMENT ON COLUMN public.services.warranty_end_date IS 'Tanggal berakhir garansi (otomatis dihitung dari date_out + durasi garansi)';
-- Migration: Tambah status 'menunggu' ke tabel services
-- Jalankan di Supabase SQL Editor

-- Update constraint untuk status
ALTER TABLE public.services 
DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE public.services 
ADD CONSTRAINT services_status_check 
CHECK (status IN ('proses', 'menunggu', 'selesai', 'dibatalkan'));

COMMENT ON COLUMN public.services.status IS 'Status servis: proses, menunggu (konfirmasi customer), selesai, dibatalkan';
-- ============================================
-- Izinkan karyawan menambah stok (products & categories)
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================

CREATE POLICY "Authenticated users can create products" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create categories" ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- Migration: Sync status produk dengan quantity
-- Jalankan di Supabase SQL Editor untuk memperbaiki data yang sudah ada

-- Update status berdasarkan quantity
UPDATE public.products 
SET status = CASE 
  WHEN quantity > 0 THEN 'ready'
  WHEN quantity = 0 THEN 'sold'
  ELSE status
END
WHERE status != 'sold' OR (status = 'sold' AND quantity > 0);

-- Verifikasi: cek produk yang statusnya tidak konsisten
-- SELECT id, name, quantity, status, 
--   CASE WHEN quantity > 0 THEN 'ready' ELSE 'sold' END as correct_status
-- FROM public.products 
-- WHERE status != (CASE WHEN quantity > 0 THEN 'ready' ELSE 'sold' END);
-- Buat storage bucket untuk file nota PDF
-- Jalankan di Supabase SQL Editor

-- Buat bucket 'nota' (public access supaya Fonnte bisa download)
INSERT INTO storage.buckets (id, name, public) VALUES ('nota', 'nota', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: semua user bisa upload
CREATE POLICY "Authenticated users can upload nota" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'nota');

-- Policy: semua user bisa baca (Fonnte perlu download)
CREATE POLICY "Anyone can read nota" ON storage.objects
  FOR SELECT USING (bucket_id = 'nota');

-- Policy: semua user bisa hapus (cleanup)
CREATE POLICY "Authenticated users can delete nota" ON storage.objects
  FOR DELETE USING (bucket_id = 'nota');
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