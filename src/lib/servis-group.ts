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

// Tipe untuk grup servis di halaman daftar (satu nota = satu baris)
export interface ServiceGroup {
  representative: Service
  services: Service[]
  totalFee: number
  totalModal: number
  deviceCount: number
}

// Kelompokkan flat array Service menjadi grup berdasarkan customer_phone + created_at
// yang berdekatan (dalam 5 menit) — sama dengan logika fetchServiceGroup.
// Setiap grup menjadi satu baris di halaman daftar servis.
export function groupServicesForList(services: Service[]): ServiceGroup[] {
  const windowMs = 5 * 60 * 1000
  const groups: ServiceGroup[] = []
  const used = new Set<string>()

  // Sort ascending by created_at untuk grouping
  const sorted = [...services].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  for (const s of sorted) {
    if (used.has(s.id)) continue
    const created = new Date(s.created_at).getTime()
    const group: Service[] = [s]
    used.add(s.id)

    for (const other of sorted) {
      if (used.has(other.id)) continue
      if (other.customer_phone !== s.customer_phone) continue
      if (Math.abs(new Date(other.created_at).getTime() - created) <= windowMs) {
        group.push(other)
        used.add(other.id)
      }
    }

    // Representative = service pertama (created_at paling awal)
    group.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    groups.push({
      representative: group[0],
      services: group,
      totalFee: group.reduce((sum, s) => sum + s.total_fee, 0),
      totalModal: group.reduce(
        (sum, s) =>
          sum +
          (s.service_parts || []).reduce(
            (p, part) => p + part.quantity * (part.buy_price || 0),
            0
          ),
        0
      ),
      deviceCount: group.length,
    })
  }

  // Sort descending by created_at (newest first, sesuai urutan asli)
  groups.sort(
    (a, b) =>
      new Date(b.representative.created_at).getTime() -
      new Date(a.representative.created_at).getTime()
  )

  return groups
}
