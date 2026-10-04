'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Service, Product, Customer } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { CustomerAutocomplete } from '@/components/ui/customer-autocomplete'
import { findOrCreateCustomer } from '@/lib/customers'
import { Plus, Search, Eye, FileText, Send, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { RupiahInput } from '@/components/ui/rupiah-input'
import PageHeader from '@/components/dashboard/PageHeader'
import { NotaServisPDF } from '@/components/pdf/nota-servis'
import { sendWhatsAppPDF } from '@/components/pdf/utils'
import { fetchServiceGroup, groupServicesForList, type ServiceGroup } from '@/lib/servis-group'
import { DeviceEntry, type DeviceEntryData } from '@/components/servis/device-entry'

export default function ServisPage() {
  const { isAdmin } = useAuth()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceGroup | null>(null)
  const [restoreStock, setRestoreStock] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingWA, setSendingWA] = useState<string | null>(null)
  const [waResult, setWaResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })
  const itemsPerPage = 10

  // Prefill from URL params (when coming from customer detail page)
  const prefillCustomerId = searchParams.get('customer_id') || undefined
  const prefillNama = searchParams.get('nama') || undefined
  const prefillPhone = searchParams.get('phone') || undefined

  // Auto-open form if prefill params exist
  useEffect(() => {
    if (prefillCustomerId || prefillNama) {
      setShowForm(true)
    }
  }, [prefillCustomerId, prefillNama])

  useEffect(() => { 
    fetchServices()
    fetchStoreSettings()
  }, [filterMonth])

  async function fetchStoreSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['store_name', 'store_address', 'store_phone'])
      const map: Record<string, string> = {}
      data?.forEach(row => { map[row.key] = row.value })
      setStoreInfo({
        storeName: map.store_name || 'Kasir POS',
        storeAddress: map.store_address || '',
        storePhone: map.store_phone || '',
      })
    } catch (e) { console.error(e) }
  }

  async function fetchServices() {
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('services')
        .select('*, service_parts(quantity, buy_price)')
        .gte('date_in', startDate)
        .lte('date_in', endDate)
        .order('created_at', { ascending: false })
      if (error) throw error
      setServices(data || [])
      setCurrentPage(1)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleDelete(group: ServiceGroup) {
    setDeleting(true)
    try {
      for (const service of group.services) {
        // Opsional: kembalikan stok sparepart ke gudang (hanya jika dikonfirmasi user)
        if (restoreStock) {
          const { error: restoreError } = await supabase.rpc('save_service_parts', {
            p_service_id: service.id,
            p_items: [],
            p_created_by: null,
          })
          if (restoreError) throw restoreError
        }

        // Hapus service_parts terkait dulu
        const { error: partsError } = await supabase.from('service_parts').delete().eq('service_id', service.id)
        if (partsError) console.error('Error deleting parts:', partsError)
        
        // Hapus stock_movements terkait
        const { error: movError } = await supabase.from('stock_movements').delete().eq('reference_id', service.id).eq('reference_type', 'servis')
        if (movError) console.error('Error deleting movements:', movError)
        
        // Hapus service
        const { error } = await supabase.from('services').delete().eq('id', service.id)
        if (error) throw error
      }
      
      setDeleteConfirm(null)
      fetchServices()
    } catch (e) {
      console.error(e)
      alert('Gagal menghapus data servis: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  async function handleKirimWhatsApp(service: Service) {
    setSendingWA(service.id)
    setWaResult(null)
    try {
      const { services, partsByService } = await fetchServiceGroup(service)
      const doc = NotaServisPDF({ services, partsByService, ...storeInfo })

      const tglMasuk = new Date(service.date_in).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      const sisa = service.total_fee - (service.dp_amount || 0)

      const message = [
        `📢 Halo ${service.customer_name},`,
        ``,
        `Kabar baik! Perangkat Anda telah selesai diservis dan siap diambil. 🎉`,
        ``,
        `━━━━━━━━━━━━━━`,
        `📋 DETAIL SERVIS`,
        `* No. Nota: ${service.nota_number}`,
        `* Perangkat: ${service.device_type} ${service.device_brand || ''} ${service.device_model || ''}`.trim(),
        service.complaint ? `* Keluhan: ${service.complaint}` : null,
        `* Tindakan Servis: ${service.notes || ''}`,
        `* Tanggal Masuk: ${tglMasuk}`,
        `━━━━━━━━━━━━━━`,
        `💰 RINCIAN BIAYA`,
        `* Biaya Jasa: ${formatRupiah(service.service_fee)}`,
        `* Biaya Sparepart: ${formatRupiah(service.parts_fee)}`,
        `────────────────`,
        `Total Pembayaran: ${formatRupiah(service.total_fee)}`,
        service.dp_amount > 0 ? `DP/Uang Muka: ${formatRupiah(service.dp_amount)}` : null,
        service.dp_amount > 0 ? `Sisa Pembayaran: ${formatRupiah(sisa)}` : null,
        ``,
        service.garansi && service.garansi.toLowerCase() !== 'tanpa garansi' ? `🛡️ Garansi: ${service.garansi}` : null,
        ``,
        `Terima kasih telah mempercayakan servis perangkat Anda kepada kami. 🙏`,
        ``,
        `Jika ada pertanyaan, silakan balas pesan ini. Kami siap membantu.`,
      ].filter(Boolean).join('\n')

      const result = await sendWhatsAppPDF({
        document: doc,
        filename: `Nota-${service.nota_number}.pdf`,
        phone: service.customer_phone,
        message,
      })

      if (result.success) {
        setWaResult({ id: service.id, ok: true, msg: 'Nota berhasil dikirim ke WhatsApp!' })
      } else {
        const waUrl = `https://wa.me/${service.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
        setWaResult({ id: service.id, ok: false, msg: `Gagal via API. Membuka WhatsApp Web...` })
      }
    } catch (e) {
      console.error('WhatsApp error:', e)
      setWaResult({ id: service.id, ok: false, msg: 'Terjadi kesalahan' })
    } finally {
      setSendingWA(null)
    }
  }

  async function handleKirimNotif(service: Service) {
    setSendingWA(service.id)
    setWaResult(null)
    try {
      const tglMasuk = new Date(service.date_in).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const sisa = service.total_fee - (service.dp_amount || 0)

      const statusMessages: Record<string, { intro: string; closing: string }> = {
        proses: {
          intro: 'Perangkat Anda saat ini sedang dalam proses pengerjaan oleh teknisi kami.',
          closing: 'Kami akan menghubungi Anda kembali setelah proses servis selesai.',
        },
        selesai: {
          intro: 'Kabar baik! Perangkat Anda telah selesai diservis dan siap diambil.',
          closing: 'Silakan ambil perangkat Anda di toko kami.\n\nTerima kasih telah mempercayakan servis perangkat Anda kepada kami. 🙏',
        },
        menunggu: {
          intro: 'Perangkat Anda sedang menunggu konfirmasi dari Anda.',
          closing: 'Silakan hubungi kami untuk konfirmasi.',
        },
        dibatalkan: {
          intro: 'Servis perangkat Anda telah dibatalkan.',
          closing: 'Silakan hubungi kami untuk informasi lebih lanjut.',
        },
      }

      const status = statusMessages[service.status] || statusMessages.proses

      const message = [
        `📢 Halo ${service.customer_name},`,
        ``,
        status.intro,
        ``,
        `━━━━━━━━━━━━━━`,
        `📋 DETAIL SERVIS`,
        `* No. Nota: ${service.nota_number}`,
        `* Perangkat: ${service.device_type} ${service.device_brand || ''} ${service.device_model || ''}`.trim(),
        service.complaint ? `* Keluhan: ${service.complaint}` : null,
        `* Tindakan Servis: ${service.notes || ''}`,
        `* Tanggal Masuk: ${tglMasuk}`,
        `━━━━━━━━━━━━━━`,
        `💰 RINCIAN BIAYA`,
        `* Biaya Jasa: ${formatRupiah(service.service_fee)}`,
        `* Biaya Sparepart: ${formatRupiah(service.parts_fee)}`,
        `────────────────`,
        `Total Pembayaran: ${formatRupiah(service.total_fee)}`,
        service.dp_amount > 0 ? `DP/Uang Muka: ${formatRupiah(service.dp_amount)}` : null,
        service.dp_amount > 0 ? `Sisa Pembayaran: ${formatRupiah(sisa)}` : null,
        ``,
        service.garansi && service.garansi.toLowerCase() !== 'tanpa garansi' ? `🛡️ Garansi: ${service.garansi}` : null,
        ``,
        status.closing,
      ].filter(Boolean).join('\n')

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: service.customer_phone,
          message,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setWaResult({ id: service.id, ok: true, msg: 'Notifikasi berhasil dikirim!' })
      } else {
        const waUrl = `https://wa.me/${service.customer_phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
        setWaResult({ id: service.id, ok: false, msg: `Gagal via API. Membuka WhatsApp Web...` })
      }
    } catch (e) {
      console.error('WhatsApp error:', e)
      setWaResult({ id: service.id, ok: false, msg: 'Terjadi kesalahan' })
    } finally {
      setSendingWA(null)
    }
  }

  // Group services yang termasuk dalam satu nota (customer + created_at berdekatan)
  const grouped = groupServicesForList(services)

  const filtered = grouped.filter(g => {
    const matchSearch = g.services.some(s =>
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.nota_number.toLowerCase().includes(search.toLowerCase()) ||
      s.device_type.toLowerCase().includes(search.toLowerCase())
    )
    const matchStatus = filterStatus === 'all' || g.representative.status === filterStatus
    return matchSearch && matchStatus
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const statusVariant = (status: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
    const map: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
      proses: 'warning',
      menunggu: 'default',
      selesai: 'success',
      dibatalkan: 'destructive',
    }
    return map[status] || 'secondary'
  }

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = { proses: 'Proses', menunggu: 'Menunggu Konfirmasi', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
    return map[status] || status
  }

  const progressPct = (status: string): number => {
    const map: Record<string, number> = { dibatalkan: 0, menunggu: 33, proses: 66, selesai: 100 }
    return map[status] ?? 0
  }
  const progressSteps = ['Diterima', 'Proses', 'Selesai']

  const statusTabs = [
    { value: 'all', label: 'Semua' },
    { value: 'proses', label: 'Proses' },
    { value: 'menunggu', label: 'Menunggu' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
  ]

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  // Total modal (HPP) sparepart per servis — snapshot buy_price saat dipakai
  const modalSparepart = (s: Service) =>
    (s.service_parts || []).reduce((sum, p) => sum + (p.quantity * (p.buy_price || 0)), 0)

  // Generate month options for quick select
  const monthOptions = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    monthOptions.push({ value, label })
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="spinner" /></div>
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Servis"
        subtitle="Kelola data servis pelanggan"
      >
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} strokeWidth={2} />
          Servis Baru
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <Input 
                type="text" 
                placeholder="Cari nama, nota, atau perangkat..." 
                value={search} 
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} 
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="h-9 rounded-lg border border-hairline-strong bg-surface px-3 text-sm flex-1 sm:w-[160px]"
              />
              <select 
                value={filterStatus} 
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }} 
                className="hidden lg:block h-9 rounded-lg border border-hairline-strong bg-surface px-3 text-sm sm:w-[160px]"
              >
                <option value="all">Semua Status</option>
                <option value="proses">Proses</option>
                <option value="menunggu">Menunggu Konfirmasi</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>

            {/* Status tabs (mobile only) — ala foodu-orders-tabs */}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {statusTabs.map(t => {
                const count = t.value === 'all' ? grouped.length : grouped.filter(g => g.representative.status === t.value).length
                const active = filterStatus === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => { setFilterStatus(t.value); setCurrentPage(1) }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      active ? 'bg-primary text-primary-foreground shadow-card' : 'border border-hairline bg-surface text-muted-foreground hover:bg-secondary/60'
                    }`}
                  >
                    {t.label}
                    <span className={`ml-1 ${active ? 'text-primary-foreground/70' : 'text-stone'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View — ala hot-pot-order-tracking */}
      <div className="block lg:hidden space-y-2.5">
        {paginatedData.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Belum ada data servis</p>
            </CardContent>
          </Card>
        ) : paginatedData.map(g => {
          const s = g.representative
          const pct = progressPct(s.status)
          return (
            <Card key={s.id} className="shadow-card overflow-hidden">
              <CardContent className="p-3.5 space-y-3">
                {/* Status badge + nota */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={statusVariant(s.status)} className="px-2 py-0.5 text-[10px]">
                    {statusLabel(s.status)}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {g.deviceCount > 1 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        {g.deviceCount} perangkat
                      </span>
                    )}
                    <p className="font-mono text-[11px] font-semibold text-stone">#{s.nota_number}</p>
                  </div>
                </div>

                {/* Customer + device */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{s.customer_name}</p>
                  {g.deviceCount > 1 ? (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {g.services.map(d => `${d.device_type}${d.device_brand ? ` ${d.device_brand}` : ''}${d.device_model ? ` ${d.device_model}` : ''}`.trim()).join(', ')}
                    </p>
                  ) : (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {s.device_type} {s.device_brand && `· ${s.device_brand}`} {s.device_model && `· ${s.device_model}`}
                    </p>
                  )}
                </div>

                {/* Progress tracker */}
                <div>
                  <div className="flex items-center justify-between text-[10px]">
                    {progressSteps.map((step, i) => {
                      const done = pct > 0 && pct >= (i + 1) * 33.33
                      return (
                        <span key={step} className={done ? 'font-semibold text-primary' : 'text-stone'}>
                          {done ? '✓ ' : ''}{step}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${s.status === 'dibatalkan' ? 'bg-danger' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {g.totalModal > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                    <p className="text-[10px] text-muted-foreground">Modal Sparepart</p>
                    <p className="text-[10px] font-mono font-medium text-muted-foreground">{formatRupiah(g.totalModal)}</p>
                  </div>
                )}

                {/* Total + date */}
                <div className="flex items-end justify-between gap-2 border-t border-hairline pt-2.5">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Biaya</p>
                    <p className="font-mono text-sm font-bold text-ink">{formatRupiah(g.totalFee)}</p>
                  </div>
                  <p className="text-[10px] text-stone">{new Date(s.date_in).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5">
                  <Link href={`/servis/${s.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="h-8 w-full gap-1 text-[11px]">
                      <Eye size={12} /> Detail
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex-1 gap-1 text-[11px]"
                    onClick={() => handleKirimNotif(s)}
                    disabled={sendingWA === s.id}
                  >
                    {sendingWA === s.id ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                    ) : (
                      <Send size={12} />
                    )}
                    Notif
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-9 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { setRestoreStock(false); setDeleteConfirm(g) }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Nota</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Customer</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Perangkat</th>
                    <th className="text-right p-3 text-xs font-medium text-ash uppercase tracking-wide">Total</th>
                    <th className="text-right p-3 text-xs font-medium text-ash uppercase tracking-wide">Modal Sparepart</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Status</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Tanggal</th>
                    <th className="text-center p-3 text-xs font-medium text-ash uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-xs text-stone">
                        Belum ada data servis
                      </td>
                    </tr>
                  ) : paginatedData.map(g => {
                    const s = g.representative
                    return (
                    <tr key={s.id} className="border-b border-hairline hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-mono font-semibold text-ink">{s.nota_number}</p>
                          {g.deviceCount > 1 && (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                              {g.deviceCount} perangkat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-xs font-semibold text-ink">{s.customer_name}</p>
                        <p className="text-[10px] text-stone mt-0.5">{s.customer_phone}</p>
                      </td>
                      <td className="p-3">
                        {g.deviceCount > 1 ? (
                          <>
                            <p className="text-xs font-semibold text-ink">{g.services.map(d => d.device_type).join(', ')}</p>
                            <p className="text-[10px] text-stone mt-0.5">
                              {g.services.map(d => `${d.device_brand || ''} ${d.device_model || ''}`.trim()).filter(Boolean).join(', ')}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-ink">{s.device_type}</p>
                            {s.device_brand && (
                              <p className="text-[10px] text-stone mt-0.5">{s.device_brand} {s.device_model}</p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <p className="text-xs font-bold text-ink font-mono">{formatRupiah(g.totalFee)}</p>
                      </td>
                      <td className="p-3 text-right">
                        {g.totalModal > 0 ? (
                          <p className="text-xs font-medium text-muted-foreground font-mono">{formatRupiah(g.totalModal)}</p>
                        ) : (
                          <p className="text-xs text-stone font-mono">-</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant={statusVariant(s.status)} className="text-[10px] px-2 py-0.5">
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <p className="text-[10px] text-stone">{new Date(s.date_in).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          <Link href={`/servis/${s.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye size={13} />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0"
                            onClick={() => handleKirimNotif(s)}
                            disabled={sendingWA === s.id}
                          >
                            {sendingWA === s.id ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                            ) : (
                              <Send size={13} />
                            )}
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { setRestoreStock(false); setDeleteConfirm(g) }}
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="shadow-card">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} dari {filtered.length} data
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  &laquo;
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  &raquo;
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Servis"
        description={
          <>
            Yakin ingin menghapus servis{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.representative.nota_number}</span>?
            {deleteConfirm && deleteConfirm.deviceCount > 1 && (
              <span className="block text-xs text-muted-foreground mt-1">
                Grup ini berisi {deleteConfirm.deviceCount} perangkat — semuanya akan dihapus.
              </span>
            )}
            {deleteConfirm && deleteConfirm.totalModal > 0 && (
              <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-surface p-3 text-left">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={e => setRestoreStock(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-xs text-foreground">
                  Kembalikan stok sparepart ke gudang
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    Sparepart yang dipakai servis ini ({formatRupiah(deleteConfirm.totalModal)} modal) akan
                    dikembalikan ke stok. Wajib dikonfirmasi — tidak otomatis.
                  </span>
                </span>
              </label>
            )}
            <span className="mt-3 block text-xs text-destructive">Data yang dihapus tidak dapat dikembalikan.</span>
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* WhatsApp Result Toast */}
      {waResult && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border p-4 shadow-elevated ${
          waResult.ok 
            ? 'border-badge-success/30 bg-badge-success/10' 
            : 'border-destructive/30 bg-destructive/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              waResult.ok ? 'bg-badge-success/20' : 'bg-destructive/20'
            }`}>
              {waResult.ok ? (
                <svg className="h-4 w-4 text-badge-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${waResult.ok ? 'text-badge-success' : 'text-destructive'}`}>
                {waResult.msg}
              </p>
            </div>
            <button 
              onClick={() => setWaResult(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showForm && <ServisForm onClose={() => setShowForm(false)} onSaved={fetchServices} prefillCustomerId={prefillCustomerId} prefillNama={prefillNama} prefillPhone={prefillPhone} />}
    </div>
  )
}

function ServisForm({ onClose, onSaved, prefillCustomerId, prefillNama, prefillPhone }: { onClose: () => void; onSaved: () => void; prefillCustomerId?: string; prefillNama?: string; prefillPhone?: string }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spareparts, setSpareparts] = useState<Product[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(prefillCustomerId || null)
  const [devices, setDevices] = useState<DeviceEntryData[]>([
    { device_type: 'Laptop', device_brand: '', device_model: '', kelengkapan: '', complaint: '', notes: '', service_fee: 0, items: [] },
  ])
  const [form, setForm] = useState({
    customer_name: prefillNama || '', customer_phone: prefillPhone || '',
    dp_amount: 0, garansi: 'Tanpa Garansi',
  })

  // Aggregate totals across all devices
  const totalPartsFee = devices.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.price * i.quantity, 0), 0)
  const totalPartsModal = devices.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.buy_price * i.quantity, 0), 0)
  const totalServiceFee = devices.reduce((sum, d) => sum + d.service_fee, 0)
  const grandTotal = totalServiceFee + totalPartsFee
  const sisa = grandTotal - form.dp_amount
  const totalSparepartCount = devices.reduce((sum, d) => sum + d.items.length, 0)
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  // Hitung tanggal berakhir garansi dari input manual
  function hitungWarrantyEnd(): string | null {
    const input = form.garansi.trim().toLowerCase()
    if (!input || input === 'tanpa garansi') return null

    const now = new Date()
    // Pattern: angka + satuan (hari/minggu/bulan)
    const match = input.match(/(\d+)\s*(hari|minggu|bulan|hari|mgg|bln)/i)
    if (!match) return null

    const angka = parseInt(match[1])
    const satuan = match[2].toLowerCase()

    if (satuan === 'hari') {
      now.setDate(now.getDate() + angka)
    } else if (satuan === 'minggu' || satuan === 'mgg') {
      now.setDate(now.getDate() + (angka * 7))
    } else if (satuan === 'bulan' || satuan === 'bln') {
      now.setMonth(now.getMonth() + angka)
    }

    return now.toISOString()
  }

  // Fetch sparepart dari stok
  const fetchSpareparts = useCallback(async () => {
    try {
      const { data: cat } = await supabase.from('categories').select('id').eq('name', 'Sparepart').maybeSingle()
      if (!cat) return
      const { data } = await supabase.from('products').select('*').eq('category_id', cat.id).gt('quantity', 0).order('name')
      setSpareparts(data || [])
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchSpareparts() }, [fetchSpareparts])

  // Tambah perangkat baru
  function addDevice() {
    setDevices([...devices, { device_type: 'Laptop', device_brand: '', device_model: '', kelengkapan: '', complaint: '', notes: '', service_fee: 0, items: [] }])
  }

  // Update data perangkat
  function updateDevice(index: number, data: DeviceEntryData) {
    const updated = [...devices]
    updated[index] = data
    setDevices(updated)
  }

  // Hapus perangkat
  function removeDevice(index: number) {
    setDevices(devices.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Find or create customer
      let customerId = selectedCustomerId
      if (!customerId && form.customer_phone) {
        const customer = await findOrCreateCustomer(form.customer_name, form.customer_phone)
        customerId = customer?.id || null
      }

      const warrantyEnd = hitungWarrantyEnd()
      const createdServiceIds: string[] = []

      // Buat satu service record per perangkat
      for (let i = 0; i < devices.length; i++) {
        const d = devices[i]
        const devicePartsFee = d.items.reduce((s, item) => s + item.price * item.quantity, 0)
        const deviceTotal = d.service_fee + devicePartsFee

        // DP hanya ditaruh di perangkat pertama
        const deviceDp = i === 0 ? form.dp_amount : 0

        const { data: service, error: serviceError } = await supabase.from('services').insert({
          customer_id: customerId,
          customer_name: form.customer_name, customer_phone: form.customer_phone,
          device_type: d.device_type, device_brand: d.device_brand || null,
          device_model: d.device_model || null, complaint: d.complaint || null,
          kelengkapan: d.kelengkapan || null,
          service_fee: d.service_fee, parts_fee: devicePartsFee,
          total_fee: deviceTotal, dp_amount: deviceDp,
          garansi: form.garansi, warranty_end_date: warrantyEnd,
          notes: d.notes || null,
          status: 'proses', created_by: user?.id,
        }).select('id').single()
        if (serviceError) throw serviceError
        createdServiceIds.push(service.id)

        // Simpan sparepart secara ATOMIK via RPC
        const itemsPayload = d.items
          .filter(item => item.product_id && item.quantity > 0)
          .map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            buy_price: item.buy_price,
          }))

        if (itemsPayload.length > 0) {
          const { error: partsError } = await supabase.rpc('save_service_parts', {
            p_service_id: service.id,
            p_items: itemsPayload,
            p_created_by: user?.id,
          })
          if (partsError) {
            // Rollback: hapus semua servis yang sudah dibuat
            await Promise.all(createdServiceIds.map(id => supabase.from('services').delete().eq('id', id)))
            throw partsError
          }
        }
      }

      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Servis Baru" onClose={onClose} maxWidth="2xl">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: Data Customer */}
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-1 rounded-full bg-[#04123F]" />
          <h3 className="text-sm font-bold text-[#04123F]">Data Customer</h3>
        </div>
        <CustomerAutocomplete
          nama={form.customer_name}
          noWa={form.customer_phone}
          onNamaChange={val => setForm({ ...form, customer_name: val })}
          onNoWaChange={val => setForm({ ...form, customer_phone: val })}
          onCustomerSelect={customer => {
            setSelectedCustomerId(customer.id)
            setForm({ ...form, customer_name: customer.nama, customer_phone: customer.no_wa })
          }}
        />

        {/* Section: Detail Perangkat */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="h-6 w-1 rounded-full bg-[#04123F]" />
          <h3 className="text-sm font-bold text-[#04123F]">Detail Perangkat</h3>
        </div>
        <div className="space-y-3">
          {devices.map((device, i) => (
            <DeviceEntry
              key={i}
              index={i}
              data={device}
              spareparts={spareparts}
              formatRupiah={formatRupiah}
              onChange={data => updateDevice(i, data)}
              onRemove={() => removeDevice(i)}
              canRemove={devices.length > 1}
            />
          ))}
          <Button type="button" variant="secondary" onClick={addDevice} className="h-10 w-full gap-2 text-sm">
            <Plus size={16} /> Tambah Perangkat
          </Button>
        </div>

        {/* Section: Pembayaran & Garansi */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="h-6 w-1 rounded-full bg-[#04123F]" />
          <h3 className="text-sm font-bold text-[#04123F]">Pembayaran & Garansi</h3>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            DP / Uang Muka (Rp)
          </label>
          <RupiahInput value={form.dp_amount} onChange={v => setForm({ ...form, dp_amount: v })} className="h-10 w-full font-mono" />
        </div>

        {/* Garansi */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Garansi</label>
          <Input type="text" value={form.garansi} onChange={e => setForm({ ...form, garansi: e.target.value })} className="h-10 w-full" placeholder="Contoh: 7 Hari, 2 Minggu, 1 Bulan, Tanpa Garansi" />
          {form.garansi && form.garansi.toLowerCase() !== 'tanpa garansi' && hitungWarrantyEnd() && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Garansi berlaku hingga: {new Date(hitungWarrantyEnd() || '').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Section: Ringkasan Biaya */}
        <div className="flex items-center gap-2.5 pt-1">
          <div className="h-6 w-1 rounded-full bg-[#FEC40B]" />
          <h3 className="text-sm font-bold text-[#04123F]">Ringkasan Biaya</h3>
        </div>
        <div className="rounded-xl border border-[#04123F]/10 bg-[#04123F]/[0.03] p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Biaya Sparepart ({totalSparepartCount} item · {devices.length} perangkat)</span>
              <span className="font-mono">{formatRupiah(totalPartsFee)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Modal Sparepart (HPP)</span>
              <span className="font-mono">{formatRupiah(totalPartsModal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Biaya Jasa</span>
              <span className="font-mono">{formatRupiah(totalServiceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-[#04123F]/10 pt-2">
              <span className="font-bold text-[#04123F]">Total Biaya</span>
              <span className="font-mono text-lg font-bold text-[#04123F]">{formatRupiah(grandTotal)}</span>
            </div>
            {form.dp_amount > 0 && (
              <>
                <div className="flex justify-between text-badge-success">
                  <span>DP / Uang Muka</span>
                  <span className="font-mono">- {formatRupiah(form.dp_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-[#04123F]/10 pt-2">
                  <span className="font-bold text-[#04123F]">Sisa Pembayaran</span>
                  <span className="font-mono text-lg font-bold text-[#04123F]">{formatRupiah(sisa)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-[#04123F]/10 pt-4 sm:flex-row">
          <Button type="button" onClick={onClose} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
          <Button type="submit" disabled={loading} className="h-11 w-full sm:flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menyimpan...
              </span>
            ) : 'Simpan Servis'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
