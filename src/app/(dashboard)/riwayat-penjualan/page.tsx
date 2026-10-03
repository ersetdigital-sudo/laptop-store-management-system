'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Sale, Product, SaleItem } from '@/lib/supabase'
import { Search, Eye, Download, ShoppingCart, Laptop, Package, DollarSign, Trash2, Calendar, User, Receipt, CreditCard, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { NotaUnitPDF } from '@/components/pdf/nota-unit'
import { NotaSparepartPDF } from '@/components/pdf/nota-sparepart'
import { NotaMultiPDF } from '@/components/pdf/nota-multi'
import { downloadPDF } from '@/components/pdf/utils'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import { showToast } from '@/components/ui/toast'

type SaleWithItems = Sale & { products?: Product; sale_items?: SaleItem[] }

export default function RiwayatPenjualanPage() {
  const [sales, setSales] = useState<SaleWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [detailSale, setDetailSale] = useState<SaleWithItems | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<SaleWithItems | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountNumber: '', bankAccountHolder: '' })
  const itemsPerPage = 10

  const fetchSales = useCallback(async () => {
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { data, error } = await supabase
        .from('sales')
        .select('*, products(*), sale_items(*)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSales(data || [])
      setCurrentPage(1)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filterMonth])

  useEffect(() => {
    fetchSales()
    fetchStoreSettings()
  }, [fetchSales])

  async function fetchStoreSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['store_name', 'store_address', 'store_phone', 'bank_name', 'bank_account_number', 'bank_account_holder'])
      const map: Record<string, string> = {}
      data?.forEach(row => { map[row.key] = row.value })
      setStoreInfo({ storeName: map.store_name || 'Kasir POS', storeAddress: map.store_address || '', storePhone: map.store_phone || '' })
      setBankInfo({ bankName: map.bank_name || '', bankAccountNumber: map.bank_account_number || '', bankAccountHolder: map.bank_account_holder || '' })
    } catch (e) { console.error(e) }
  }

  async function handleDelete(sale: SaleWithItems) {
    setDeleting(true)
    try {
      // Hapus stock_movements terkait
      const { error: smError } = await supabase.from('stock_movements').delete().eq('reference_id', sale.id).eq('reference_type', 'penjualan_unit')
      if (smError) throw smError

      // Hapus sale (sale_items akan terhapus otomatis karena ON DELETE CASCADE)
      const { error } = await supabase.from('sales').delete().eq('id', sale.id)
      if (error) throw error

      // Kembalikan stok untuk setiap item
      if (sale.sale_items && sale.sale_items.length > 0) {
        // Multi-item sale
        for (const item of sale.sale_items) {
          if (item.item_type === 'unit' && item.product_id) {
            await supabase.from('products').update({ status: 'ready' }).eq('id', item.product_id)
          } else if (item.item_type === 'sparepart' && item.product_id) {
            const { data: product } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
            if (product) {
              await supabase.from('products').update({ quantity: product.quantity + item.quantity }).eq('id', item.product_id)
            }
          }
        }
      } else {
        // Legacy single-item sale
        if (sale.item_type === 'unit' && sale.product_id) {
          await supabase.from('products').update({ status: 'ready' }).eq('id', sale.product_id)
        }
        if (sale.item_type === 'sparepart' && sale.product_id) {
          const { data: product } = await supabase.from('products').select('quantity').eq('id', sale.product_id).single()
          if (product) {
            await supabase.from('products').update({ quantity: product.quantity + sale.quantity }).eq('id', sale.product_id)
          }
        }
      }

      setDeleteConfirm(null)
      showToast('Transaksi berhasil dihapus', 'success')
      fetchSales()
    } catch (e) {
      console.error(e)
      showToast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  // Filter
  const filtered = sales.filter(s => {
    const matchSearch = s.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
      s.invoice_number.toLowerCase().includes(search.toLowerCase())
    const isMulti = s.sale_items && s.sale_items.length > 0
    const matchType = filterType === 'all' || 
      (filterType === 'multi' && isMulti) ||
      (filterType !== 'multi' && s.item_type === filterType && !isMulti)
    return matchSearch && matchType
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Summary stats
  const totalPenjualan = filtered.reduce((sum, s) => sum + s.sell_price, 0)
  const totalTransaksi = filtered.length
  const unitSales = filtered.filter(s => s.item_type === 'unit' && !(s.sale_items && s.sale_items.length > 0))
  const sparepartSales = filtered.filter(s => s.item_type === 'sparepart' && !(s.sale_items && s.sale_items.length > 0))
  const multiSales = filtered.filter(s => s.sale_items && s.sale_items.length > 0)
  const totalUnit = unitSales.length
  const totalUnitRp = unitSales.reduce((sum, s) => sum + s.sell_price, 0)
  const totalSparepart = sparepartSales.reduce((sum, s) => sum + s.quantity, 0)
  const totalSparepartRp = sparepartSales.reduce((sum, s) => sum + s.sell_price, 0)

  async function handleDownloadPDF(sale: SaleWithItems) {
    setPdfLoading(sale.id)
    try {
      let doc
      if (sale.sale_items && sale.sale_items.length > 0) {
        // Multi-item sale
        doc = NotaMultiPDF({
          sale: { ...sale, warranty_end_date: sale.warranty_end_date || null },
          items: sale.sale_items.map(item => ({
            name: item.item_name,
            type: item.item_type,
            quantity: item.quantity,
            sell_price: item.sell_price,
            buy_price: item.buy_price,
            specs: '',
          })),
          ...storeInfo,
          ...bankInfo,
        })
      } else if (sale.item_type === 'unit' && sale.products) {
        doc = NotaUnitPDF({
          sale: { ...sale, warranty_end_date: sale.warranty_end_date || null },
          product: sale.products, ...storeInfo, ...bankInfo,
        })
      } else if (sale.item_type === 'sparepart' && sale.products) {
        doc = NotaSparepartPDF({
          sale: { ...sale },
          product: sale.products, ...storeInfo,
        })
      }
      if (doc) await downloadPDF(doc, `Invoice-${sale.invoice_number}.pdf`)
    } catch (e) { console.error('Gagal generate PDF:', e) }
    finally { setPdfLoading(null) }
  }

  if (loading) return <div className="flex items-center justify-center p-12"><div className="spinner" /></div>

  return (
    <div className="space-y-3">
      <PageHeader title="Riwayat Penjualan" subtitle="Semua transaksi penjualan unit laptop dan sparepart" />

      {/* Summary Cards */}
      <div className="space-y-3 lg:grid lg:grid-cols-4 lg:gap-3 lg:space-y-0">
        <StatCard
          title="Total Penjualan"
          value={formatRupiah(totalPenjualan)}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="Total Transaksi"
          value={String(totalTransaksi)}
          icon={ShoppingCart}
          color="sky"
        />
        <StatCard
          title="Unit Laptop"
          value={`${totalUnit} unit`}
          sub={formatRupiah(totalUnitRp)}
          icon={Laptop}
          color="emerald"
        />
        <StatCard
          title="Sparepart"
          value={`${totalSparepart} item`}
          sub={formatRupiah(totalSparepartRp)}
          icon={Package}
          color="orange"
        />
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <Input type="text" placeholder="Cari nota, barang, atau pembeli..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} className="pl-9 h-9 text-sm" />
            </div>
            <div className="flex gap-2">
              <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="h-9 rounded-lg border border-hairline-strong bg-surface px-3 text-sm flex-1 sm:w-[160px]" />
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1) }} className="h-9 rounded-lg border border-hairline-strong bg-surface px-3 text-sm flex-1 sm:w-[160px]">
                <option value="all">Semua Tipe</option>
                <option value="unit">Unit Laptop</option>
                <option value="sparepart">Sparepart</option>
                <option value="multi">Multi-Item</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-2">
        {paginatedData.length === 0 ? (
          <Card className="shadow-card"><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Belum ada transaksi</p></CardContent></Card>
        ) : paginatedData.map(s => (
          <Card key={s.id} className="shadow-card overflow-hidden cursor-pointer" onClick={() => setDetailSale(s)}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3 py-2 bg-secondary/30 border-b border-hairline">
                <p className="text-[11px] font-mono font-semibold text-ink">{s.invoice_number}</p>
                <Badge variant={s.sale_items && s.sale_items.length > 0 ? 'info' : s.item_type === 'unit' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                  {s.sale_items && s.sale_items.length > 0 ? `${s.sale_items.length} Barang` : s.item_type === 'unit' ? 'Unit' : 'Sparepart'}
                </Badge>
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{s.item_name || '-'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.buyer_name}</p>
                  </div>
                  <p className="text-sm font-bold font-mono text-ink shrink-0">{formatRupiah(s.sell_price)}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-stone">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">{s.payment_method}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s) }}
                      className="h-6 w-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">No. Nota</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Tanggal</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Tipe</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Nama Barang</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Pembeli</th>
                    <th className="text-right p-3 text-xs font-medium text-ash uppercase tracking-wide">Harga</th>
                    <th className="text-left p-3 text-xs font-medium text-ash uppercase tracking-wide">Bayar</th>
                    <th className="text-center p-3 text-xs font-medium text-ash uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-8 text-xs text-stone">Belum ada transaksi</td></tr>
                  ) : paginatedData.map(s => (
                    <tr key={s.id} className="border-b border-hairline hover:bg-secondary/30 transition-colors">
                      <td className="p-3"><p className="text-xs font-mono font-semibold text-ink">{s.invoice_number}</p></td>
                      <td className="p-3"><p className="text-xs text-stone">{new Date(s.date).toLocaleDateString('id-ID')}</p></td>
                      <td className="p-3"><Badge variant={s.sale_items && s.sale_items.length > 0 ? 'info' : s.item_type === 'unit' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">{s.sale_items && s.sale_items.length > 0 ? `${s.sale_items.length} Barang` : s.item_type === 'unit' ? 'Unit' : 'Sparepart'}</Badge></td>
                      <td className="p-3"><p className="text-xs font-semibold text-ink">{s.item_name || '-'}</p></td>
                      <td className="p-3"><p className="text-xs text-ink">{s.buyer_name}</p></td>
                      <td className="p-3 text-right"><p className="text-xs font-bold text-ink font-mono">{formatRupiah(s.sell_price)}</p></td>
                      <td className="p-3"><p className="text-xs text-muted-foreground">{s.payment_method}</p></td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailSale(s)}>
                            <Eye size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownloadPDF(s)} disabled={pdfLoading === s.id}>
                            {pdfLoading === s.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={13} />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirm(s)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              <p className="text-xs text-muted-foreground">Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} dari {filtered.length} data</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&laquo;</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) pageNum = i + 1
                  else if (currentPage <= 3) pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = currentPage - 2 + i
                  return <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(pageNum)}>{pageNum}</Button>
                })}
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&raquo;</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal — Modern */}
      {detailSale && (
        <Modal title={`Detail Transaksi ${detailSale.invoice_number}`} onClose={() => setDetailSale(null)} maxWidth="md">
          <div className="space-y-4">
            {/* Info Section — Clean labeled rows */}
            <div className="rounded-2xl border border-hairline bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-500">No. Invoice</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 font-mono">{detailSale.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Tanggal</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{new Date(detailSale.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Tipe</span>
                </div>
                <Badge variant={detailSale.sale_items && detailSale.sale_items.length > 0 ? 'info' : detailSale.item_type === 'unit' ? 'default' : 'secondary'} className="text-[10px]">{detailSale.sale_items && detailSale.sale_items.length > 0 ? 'Multi-Item' : detailSale.item_type === 'unit' ? 'Unit Laptop' : 'Sparepart'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Metode Bayar</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{detailSale.payment_method}</span>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <h4 className="mb-2.5 text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Package size={14} className="text-gray-400" />
                Detail Barang
                {detailSale.sale_items && detailSale.sale_items.length > 0 && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{detailSale.sale_items.length} item</span>
                )}
              </h4>
              {detailSale.sale_items && detailSale.sale_items.length > 0 ? (
                <div className="space-y-2">
                  {detailSale.sale_items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-hairline bg-white p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{item.item_name}</p>
                          <p className="text-[10px] text-gray-400">{item.item_type === 'unit' ? 'Unit' : 'Sparepart'} × {item.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">{item.quantity} × {formatRupiah(item.sell_price)}</span>
                        <span className="font-mono font-semibold text-gray-900">{formatRupiah(item.sell_price * item.quantity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-hairline bg-white p-3">
                  <p className="text-xs font-semibold text-gray-900">{detailSale.item_name || '-'}</p>
                  {detailSale.item_type === 'sparepart' && <p className="text-[10px] text-gray-400 mt-0.5">Qty: {detailSale.quantity}</p>}
                </div>
              )}
            </div>

            {/* Buyer Section */}
            <div className="rounded-2xl border border-hairline bg-gray-50/50 p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" />
                Data Pembeli
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Nama</span>
                <span className="text-xs font-semibold text-gray-900">{detailSale.buyer_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">No. HP</span>
                <span className="text-xs font-semibold text-gray-900 font-mono">{detailSale.buyer_phone || '-'}</span>
              </div>
            </div>

            {/* Total — Prominent */}
            <div className="flex items-center justify-between rounded-2xl bg-[#04123F] px-4 py-3">
              <span className="text-xs font-medium text-white/70">Total Penjualan</span>
              <span className="font-mono text-lg font-bold text-[#FEC40B]">{formatRupiah(detailSale.sell_price)}</span>
            </div>

            {/* Warranty */}
            {detailSale.item_type === 'unit' && detailSale.garansi && detailSale.garansi.toLowerCase() !== 'tanpa garansi' && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Garansi</p>
                  <p className="text-xs text-gray-700">{detailSale.garansi}</p>
                </div>
              </div>
            )}

            {/* Actions — Clean stacked */}
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={() => handleDownloadPDF(detailSale)} disabled={pdfLoading === detailSale.id} variant="outline" className="w-full gap-2 h-10">
                {pdfLoading === detailSale.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={16} />}
                Download PDF
              </Button>
              <Button onClick={() => setDetailSale(null)} variant="secondary" className="w-full h-10">Tutup</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Transaksi"
        description={
          <>
            Yakin ingin menghapus transaksi{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.invoice_number}</span>?
            <span className="mt-2 block text-xs text-destructive">
              {deleteConfirm?.item_type === 'unit'
                ? 'Status produk akan dikembalikan ke "Ready".'
                : `Stok ${deleteConfirm?.item_name} akan ditambah kembali sebanyak ${deleteConfirm?.quantity}.`}{' '}
              Data yang dihapus tidak dapat dikembalikan.
            </span>
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
