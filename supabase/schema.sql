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
