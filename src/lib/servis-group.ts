import { supabase, Service } from './supabase'
import type { NotaServisPart } from '@/components/pdf/nota-servis'

// Ambil semua service record yang dibuat dalam satu transaksi (satu form submit
// multi-perangkat). Dikelompokkan berdasarkan nomor WA customer + waktu pembuatan
// yang berdekatan (dalam 5 menit), karena semua perangkat dari satu submit di-insert
// berurutan dalam waktu singkat.
export async function fetchServiceGroup(
  service: Service
): Promise<{ services: Service[]; partsByService: Record<string, NotaServisPart[]> }> {
  const windowMs = 5 * 60 * 1000
  const created = new Date(service.created_at).getTime()
  const from = new Date(created - windowMs).toISOString()
  const to = new Date(created + windowMs).toISOString()

  const { data } = await supabase
    .from('services')
    .select('*, service_parts(*, products(name))')
    .eq('customer_phone', service.customer_phone)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true })

  const rows = (data || []) as Array<Record<string, unknown> & { id: string; service_parts?: Array<{ product_id: string; quantity: number; price: number; buy_price?: number; products?: { name: string } | null }> }>

  const partsByService: Record<string, NotaServisPart[]> = {}
  const services: Service[] = []

  rows.forEach((row) => {
    partsByService[row.id] = (row.service_parts || []).map((p) => ({
      name: p.products?.name || 'Sparepart',
      quantity: p.quantity,
      price: p.price,
    }))
    // hilangkan service_parts agar sesuai tipe Service
    const { service_parts, ...rest } = row
    void service_parts
    services.push(rest as unknown as Service)
  })

  // Fallback: bila grouping tidak menemukan apa-apa, pakai service itu sendiri
  if (services.length === 0) {
    services.push(service)
  }

  return { services, partsByService }
}
