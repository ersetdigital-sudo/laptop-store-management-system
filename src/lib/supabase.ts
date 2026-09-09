import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type UserRole = 'admin' | 'karyawan'

export interface Profile {
  id: string
  name: string
  email: string | null
  role: UserRole
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  nama: string
  no_wa: string
  alamat: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id: string
  name: string
  sku: string | null
  description: string | null
  brand: string | null
  model: string | null
  specs: string | null
  condition: 'baru' | 'bekas' | 'refurbished' | null
  imei_serial: string | null
  buy_price: number
  sell_price: number
  quantity: number
  min_quantity: number
  status: 'ready' | 'sold' | 'reserved' | 'repairing'
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  nota_number: string
  customer_id: string | null
  customer_name: string
  customer_phone: string
  device_type: string
  device_brand: string | null
  device_model: string | null
  complaint: string | null
  kelengkapan: string | null
  service_fee: number
  parts_fee: number
  total_fee: number
  dp_amount: number
  garansi: string
  warranty_end_date: string | null
  status: 'proses' | 'menunggu' | 'selesai' | 'dibatalkan'
  date_in: string
  date_out: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  service_parts?: { quantity: number; buy_price: number }[]
}

export interface ServicePart {
  id: string
  service_id: string
  product_id: string
  quantity: number
  price: number
  buy_price: number
  created_at: string
}

export interface Purchase {
  id: string
  product_id: string
  source_type: 'supplier' | 'customer'
  source_name: string | null
  source_phone: string | null
  buy_price: number
  status: 'completed' | 'returned'
  date: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Sale {
  id: string
  invoice_number: string
  customer_id: string | null
  product_id: string | null
  item_type: 'unit' | 'sparepart' | 'mixed'
  item_name: string | null
  quantity: number
  buyer_name: string
  buyer_phone: string | null
  sell_price: number
  buy_price: number
  margin: number
  dp_amount: number
  bonus: string[] | null
  bonus_lainnya: string | null
  payment_method: string
  garansi: string
  warranty_end_date: string | null
  status: 'completed' | 'returned' | 'cancelled'
  date: string
  notes: string | null
  created_by: string | null
  is_multi_item: boolean
  created_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  item_type: 'unit' | 'sparepart'
  item_name: string
  quantity: number
  buy_price: number
  sell_price: number
  subtotal: number
  created_at: string
}

export interface PaymentMethod {
  id: string
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface OperationalCost {
  id: string
  name: string
  amount: number
  period_month: number
  period_year: number
  cost_date: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  type: 'masuk' | 'keluar'
  quantity: number
  reference_type: 'pembelian_unit' | 'penjualan_unit' | 'servis' | 'adjustment' | 'pembelian_sparepart' | 'pembelian_kwitansi'
  reference_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SupplierReceipt {
  id: string
  receipt_number: string
  supplier_name: string
  supplier_phone: string | null
  purchase_date: string
  total: number
  payment_method: string
  notes: string | null
  status: 'selesai' | 'dibatalkan'
  created_by: string | null
  created_at: string
}

export interface SupplierReceiptItem {
  id: string
  receipt_id: string
  product_id: string | null
  item_type: 'sparepart' | 'unit'
  item_name: string
  brand: string | null
  model: string | null
  specs: string | null
  condition: 'baru' | 'bekas' | 'refurbished' | null
  imei_serial: string | null
  quantity: number
  buy_price: number
  sell_price: number
  subtotal: number
  created_at: string
}
