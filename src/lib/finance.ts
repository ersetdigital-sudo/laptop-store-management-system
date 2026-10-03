import { supabase } from '@/lib/supabase'
import { buildPeriodRange, computeFinanceSummary } from './finance-core'
import type { FinancePeriod, FinancePeriodData, FinancePurchase, FinanceSale, FinanceServicePart } from './finance-core'

export * from './finance-core'

export async function fetchFinanceData(period: FinancePeriod): Promise<FinancePeriodData> {
  const { start, end } = buildPeriodRange(period)

  const servicesQuery = supabase
    .from('services')
    .select(
      'id, nota_number, customer_name, device_type, device_brand, service_fee, parts_fee, total_fee, status, date_in, created_at',
    )
    .gte('date_in', start)
    .lt('date_in', end)

  const salesQuery = supabase
    .from('sales')
    .select(
      'id, invoice_number, buyer_name, product_id, item_type, item_name, quantity, sell_price, buy_price, margin, status, date, created_at, products(name)',
    )
    .gte('date', start)
    .lt('date', end)

  let costsQuery = supabase
    .from('operational_costs')
    .select('amount, period_month, period_year')
    .eq('period_year', period.year)
  if (period.month != null) {
    costsQuery = costsQuery.eq('period_month', period.month)
  }

  const partsQuery = supabase
    .from('service_parts')
    .select('service_id, quantity, buy_price, services!inner(status, date_in)')
    .eq('services.status', 'selesai')
    .gte('services.date_in', start)
    .lt('services.date_in', end)

  // Bandingkan pakai bagian tanggal saja ('YYYY-MM-DD') karena purchase_date bertipe DATE —
  // bandingkan dengan timestamp ISO bisa salah atribusi bulan di zona waktu +07:00.
  const purchasesQuery = supabase
    .from('sparepart_purchases')
    .select('product_id, quantity, buy_price, purchase_date')
    .gte('purchase_date', start.slice(0, 10))
    .lt('purchase_date', end.slice(0, 10))

  const [servicesRes, salesRes, costsRes, partsRes, purchasesRes] = await Promise.all([
    servicesQuery,
    salesQuery,
    costsQuery,
    partsQuery,
    purchasesQuery,
  ])

  const services = servicesRes.data || []
  const sales: FinanceSale[] = (salesRes.data || []).map((s) => ({
    id: s.id,
    invoice_number: s.invoice_number,
    buyer_name: s.buyer_name,
    product_id: s.product_id,
    product_name: s.item_name || s.products?.[0]?.name || '',
    item_type: s.item_type || 'unit',
    quantity: s.quantity ?? 1,
    sell_price: s.sell_price,
    buy_price: s.buy_price,
    margin: s.margin,
    status: s.status,
    date: s.date,
    created_at: s.created_at,
  }))
  const costs = costsRes.data || []
  const parts: FinanceServicePart[] = (partsRes.data || []).map((p) => ({
    service_id: p.service_id,
    quantity: p.quantity,
    buy_price: p.buy_price,
    date_in: p.services?.[0]?.date_in || '',
  }))
  const purchases: FinancePurchase[] = (purchasesRes.data || []).map((p) => ({
    product_id: p.product_id,
    quantity: p.quantity,
    buy_price: p.buy_price,
    purchase_date: p.purchase_date,
  }))

  return {
    services,
    sales,
    costs,
    parts,
    purchases,
    summary: computeFinanceSummary(services, sales, costs, parts, purchases),
  }
}