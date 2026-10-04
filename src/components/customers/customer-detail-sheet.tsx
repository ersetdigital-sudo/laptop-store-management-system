'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Customer, Sale, Service, Product } from '@/lib/supabase'
import { X, Phone, MapPin, Wrench, ShoppingCart, Download, Plus, Loader2, Calendar, DollarSign, MessageCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NotaUnitPDF } from '@/components/pdf/nota-unit'
import { NotaServisPDF } from '@/components/pdf/nota-servis'
import { downloadPDF } from '@/components/pdf/utils'
import { fetchServiceGroup } from '@/lib/servis-group'
import Link from 'next/link'

type TabType = 'service' | 'penjualan'

interface CustomerDetailSheetProps {
  open: boolean
  customerId: string | null
  onClose: () => void
}

const AVATAR_TONES = [
  'bg-badge-info/15 text-badge-info',
  'bg-badge-success/15 text-badge-success',
  'bg-badge-warning/15 text-badge-warning',
  'bg-primary/10 text-primary',
  'bg-danger/10 text-danger',
]
const avatarTone = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

export function CustomerDetailSheet({ open, customerId, onClose }: CustomerDetailSheetProps) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sales, setSales] = useState<(Sale & { products?: { brand: string; model: string; specs: string | null } })[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('service')
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })

  const fetchData = useCallback(async () => {
    if (!customerId) return
    try {
      const { data: cust, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (custError) throw custError
      setCustomer(cust)

      const { data: salesData } = await supabase
        .from('sales')
        .select('*, products(brand, model, specs)')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
      setSales(salesData || [])

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('customer_id', customerId)
        .order('date_in', { ascending: false })
      setServices(servicesData || [])

      const { data: settings } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['store_name', 'store_address', 'store_phone'])

      const map: Record<string, string> = {}
      settings?.forEach(row => { map[row.key] = row.value })
      setStoreInfo({
        storeName: map.store_name || 'Kasir POS',
        storeAddress: map.store_address || '',
        storePhone: map.store_phone || '',
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, fetchData])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getStatusColor = (status: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'selesai':
      case 'completed': return 'success'
      case 'proses':
      case 'menunggu': return 'warning'
      case 'dibatalkan':
      case 'cancelled': return 'destructive'
      case 'returned': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'selesai': return 'Selesai'
      case 'proses': return 'Proses'
      case 'menunggu': return 'Menunggu'
      case 'dibatalkan': return 'Dibatalkan'
      case 'completed': return 'Selesai'
      case 'returned': return 'Dikembalikan'
      case 'cancelled': return 'Dibatalkan'
      default: return status
    }
  }

  const handleDownloadSalePDF = async (sale: Sale & { products?: { brand: string; model: string; specs: string | null } }) => {
    if (!sale.products) return
    setPdfLoading(sale.id)
    try {
      const doc = NotaUnitPDF({
        sale: { ...sale, warranty_end_date: sale.warranty_end_date || null },
        product: sale.products as unknown as Product,
        ...storeInfo,
      })
      await downloadPDF(doc, `Invoice-${sale.invoice_number}.pdf`)
    } catch (e) {
      console.error('Gagal generate PDF:', e)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadServicePDF = async (service: Service) => {
    setPdfLoading(service.id)
    try {
      const { services, partsByService } = await fetchServiceGroup(service)
      const doc = NotaServisPDF({ services, partsByService, ...storeInfo })
      await downloadPDF(doc, `Nota-${service.nota_number}.pdf`)
    } catch (e) {
      console.error('Gagal generate PDF:', e)
    } finally {
      setPdfLoading(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Sheet: bottom sheet di mobile, drawer kanan di desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-xl sm:rounded-none sm:rounded-l-2xl"
      >
        {/* Drag handle (mobile) */}
        <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6">
          <h2 className="text-base font-bold text-foreground">Detail Customer</h2>
          <Button onClick={onClose} variant="ghost" size="sm" aria-label="Tutup" className="h-8 w-8 p-0">
            <X size={16} />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !customer ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Customer tidak ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profil header — Premium Navy */}
              <div className="overflow-hidden rounded-2xl bg-[#04123F] shadow-card">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#FEC40B] text-lg font-bold text-[#04123F]">
                      {initials(customer.nama)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-white">{customer.nama}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                        <Phone size={12} className="shrink-0" />
                        <span className="font-mono">{customer.no_wa}</span>
                      </div>
                      {customer.alamat && (
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/60">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{customer.alamat}</span>
                        </div>
                      )}
                    </div>
                    <a
                      href={`https://wa.me/${customer.no_wa.replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${customer.nama}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300 transition-colors hover:bg-emerald-500/30"
                    >
                      <MessageCircle size={17} strokeWidth={2} />
                    </a>
                  </div>

                  {/* Stats — Gold accent on dark */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
                    <div className="rounded-xl bg-white/[0.06] p-2.5 text-center">
                      <p className="text-lg font-bold text-white">{services.length}</p>
                      <p className="text-[10px] text-white/50">Service</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-2.5 text-center">
                      <p className="text-lg font-bold text-white">{sales.length}</p>
                      <p className="text-[10px] text-white/50">Penjualan</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-2.5 text-center col-span-2 sm:col-span-1">
                      <p className="truncate text-sm font-bold text-[#FEC40B]">
                        {formatRupiah(services.reduce((sum, s) => sum + s.total_fee, 0) + sales.reduce((sum, s) => sum + s.sell_price, 0))}
                      </p>
                      <p className="text-[10px] text-white/50">Total Nilai</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-2.5 text-center col-span-2 sm:col-span-1">
                      <p className="truncate text-xs font-medium text-white/80">
                        {formatDate(services[0]?.date_in || sales[0]?.date || null)}
                      </p>
                      <p className="text-[10px] text-white/50">Transaksi Terakhir</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href={`/servis?customer_id=${customer.id}&nama=${encodeURIComponent(customer.nama)}&phone=${encodeURIComponent(customer.no_wa)}`} className="flex-1">
                  <Button variant="outline" size="sm" className="h-9 w-full gap-1.5">
                    <Plus size={14} />
                    <Wrench size={14} />
                    Nota Service
                  </Button>
                </Link>
                <Link href={`/unit-laptop/jual?customer_id=${customer.id}&nama=${encodeURIComponent(customer.nama)}&phone=${encodeURIComponent(customer.no_wa)}`} className="flex-1">
                  <Button variant="outline" size="sm" className="h-9 w-full gap-1.5">
                    <Plus size={14} />
                    <ShoppingCart size={14} />
                    Nota Penjualan
                  </Button>
                </Link>
              </div>

              {/* Tab Toggle — Premium */}
              <div className="flex gap-1 rounded-xl border border-hairline bg-gray-50/50 p-1">
                <button
                  onClick={() => setTab('service')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    tab === 'service' ? 'bg-[#04123F] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Wrench size={15} />
                  Service ({services.length})
                </button>
                <button
                  onClick={() => setTab('penjualan')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    tab === 'penjualan' ? 'bg-[#04123F] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <ShoppingCart size={15} />
                  Penjualan ({sales.length})
                </button>
              </div>

              {/* Service History — Premium Cards */}
              {tab === 'service' && (
                <div className="space-y-2">
                  {services.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-gray-50/50 p-8 text-center">
                      <Wrench size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-muted-foreground">Belum ada riwayat service</p>
                    </div>
                  ) : (
                    services.map(s => (
                      <div key={s.id} className="rounded-xl border border-hairline bg-white p-3.5 transition-colors hover:border-hairline-strong">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-xs font-mono font-semibold text-gray-900">{s.nota_number}</p>
                              <Badge variant={getStatusColor(s.status)} className="text-[10px] px-1.5 py-0.5">
                                {getStatusLabel(s.status)}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {s.device_type} {s.device_brand} {s.device_model}
                            </p>
                            {s.complaint && (
                              <p className="text-xs text-gray-400 mt-1 truncate">{s.complaint}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2.5 text-xs">
                              <span className="flex items-center gap-1 text-gray-500">
                                <Calendar size={11} />
                                {formatDate(s.date_in)}
                              </span>
                              <span className="flex items-center gap-1 font-mono font-semibold text-gray-900">
                                <DollarSign size={11} className="text-gray-400" />
                                {formatRupiah(s.total_fee)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownloadServicePDF(s)}
                              disabled={pdfLoading === s.id}
                            >
                              {pdfLoading === s.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                            </Button>
                            <Link href={`/servis/${s.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                Detail
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sales History — Premium Cards */}
              {tab === 'penjualan' && (
                <div className="space-y-2">
                  {sales.length === 0 ? (
                    <div className="rounded-2xl border border-hairline bg-gray-50/50 p-8 text-center">
                      <ShoppingCart size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-muted-foreground">Belum ada riwayat penjualan</p>
                    </div>
                  ) : (
                    sales.map(s => (
                      <div key={s.id} className="rounded-xl border border-hairline bg-white p-3.5 transition-colors hover:border-hairline-strong">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-xs font-mono font-semibold text-gray-900">{s.invoice_number}</p>
                              <Badge variant={getStatusColor(s.status)} className="text-[10px] px-1.5 py-0.5">
                                {getStatusLabel(s.status)}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                {s.item_type === 'unit' ? 'Unit' : 'Sparepart'}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {s.products ? `${s.products.brand} ${s.products.model}` : s.item_name || '-'}
                            </p>
                            {s.products?.specs && (
                              <p className="text-xs text-gray-400 mt-0.5">{s.products.specs}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2.5 text-xs">
                              <span className="flex items-center gap-1 text-gray-500">
                                <Calendar size={11} />
                                {formatDate(s.date)}
                              </span>
                              <span className="flex items-center gap-1 font-mono font-semibold text-gray-900">
                                <DollarSign size={11} className="text-gray-400" />
                                {formatRupiah(s.sell_price)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownloadSalePDF(s)}
                              disabled={pdfLoading === s.id}
                            >
                              {pdfLoading === s.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Download size={14} />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
