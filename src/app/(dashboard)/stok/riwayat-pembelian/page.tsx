'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Search, ShoppingCart, Package, DollarSign, Eye, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/dashboard/PageHeader'
import { Modal } from '@/components/ui/modal'

interface Purchase {
  id: string
  name: string
  quantity: number
  buy_price: number
  total: number
  source_type: string
  source_name: string | null
  source_phone: string | null
  purchase_date: string
  notes: string | null
  created_at: string
  products?: { name: string; category_id: string } | null
}

export default function RiwayatPembelianPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null)
  const itemsPerPage = 10

  const fetchPurchases = useCallback(async () => {
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDate = `${filterMonth}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('sparepart_purchases')
        .select('*, products(name, category_id)')
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)
        .order('purchase_date', { ascending: false })
      if (error) throw error
      setPurchases(data || [])
      setCurrentPage(1)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filterMonth])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const filtered = search.trim()
    ? purchases.filter(p => `${p.name} ${p.source_name || ''} ${p.notes || ''}`.toLowerCase().includes(search.toLowerCase()))
    : purchases

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalAmount = purchases.reduce((sum, p) => sum + p.total, 0)
  const totalQty = purchases.reduce((sum, p) => sum + p.quantity, 0)
  const uniqueProducts = new Set(purchases.map(p => p.products?.name || p.name)).size

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const [year, month] = filterMonth.split('-').map(Number)
  const periodLabel = `${months[month - 1]} ${year}`

  const summaryCards = [
    { label: 'Total Pembelian', value: purchases.length, icon: ShoppingCart, color: 'text-badge-info' },
    { label: 'Total Qty', value: totalQty, icon: Package, color: 'text-badge-success' },
    { label: 'Total Pengeluaran', value: formatRupiah(totalAmount), icon: DollarSign, color: 'text-badge-warning' },
    { label: 'Produk Unik', value: uniqueProducts, icon: Package, color: 'text-badge-info' },
  ]

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHeader title="Riwayat Pembelian" subtitle="Daftar pembelian sparepart dari supplier">
        <Link href="/stok/riwayat-kwitansi">
          <Button variant="ghost" className="gap-1.5 h-10 text-xs sm:text-sm text-muted-foreground">
            <FileText size={14} />
            Riwayat Kwitansi
          </Button>
        </Link>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={month}
            onChange={e => setFilterMonth(`${year}-${e.target.value.padStart(2, '0')}`)}
            className="flex-1 sm:flex-none h-10 rounded-lg border border-hairline-strong bg-surface px-3 text-sm"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setFilterMonth(`${e.target.value}-${String(month).padStart(2, '0')}`)}
            className="flex-1 sm:flex-none h-10 rounded-lg border border-hairline-strong bg-surface px-3 text-sm"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="shadow-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className={`grid h-9 w-9 place-items-center rounded-lg bg-secondary/50 ${card.color}`}>
                  <card.icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold text-ink truncate">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Cari produk, supplier, catatan…"
          className="h-11 w-full rounded-xl border border-hairline-strong bg-surface pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      {/* Mobile Cards */}
      <div className="block divide-y divide-hairline rounded-xl border border-hairline bg-surface-card shadow-card lg:hidden">
        {paginated.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada pembelian di {periodLabel}</div>
        ) : paginated.map(p => (
          <div key={p.id} onClick={() => setDetailPurchase(p)} className="p-3 space-y-2 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink truncate">{p.products?.name || p.name}</p>
              <p className="shrink-0 pl-2 text-sm font-bold text-badge-warning">{formatRupiah(p.total)}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{p.quantity}× {formatRupiah(p.buy_price)}</span>
              <span>·</span>
              <span>{new Date(p.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              {p.source_name && <><span>·</span><span>{p.source_name}</span></>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-hairline bg-surface-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-secondary/30 text-left text-xs text-ash">
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Produk</th>
              <th className="px-4 py-2.5 font-medium text-center">Qty</th>
              <th className="px-4 py-2.5 font-medium text-right">Harga Beli</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Sumber</th>
              <th className="px-4 py-2.5 font-medium text-center">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">Belum ada pembelian di {periodLabel}</td></tr>
            ) : paginated.map(p => (
              <tr key={p.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(p.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{p.products?.name || p.name}</td>
                <td className="px-4 py-3 text-center">{p.quantity}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{formatRupiah(p.buy_price)}</td>
                <td className="px-4 py-3 text-right font-semibold text-badge-warning">{formatRupiah(p.total)}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.source_type === 'supplier' ? 'secondary' : 'success'}>
                    {p.source_name || p.source_type}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setDetailPurchase(p)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors">
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} data · Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailPurchase && (
        <Modal title="Detail Pembelian" onClose={() => setDetailPurchase(null)} maxWidth="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tanggal</p>
                <p className="font-semibold text-foreground">{new Date(detailPurchase.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sumber</p>
                <Badge variant={detailPurchase.source_type === 'supplier' ? 'secondary' : 'success'}>
                  {detailPurchase.source_name || detailPurchase.source_type}
                </Badge>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Produk</p>
              <p className="font-medium text-foreground">{detailPurchase.products?.name || detailPurchase.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Quantity</p>
                <p className="font-medium text-foreground">{detailPurchase.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Harga Beli</p>
                <p className="font-medium text-foreground">{formatRupiah(detailPurchase.buy_price)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="font-bold text-badge-warning">{formatRupiah(detailPurchase.total)}</p>
              </div>
            </div>

            {detailPurchase.source_phone && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">No. HP</p>
                <p className="font-medium text-foreground">{detailPurchase.source_phone}</p>
              </div>
            )}

            {detailPurchase.notes && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Catatan</p>
                <p className="font-medium text-foreground">{detailPurchase.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}