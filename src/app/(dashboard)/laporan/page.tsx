'use client'

import { useEffect, useState } from 'react'
import { fetchFinanceData } from '@/lib/finance'
import { Wrench, ShoppingCart, TrendingDown, DollarSign, Users, Calendar, Package, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/dashboard/PageHeader'
import KpiCard from '@/components/laporan/KpiCard'
import DailyChart from '@/components/laporan/DailyChart'
import DailyTable, { DailyRow } from '@/components/laporan/DailyTable'
import { Modal } from '@/components/ui/modal'
import RincianLabaRugi from '@/components/laporan/RincianLabaRugi'
import Reveal from '@/components/laporan/Reveal'
import { pctDelta } from '@/lib/trend'

interface LaporanData {
  omzetServis: number; omzetPenjualan: number; marginUnit: number;
  biayaOperasional: number; pembelianSparepart: number; labaBersih: number;
  totalTransaksiServis: number; totalTransaksiUnit: number;
}

interface ServiceDetail {
  id: string; nota_number: string; customer_name: string; device_type: string;
  device_brand: string | null; service_fee: number; parts_fee: number; total_fee: number;
  status: string; date_in: string;
}

interface SaleDetail {
  id: string; invoice_number: string; buyer_name: string; product_id: string | null;
  product_name: string; item_type: string; quantity: number; sell_price: number; buy_price: number; margin: number;
  status: string; date: string;
}

interface TopCustomer {
  name: string; total: number; count: number;
}

export default function LaporanPage() {
  const [data, setData] = useState<LaporanData>({ omzetServis: 0, omzetPenjualan: 0, marginUnit: 0, biayaOperasional: 0, pembelianSparepart: 0, labaBersih: 0, totalTransaksiServis: 0, totalTransaksiUnit: 0 })
  const [deltas, setDeltas] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState(() => { const now = new Date(); return { month: now.getMonth() + 1, year: now.getFullYear() } })
  const [services, setServices] = useState<ServiceDetail[]>([])
  const [sales, setSales] = useState<SaleDetail[]>([])
  const [dailySummary, setDailySummary] = useState<DailyRow[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [activeTab, setActiveTab] = useState<'servis' | 'unit' | 'harian' | 'customer'>('harian')
  const [search, setSearch] = useState('')
  const [detailSale, setDetailSale] = useState<SaleDetail | null>(null)
  const [detailDay, setDetailDay] = useState<string | null>(null)

  useEffect(() => { fetchLaporan() }, [filterMonth])

  async function fetchLaporan() {
    try {
      const prev = filterMonth.month === 1
        ? { month: 12, year: filterMonth.year - 1 }
        : { month: filterMonth.month - 1, year: filterMonth.year }

      const [cur, prevRes] = await Promise.all([
        fetchFinanceData({ year: filterMonth.year, month: filterMonth.month }),
        fetchFinanceData(prev),
      ])
      const { summary, services: servisData, sales: salesData, purchases } = cur

      setData({
        omzetServis: summary.omzetServis,
        omzetPenjualan: summary.omzetPenjualan,
        marginUnit: summary.marginUnit,
        biayaOperasional: summary.biayaOperasional,
        pembelianSparepart: summary.pembelianSparepart,
        labaBersih: summary.labaBersih,
        totalTransaksiServis: summary.totalTransaksiServis,
        totalTransaksiUnit: summary.totalTransaksiUnit,
      })

      const ps = prevRes.summary
      setDeltas({
        omzetServis: pctDelta(summary.omzetServis, ps.omzetServis),
        omzetPenjualan: pctDelta(summary.omzetPenjualan, ps.omzetPenjualan),
        biaya: pctDelta(summary.biayaOperasional, ps.biayaOperasional),
        laba: pctDelta(summary.labaBersih, ps.labaBersih),
      })

      setServices(servisData || [])
      setSales(salesData || [])

      // Rekap harian: omzet, margin unit, pembelian sparepart, dan profit per hari
      const dailyMap: Record<string, DailyRow> = {}
      const addDay = (day: string) => {
        if (!dailyMap[day]) dailyMap[day] = { date: day, omzetServis: 0, omzetUnit: 0, marginUnit: 0, pembelianSparepart: 0, profit: 0, countServis: 0, countUnit: 0 }
      }
      servisData?.forEach(s => {
        const day = new Date(s.date_in).toISOString().split('T')[0]
        addDay(day)
        if (s.status === 'selesai') {
          dailyMap[day].omzetServis += s.total_fee
          dailyMap[day].countServis++
        }
      })
      salesData?.forEach(s => {
        const day = new Date(s.date).toISOString().split('T')[0]
        addDay(day)
        if (s.status === 'completed') {
          dailyMap[day].omzetUnit += s.sell_price
          dailyMap[day].marginUnit += s.margin ?? (s.sell_price || 0) - (s.buy_price || 0)
          dailyMap[day].countUnit++
        }
      })
      purchases?.forEach(p => {
        const day = (p.purchase_date || '').slice(0, 10)
        addDay(day)
        dailyMap[day].pembelianSparepart += (p.quantity || 0) * (p.buy_price || 0)
      })
      const daily = Object.values(dailyMap)
      daily.forEach(d => { d.profit = d.omzetServis + d.marginUnit - d.pembelianSparepart })
      setDailySummary(daily.sort((a, b) => b.date.localeCompare(a.date)))

      // Top customers
      const customerMap: Record<string, TopCustomer> = {}
      servisData?.forEach(s => {
        if (!customerMap[s.customer_name]) customerMap[s.customer_name] = { name: s.customer_name, total: 0, count: 0 }
        if (s.status === 'selesai') {
          customerMap[s.customer_name].total += s.total_fee
          customerMap[s.customer_name].count++
        }
      })
      salesData?.forEach(s => {
        if (!customerMap[s.buyer_name]) customerMap[s.buyer_name] = { name: s.buyer_name, total: 0, count: 0 }
        if (s.status === 'completed') {
          customerMap[s.buyer_name].total += s.sell_price
          customerMap[s.buyer_name].count++
        }
      })
      setTopCustomers(Object.values(customerMap).sort((a, b) => b.total - a.total).slice(0, 10))

    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const statusVariant = (status: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      selesai: 'success', completed: 'success', proses: 'warning', returned: 'destructive', cancelled: 'destructive', dibatalkan: 'destructive',
    }
    return map[status] || 'secondary'
  }

  const periodLabel = `${months[filterMonth.month - 1]} ${filterMonth.year}`
  const chartData = [...dailySummary].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    date: d.date,
    omzet: d.omzetServis + d.omzetUnit,
    profit: d.profit,
  }))

  // Breakdown laba rugi untuk segmented bar mobile (ala analytics-dashboard)
  const segments = [
    { label: 'Omzet Servis', value: data.omzetServis, color: 'bg-badge-success' },
    { label: 'Margin Unit', value: data.marginUnit, color: 'bg-badge-info' },
    { label: 'Pembelian Sparepart', value: data.pembelianSparepart, color: 'bg-badge-warning' },
    { label: 'Biaya Operasional', value: data.biayaOperasional, color: 'bg-danger' },
  ]
  const segmentTotal = Math.max(segments.reduce((sum, s) => sum + Math.abs(s.value), 0), 1)

  const currentIdx = new Date().getFullYear() * 12 + new Date().getMonth()
  const filterIdx = filterMonth.year * 12 + (filterMonth.month - 1)
  const isNextDisabled = filterIdx >= currentIdx

  const prevMonth = () => setFilterMonth(m => (m.month === 1 ? { month: 12, year: m.year - 1 } : { month: m.month - 1, year: m.year }))
  const nextMonth = () => setFilterMonth(m => (m.month === 12 ? { month: 1, year: m.year + 1 } : { month: m.month + 1, year: m.year }))

  const q = search.trim().toLowerCase()
  const filteredServices = q
    ? services.filter(s => `${s.nota_number} ${s.customer_name} ${s.device_brand ?? ''} ${s.device_type}`.toLowerCase().includes(q))
    : services
  const filteredSales = q
    ? sales.filter(s => `${s.invoice_number} ${s.buyer_name} ${s.product_name ?? ''}`.toLowerCase().includes(q))
    : sales

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-[#04123F] text-white shadow-sm'
        : 'bg-white text-gray-500 border border-hairline hover:bg-gray-50 hover:text-gray-900'
    }`

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Reveal>
        <PageHeader
          title="Laporan Keuangan"
          subtitle="Rincian lengkap laba rugi dan transaksi"
        >
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterMonth.month}
              onChange={e => setFilterMonth({ ...filterMonth, month: Number(e.target.value) })}
              className="flex-1 sm:flex-none h-10 rounded-lg border border-hairline-strong bg-surface px-3 text-sm"
            >
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={filterMonth.year}
              onChange={e => setFilterMonth({ ...filterMonth, year: Number(e.target.value) })}
              className="flex-1 sm:flex-none h-10 rounded-lg border border-hairline-strong bg-surface px-3 text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </PageHeader>
      </Reveal>

      {/* Hero mobile: Laba Bersih — Navy Premium */}
      <div className="lg:hidden">
        <div className="overflow-hidden rounded-2xl bg-[#04123F] shadow-card">
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">Laba Bersih</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevMonth}
                  aria-label="Bulan sebelumnya"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[96px] text-center text-xs font-semibold text-white">{periodLabel}</span>
                <button
                  onClick={nextMonth}
                  disabled={isNextDisabled}
                  aria-label="Bulan berikutnya"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className={`mt-2 text-2xl font-extrabold tabular-nums ${data.labaBersih >= 0 ? 'text-[#FEC40B]' : 'text-red-400'}`}>
              {formatRupiah(data.labaBersih)}
            </p>
            <p className="mt-1 text-xs text-white/50">
              Omzet {formatRupiah(data.omzetServis + data.omzetPenjualan)} · {data.totalTransaksiServis + data.totalTransaksiUnit} transaksi
            </p>
            <div className="mt-4">
              <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                {segments.map(s => (
                  <div
                    key={s.label}
                    className={`${s.color} ${s.value === 0 ? 'hidden' : ''}`}
                    style={{ width: `${(Math.abs(s.value) / segmentTotal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {segments.map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] text-white/50">{s.label}</p>
                      <p className="truncate text-[11px] font-semibold tabular-nums text-white">{formatRupiah(s.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Reveal delay={60}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            title="Omzet Servis"
            value={data.omzetServis}
            sub={`${data.totalTransaksiServis} transaksi`}
            icon={Wrench}
            tone="emerald"
            delta={deltas.omzetServis ?? null}
          />
          <KpiCard
            title="Omzet Penjualan"
            value={data.omzetPenjualan}
            sub={`${data.totalTransaksiUnit} unit terjual`}
            icon={ShoppingCart}
            tone="primary"
            delta={deltas.omzetPenjualan ?? null}
          />
          <KpiCard
            title="Biaya Operasional"
            value={data.biayaOperasional}
            icon={TrendingDown}
            tone="orange"
            delta={deltas.biaya ?? null}
            invertDelta
          />
          <KpiCard
            title="Laba Bersih"
            value={data.labaBersih}
            icon={DollarSign}
            tone={data.labaBersih >= 0 ? 'emerald' : 'danger'}
            delta={deltas.laba ?? null}
          />
        </div>
      </Reveal>

      {/* Produk Terjual */}
      <Reveal delay={120}>
        <Card className="shadow-card">
          <CardContent className="p-0 sm:p-0">
            {sales.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-ink">Produk Terjual</p>
                <p className="mt-1 text-xs text-muted-foreground">Belum ada produk terjual di {periodLabel}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-4 pt-4">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-badge-info/15 text-badge-info">
                    <Package className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Produk Terjual</h2>
                    <p className="text-[10px] text-muted-foreground">{sales.length} transaksi di {periodLabel}</p>
                  </div>
                </div>
                {/* Mobile */}
                <div className="mt-3 divide-y divide-hairline lg:hidden">
                  {filteredSales.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-badge-info/15 text-badge-info">
                        <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-ink">{s.product_name || 'Produk'}</p>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <Badge variant={s.item_type === 'sparepart' ? 'success' : 'secondary'}>{s.item_type === 'sparepart' ? 'Sparepart' : 'Unit'}</Badge>
                            <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">#{s.invoice_number} · {s.buyer_name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className={`text-sm font-bold tabular-nums ${s.margin >= 0 ? 'text-badge-success' : 'text-danger'}`}>{formatRupiah(s.margin)}</p>
                        <p className="text-[10px] text-muted-foreground">Beli {formatRupiah(s.buy_price)} · Jual {formatRupiah(s.sell_price)}</p>
                        <button onClick={() => setDetailSale(s)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors">
                          <Eye size={11} /> Detail
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredSales.length === 0 && (
                    <p className="p-4 text-center text-xs text-muted-foreground">Tidak ada transaksi ditemukan</p>
                  )}
                </div>
                {/* Desktop */}
                <div className="mt-3 hidden lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-hairline bg-[#04123F]/[0.02] text-left text-xs text-gray-500">
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Produk</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Invoice</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Pembeli</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Margin</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide whitespace-nowrap">Tanggal</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wide text-center">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {sales.map((s) => (
                        <tr key={s.id} className="transition-colors hover:bg-[#04123F]/[0.02]">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{s.product_name || 'Produk'}</span>
                            <Badge variant={s.item_type === 'sparepart' ? 'success' : 'secondary'} className="ml-2 text-[10px]">{s.item_type === 'sparepart' ? 'Sparepart' : 'Unit'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono">#{s.invoice_number}</td>
                          <td className="px-4 py-3 text-gray-700">{s.buyer_name}</td>
                          <td className={`px-4 py-3 text-right font-semibold font-mono ${s.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(s.margin)}</td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(s.status)}>{s.status}</Badge></td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => setDetailSale(s)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                              <Eye size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* Tren Harian */}
      <Reveal delay={180}>
        {chartData.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted-foreground">Belum ada transaksi di {periodLabel}</p>
            </CardContent>
          </Card>
        ) : (
          <DailyChart
            data={chartData}
            title="Tren Omzet & Profit Harian"
            subtitle={`Omzet vs profit per tanggal — ${periodLabel}`}
          />
        )}
      </Reveal>

      {/* Rincian Laba Rugi */}
      <Reveal delay={240}>
        <RincianLabaRugi
          periodLabel={periodLabel}
          labaBersih={data.labaBersih}
          rows={[
            { label: '(+) Omzet Servis', value: data.omzetServis, kind: 'in' },
            { label: '(+) Margin Penjualan Unit', value: data.marginUnit, kind: 'in' },
            { label: '(-) Pembelian Sparepart', value: data.pembelianSparepart, kind: 'out' },
            { label: '(-) Biaya Operasional', value: data.biayaOperasional, kind: 'out' },
          ]}
        />
      </Reveal>

      {/* Search transaksi (mobile) */}
      <Reveal delay={280}>
        <div className="relative lg:hidden">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari transaksi…"
            className="h-11 w-full rounded-xl border border-hairline-strong bg-surface pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
      </Reveal>

      {/* Tabs Detail Transaksi */}
      <Reveal delay={300}>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button onClick={() => setActiveTab('servis')} className={tabClass(activeTab === 'servis')}>
            <Wrench size={14} /> Servis ({services.length})
          </button>
          <button onClick={() => setActiveTab('unit')} className={tabClass(activeTab === 'unit')}>
            <ShoppingCart size={14} /> Unit ({sales.length})
          </button>
          <button onClick={() => setActiveTab('harian')} className={tabClass(activeTab === 'harian')}>
            <Calendar size={14} /> Harian
          </button>
          <button onClick={() => setActiveTab('customer')} className={tabClass(activeTab === 'customer')}>
            <Users size={14} /> Customer
          </button>
        </div>
      </Reveal>

      {activeTab === 'servis' && (
        <Reveal delay={300}>
          <Card className="shadow-card">
            <CardContent className="p-0 sm:p-0">
              {services.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada transaksi servis di {periodLabel}</p>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="divide-y divide-hairline md:hidden">
                    {filteredServices.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-badge-success/15 text-badge-success">
                          <Wrench className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-foreground">#{s.nota_number}</p>
                            <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.customer_name} · {s.device_brand ? `${s.device_brand} - ` : ''}{s.device_type}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(s.date_in).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold tabular-nums">{formatRupiah(s.total_fee)}</p>
                          <p className="text-[10px] text-muted-foreground">Jasa {formatRupiah(s.service_fee)} · Sparepart {formatRupiah(s.parts_fee)}</p>
                        </div>
                      </div>
                    ))}
                    {filteredServices.length === 0 && (
                      <p className="p-4 text-center text-xs text-muted-foreground">Tidak ada transaksi ditemukan</p>
                    )}
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-[#04123F]/[0.02] text-left text-xs text-gray-500">
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Nota</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Customer</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Perangkat</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Jasa</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Sparepart</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Total</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {services.map((s) => (
                          <tr key={s.id} className="transition-colors hover:bg-[#04123F]/[0.02]">
                            <td className="px-4 py-3 font-medium font-mono text-gray-900">#{s.nota_number}</td>
                            <td className="px-4 py-3 text-gray-700">{s.customer_name}</td>
                            <td className="px-4 py-3 text-gray-500">{s.device_brand ? `${s.device_brand} - ` : ''}{s.device_type}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">{formatRupiah(s.service_fee)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">{formatRupiah(s.parts_fee)}</td>
                            <td className="px-4 py-3 text-right font-semibold font-mono text-gray-900">{formatRupiah(s.total_fee)}</td>
                            <td className="px-4 py-3"><Badge variant={statusVariant(s.status)}>{s.status}</Badge></td>
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.date_in).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {activeTab === 'unit' && (
        <Reveal delay={300}>
          <Card className="shadow-card">
            <CardContent className="p-0 sm:p-0">
              {sales.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada transaksi unit di {periodLabel}</p>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="divide-y divide-hairline md:hidden">
                    {filteredSales.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-3">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-badge-info/15 text-badge-info">
                          <ShoppingCart className="h-5 w-5" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm text-foreground">#{s.invoice_number}</p>
                            <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.buyer_name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-bold tabular-nums ${s.margin >= 0 ? 'text-badge-success' : 'text-danger'}`}>{formatRupiah(s.margin)}</p>
                          <p className="text-[10px] text-muted-foreground">Beli {formatRupiah(s.buy_price)} · Jual {formatRupiah(s.sell_price)}</p>
                        </div>
                      </div>
                    ))}
                    {filteredSales.length === 0 && (
                      <p className="p-4 text-center text-xs text-muted-foreground">Tidak ada transaksi ditemukan</p>
                    )}
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-[#04123F]/[0.02] text-left text-xs text-gray-500">
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Invoice</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Pembeli</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Harga Beli</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Harga Jual</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Margin</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {sales.map((s) => (
                          <tr key={s.id} className="transition-colors hover:bg-[#04123F]/[0.02]">
                            <td className="px-4 py-3 font-medium font-mono text-gray-900">#{s.invoice_number}</td>
                            <td className="px-4 py-3 text-gray-700">{s.buyer_name}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-500">{formatRupiah(s.buy_price)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">{formatRupiah(s.sell_price)}</td>
                            <td className={`px-4 py-3 text-right font-semibold font-mono ${s.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(s.margin)}</td>
                            <td className="px-4 py-3"><Badge variant={statusVariant(s.status)}>{s.status}</Badge></td>
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {activeTab === 'harian' && (
        <Reveal delay={300}>
          <DailyTable rows={dailySummary} onDayClick={setDetailDay} />
        </Reveal>
      )}

      {activeTab === 'customer' && (
        <Reveal delay={300}>
          <Card className="shadow-card">
            <CardContent className="p-0 sm:p-0">
              {topCustomers.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Belum ada customer di {periodLabel}</p>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="divide-y divide-hairline md:hidden">
                    {topCustomers.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-3 p-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-badge-success/15 text-badge-success' : 'bg-secondary text-muted-foreground'}`}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.count} transaksi</p>
                        </div>
                        <span className="text-sm font-semibold">{formatRupiah(c.total)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-hairline bg-[#04123F]/[0.02] text-left text-xs text-gray-500">
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">#</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide">Nama</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Jumlah Transaksi</th>
                          <th className="px-4 py-3 font-semibold uppercase tracking-wide text-right">Total Belanja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {topCustomers.map((c, i) => (
                          <tr key={c.name} className="transition-colors hover:bg-[#04123F]/[0.02]">
                            <td className="px-4 py-3">
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? 'bg-[#FEC40B]/20 text-[#04123F]' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{c.count}×</td>
                            <td className="px-4 py-3 text-right font-semibold font-mono text-gray-900">{formatRupiah(c.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Detail Modal — Modern */}
      {detailSale && (
        <Modal title={`Detail Transaksi`} onClose={() => setDetailSale(null)} maxWidth="md">
          <div className="space-y-4">
            {/* Info Section */}
            <div className="rounded-2xl border border-hairline bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">No. Invoice</span>
                <span className="text-xs font-semibold text-gray-900 font-mono">#{detailSale.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Tanggal</span>
                <span className="text-xs font-semibold text-gray-900">{new Date(detailSale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Tipe</span>
                <Badge variant={detailSale.item_type === 'sparepart' ? 'success' : 'secondary'} className="text-[10px]">{detailSale.item_type === 'sparepart' ? 'Sparepart' : 'Unit'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <Badge variant={statusVariant(detailSale.status)} className="text-[10px]">{detailSale.status}</Badge>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="mb-2 text-xs font-bold text-gray-900">Produk</h4>
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-sm font-semibold text-gray-900">{detailSale.product_name || 'Produk'}</p>
              </div>
            </div>

            {/* Buyer */}
            <div className="rounded-2xl border border-hairline bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Pembeli</span>
                <span className="text-xs font-semibold text-gray-900">{detailSale.buyer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Quantity</span>
                <span className="text-xs font-semibold text-gray-900">{detailSale.quantity}</span>
              </div>
            </div>

            {/* Price breakdown — Navy + Gold */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-hairline bg-white p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Beli</p>
                <p className="mt-1 text-xs font-semibold text-gray-900 font-mono break-words">{formatRupiah(detailSale.buy_price)}</p>
              </div>
              <div className="rounded-xl border border-hairline bg-white p-3 text-center">
                <p className="text-[10px] text-gray-400 uppercase">Jual</p>
                <p className="mt-1 text-xs font-semibold text-gray-900 font-mono break-words">{formatRupiah(detailSale.sell_price)}</p>
              </div>
              <div className="rounded-xl bg-[#04123F] p-3 text-center">
                <p className="text-[10px] text-white/50 uppercase">Margin</p>
                <p className={`mt-1 text-xs font-bold font-mono break-words ${detailSale.margin >= 0 ? 'text-[#FEC40B]' : 'text-red-400'}`}>{formatRupiah(detailSale.margin)}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Hari Modal */}
      {detailDay && (() => {
        const dayServices = services.filter(s => {
          const day = new Date(s.date_in).toISOString().split('T')[0]
          return day === detailDay && s.status === 'selesai'
        })
        const daySales = sales.filter(s => {
          const day = new Date(s.date).toISOString().split('T')[0]
          return day === detailDay && s.status === 'completed'
        })
        const dayDate = new Date(`${detailDay}T00:00:00`)
        const dayLabel = dayDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const dayProfit = dayServices.reduce((sum, s) => sum + s.total_fee, 0) + daySales.reduce((sum, s) => sum + s.margin, 0)

        return (
          <Modal title={`Detail Harian — ${dayLabel}`} onClose={() => setDetailDay(null)} maxWidth="lg">
            <div className="space-y-4">
              {/* Profit bar — Navy + Gold */}
              <div className="flex items-center justify-between rounded-2xl bg-[#04123F] px-4 py-3">
                <span className="text-xs font-medium text-white/70">Profit Hari Ini</span>
                <span className={`text-lg font-bold font-mono ${dayProfit >= 0 ? 'text-[#FEC40B]' : 'text-red-400'}`}>{formatRupiah(dayProfit)}</span>
              </div>

              {dayServices.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Wrench size={14} className="text-gray-400" />
                    Servis ({dayServices.length})
                  </h4>
                  <div className="space-y-2">
                    {dayServices.map(s => (
                      <div key={s.id} className="rounded-xl border border-hairline bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.customer_name} — {s.device_type}</p>
                            <p className="text-[11px] text-gray-400 font-mono">#{s.nota_number}</p>
                          </div>
                          <p className="shrink-0 pl-3 text-sm font-bold font-mono text-emerald-600">{formatRupiah(s.total_fee)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {daySales.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <ShoppingCart size={14} className="text-gray-400" />
                    Penjualan ({daySales.length})
                  </h4>
                  <div className="space-y-2">
                    {daySales.map(s => (
                      <div key={s.id} className="rounded-xl border border-hairline bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{s.product_name || 'Produk'} — {s.buyer_name}</p>
                            <p className="text-[11px] text-gray-400 font-mono">#{s.invoice_number}</p>
                          </div>
                          <div className="shrink-0 pl-3 text-right">
                            <p className={`text-sm font-bold font-mono ${s.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatRupiah(s.margin)}</p>
                            <p className="text-[10px] text-gray-400">Beli {formatRupiah(s.buy_price)} · Jual {formatRupiah(s.sell_price)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dayServices.length === 0 && daySales.length === 0 && (
                <p className="text-center text-sm text-gray-400">Tidak ada transaksi di hari ini</p>
              )}
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
