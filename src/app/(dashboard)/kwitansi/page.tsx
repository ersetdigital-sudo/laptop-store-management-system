'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase, SupplierReceipt, SupplierReceiptItem } from '@/lib/supabase'
import { Search, Plus, Eye, Download, XCircle, Trash2, ChevronLeft, ChevronRight, Package, User, DollarSign, FileText, Receipt, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/dashboard/PageHeader'
import { Modal } from '@/components/ui/modal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { NotaMultiPDF } from '@/components/pdf/nota-multi'
import { downloadPDF } from '@/components/pdf/utils'
import { showToast } from '@/components/ui/toast'

type ReceiptWithItems = SupplierReceipt & { supplier_receipt_items?: SupplierReceiptItem[] }

export default function RiwayatKwitansiPage() {
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [detailReceipt, setDetailReceipt] = useState<ReceiptWithItems | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<ReceiptWithItems | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ReceiptWithItems | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountNumber: '', bankAccountHolder: '' })
  const itemsPerPage = 10

  const fetchReceipts = useCallback(async () => {
    try {
      const [year, month] = filterMonth.split('-').map(Number)
      const startDate = `${filterMonth}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('supplier_receipts')
        .select('*, supplier_receipt_items(*)')
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)
        .order('created_at', { ascending: false })
      if (error) throw error
      setReceipts(data || [])
      setCurrentPage(1)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filterMonth])

  async function fetchStoreSettings() {
    try {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['store_name', 'store_address', 'store_phone', 'bank_name', 'bank_account_number', 'bank_account_holder'])
      const map: Record<string, string> = {}
      data?.forEach(row => { map[row.key] = row.value })
      setStoreInfo({ storeName: map.store_name || 'Kasir POS', storeAddress: map.store_address || '', storePhone: map.store_phone || '' })
      setBankInfo({ bankName: map.bank_name || '', bankAccountNumber: map.bank_account_number || '', bankAccountHolder: map.bank_account_holder || '' })
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchReceipts()
    fetchStoreSettings()
  }, [fetchReceipts])

  // Batalkan kwitansi: rollback stok & pengeluaran (pola sama seperti hapus penjualan/servis)
  async function handleCancel(receipt: ReceiptWithItems) {
    setCancelling(true)
    try {
      const items = receipt.supplier_receipt_items || []

      // 1. Rollback stok — trigger DB hanya berjalan saat INSERT, jadi kurangi manual
      for (const item of items) {
        if (!item.product_id) continue
        const { data: product } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
        if (product) {
          const qty = Math.max(0, (product.quantity || 0) - item.quantity)
          await supabase.from('products').update({ quantity: qty }).eq('id', item.product_id)
        }
      }

      // 2. Hapus mutasi stok terkait kwitansi
      await supabase.from('stock_movements').delete().eq('reference_id', receipt.id).eq('reference_type', 'pembelian_kwitansi')

      // 3. Hapus pengeluaran terkait (sparepart_purchases & purchases) → otomatis hilang dari formula laba
      await supabase.from('sparepart_purchases').delete().eq('receipt_id', receipt.id)
      await supabase.from('purchases').delete().eq('receipt_id', receipt.id)

      // 4. Tandai kwitansi dibatalkan — tidak bisa menambah stok lagi
      await supabase.from('supplier_receipts').update({ status: 'dibatalkan' }).eq('id', receipt.id)

      setCancelConfirm(null)
      showToast(`Kwitansi ${receipt.receipt_number} dibatalkan — stok & pengeluaran dikembalikan`, 'success')
      fetchReceipts()
    } catch (e) {
      console.error(e)
      showToast('Gagal membatalkan: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
    } finally { setCancelling(false) }
  }

  // Hapus kwitansi: rollback stok & pengeluaran (jika masih selesai), lalu hapus record permanen
  async function handleDelete(receipt: ReceiptWithItems) {
    setDeleting(true)
    try {
      // Rollback stok & pengeluaran hanya jika kwitansi masih berstatus selesai
      if (receipt.status === 'selesai') {
        const items = receipt.supplier_receipt_items || []
        // 1. Rollback stok — trigger DB hanya berjalan saat INSERT, jadi kurangi manual
        for (const item of items) {
          if (!item.product_id) continue
          const { data: product } = await supabase.from('products').select('quantity').eq('id', item.product_id).single()
          if (product) {
            await supabase.from('products').update({ quantity: Math.max(0, (product.quantity || 0) - item.quantity) }).eq('id', item.product_id)
          }
        }
        // 2. Hapus mutasi stok & pengeluaran terkait (sparepart_purchases & purchases)
        await supabase.from('stock_movements').delete().eq('reference_id', receipt.id).eq('reference_type', 'pembelian_kwitansi')
        await supabase.from('sparepart_purchases').delete().eq('receipt_id', receipt.id)
        await supabase.from('purchases').delete().eq('receipt_id', receipt.id)
      }

      // 3. Hapus kwitansi (item otomatis terhapus via ON DELETE CASCADE)
      await supabase.from('supplier_receipts').delete().eq('id', receipt.id)

      setDeleteConfirm(null)
      showToast(`Kwitansi ${receipt.receipt_number} berhasil dihapus`, 'success')
      fetchReceipts()
    } catch (e) {
      console.error(e)
      showToast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
    } finally { setDeleting(false) }
  }

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const filtered = search.trim()
    ? receipts.filter(r => `${r.receipt_number} ${r.supplier_name} ${r.notes || ''}`.toLowerCase().includes(search.toLowerCase()))
    : receipts

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0)
  const totalItems = receipts.reduce((sum, r) => sum + (r.supplier_receipt_items || []).reduce((s, i) => s + i.quantity, 0), 0)

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const [year, month] = filterMonth.split('-').map(Number)
  const periodLabel = `${months[month - 1]} ${year}`

  const summaryCards = [
    { label: 'Total Kwitansi', value: receipts.length, subtext: 'Kwitansi tercatat', icon: FileText, iconColor: 'text-[#04123F]', iconBg: 'bg-blue-50' },
    { label: 'Total Item', value: totalItems, subtext: 'Item dibeli', icon: Package, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    { label: 'Supplier', value: new Set(receipts.map(r => r.supplier_name)).size, subtext: 'Supplier aktif', icon: User, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Total Pengeluaran', value: formatRupiah(totalAmount), subtext: 'Total pembelian', icon: DollarSign, iconColor: 'text-[#FEC40B]', iconBg: 'bg-amber-50', financial: true },
  ]

  async function handleDownloadPDF(receipt: ReceiptWithItems) {
    setPdfLoading(receipt.id)
    try {
      const items = receipt.supplier_receipt_items || []
      const doc = NotaMultiPDF({
        mode: 'pembelian',
        sale: {
          id: receipt.id,
          invoice_number: receipt.receipt_number,
          buyer_name: receipt.supplier_name,
          buyer_phone: receipt.supplier_phone,
          sell_price: receipt.total,
          buy_price: receipt.total,
          payment_method: receipt.payment_method,
          garansi: 'Tanpa Garansi',
          warranty_end_date: null,
          date: receipt.purchase_date,
          notes: receipt.notes,
        },
        items: items.map(item => ({
          name: item.item_name,
          type: item.item_type,
          quantity: item.quantity,
          sell_price: item.buy_price,
          buy_price: item.buy_price,
          specs: item.specs || '',
        })),
        ...storeInfo,
        ...bankInfo,
      })
      await downloadPDF(doc, `Kwitansi-${receipt.receipt_number}.pdf`)
    } catch (e) { console.error('Gagal generate PDF:', e) }
    finally { setPdfLoading(null) }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title="Riwayat Kwitansi" subtitle="Daftar kwitansi pembelian dari supplier">
        <Link href="/kwitansi/buat">
          <Button className="gap-1.5 h-10 text-xs sm:text-sm shadow-sm">
            <Plus size={16} strokeWidth={2.5} />
            Buat Kwitansi
          </Button>
        </Link>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={month}
            onChange={e => setFilterMonth(`${year}-${e.target.value.padStart(2, '0')}`)}
            className="flex-1 sm:flex-none h-10 rounded-xl border border-hairline-strong bg-surface px-3 text-sm font-medium"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={e => setFilterMonth(`${e.target.value}-${String(month).padStart(2, '0')}`)}
            className="flex-1 sm:flex-none h-10 rounded-xl border border-hairline-strong bg-surface px-3 text-sm font-medium"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </PageHeader>

      {/* Summary Cards — Modern Premium */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map(card => (
          <div key={card.label} className="card-premium h-full p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
              <div className={`grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl ${card.iconBg}`}>
                <card.icon size={18} className={card.iconColor} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                <p className={`mt-0.5 font-bold leading-tight ${card.financial ? 'text-base sm:text-lg lg:text-xl text-amber-600' : 'text-lg sm:text-xl lg:text-2xl text-ink'}`}>{card.value}</p>
                <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">{card.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar — Modern */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Cari no. kwitansi, supplier, catatan…"
          className="h-12 w-full rounded-xl border border-hairline-strong bg-surface pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* Period Badge */}
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Periode: {periodLabel}</span>
      </div>

      {/* Mobile Cards — Modern */}
      <div className="space-y-3 lg:hidden">
        {paginated.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <Receipt size={32} className="mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Belum ada kwitansi di {periodLabel}</p>
          </div>
        ) : paginated.map(r => (
          <div key={r.id} className="card-premium p-4 cursor-pointer hover:shadow-card-hover transition-all" onClick={() => setDetailReceipt(r)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-ink font-mono truncate">{r.receipt_number}</p>
                  <Badge variant={r.status === 'selesai' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0 capitalize shrink-0">{r.status}</Badge>
                </div>
                <p className="text-xs font-medium text-foreground truncate">{r.supplier_name}</p>
                {r.supplier_phone && <p className="text-[10px] text-muted-foreground font-mono">{r.supplier_phone}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(r) }}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                title="Hapus Kwitansi"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-hairline">
              <span className="text-[11px] text-muted-foreground">
                {new Date(r.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {(r.supplier_receipt_items || []).length} item
              </span>
              <span className="font-mono text-sm font-bold text-amber-600">{formatRupiah(r.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table — Modern */}
      <div className="hidden lg:block card-premium overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-ash">
              <th className="px-5 py-3 font-semibold">No. Kwitansi</th>
              <th className="px-5 py-3 font-semibold">Tanggal</th>
              <th className="px-5 py-3 font-semibold">Supplier</th>
              <th className="px-5 py-3 font-semibold text-center">Item</th>
              <th className="px-5 py-3 font-semibold text-right">Total</th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
              <th className="px-5 py-3 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="p-12 text-center">
                <Receipt size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Belum ada kwitansi di {periodLabel}</p>
              </td></tr>
            ) : paginated.map(r => (
              <tr key={r.id} className="transition-colors hover:bg-secondary/30">
                <td className="px-5 py-3.5">
                  <p className="font-mono text-xs font-bold text-ink">{r.receipt_number}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-xs font-medium text-ink">{r.supplier_name}</p>
                  {r.supplier_phone && <p className="text-[10px] text-muted-foreground font-mono">{r.supplier_phone}</p>}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-ash">
                    <Package size={11} /> {(r.supplier_receipt_items || []).length}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="font-mono text-sm font-bold text-amber-600">{formatRupiah(r.total)}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <Badge variant={r.status === 'selesai' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5 capitalize">{r.status}</Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => setDetailReceipt(r)} className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors" title="Detail">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleDownloadPDF(r)} disabled={pdfLoading === r.id} className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors" title="Download PDF">
                      {pdfLoading === r.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={16} />}
                    </button>
                    {r.status === 'selesai' && (
                      <button onClick={() => setCancelConfirm(r)} className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Batalkan Kwitansi">
                        <XCircle size={16} />
                      </button>
                    )}
                    <button onClick={() => setDeleteConfirm(r)} className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Hapus Kwitansi">
                      <Trash2 size={16} />
                    </button>
                  </div>
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
      {detailReceipt && (
        <Modal title={`Detail Kwitansi ${detailReceipt.receipt_number}`} onClose={() => setDetailReceipt(null)} maxWidth="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Tanggal</p>
                <p className="font-semibold text-foreground">{new Date(detailReceipt.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</p>
                <Badge variant={detailReceipt.status === 'selesai' ? 'success' : 'destructive'} className="capitalize">{detailReceipt.status}</Badge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Supplier</p>
                <p className="font-semibold text-foreground">{detailReceipt.supplier_name}</p>
                {detailReceipt.supplier_phone && <p className="text-xs text-muted-foreground">{detailReceipt.supplier_phone}</p>}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Metode Bayar</p>
                <p className="font-semibold text-foreground">{detailReceipt.payment_method}</p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <h4 className="mb-2 text-xs font-bold text-foreground">Item Pembelian</h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-left text-[10px] uppercase tracking-wide text-ash">
                      <th className="px-3 py-2 font-medium">No</th>
                      <th className="px-3 py-2 font-medium">Nama Barang</th>
                      <th className="px-3 py-2 font-medium">Tipe</th>
                      <th className="px-3 py-2 font-medium text-center">Qty</th>
                      <th className="px-3 py-2 font-medium text-right">Harga Beli</th>
                      <th className="px-3 py-2 font-medium text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {(detailReceipt.supplier_receipt_items || []).map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-foreground">{item.item_name}</p>
                          {item.specs && <p className="text-[10px] text-muted-foreground">{item.specs}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={item.item_type === 'unit' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0 capitalize">{item.item_type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-center text-xs">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-xs font-mono">{formatRupiah(item.buy_price)}</td>
                        <td className="px-3 py-2 text-right text-xs font-mono font-semibold">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary/30">
                      <td colSpan={5} className="px-3 py-2 text-right text-xs font-bold text-foreground">Total</td>
                      <td className="px-3 py-2 text-right text-sm font-mono font-bold text-badge-warning">{formatRupiah(detailReceipt.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {detailReceipt.notes && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Catatan</p>
                <p className="font-medium text-foreground">{detailReceipt.notes}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={() => handleDownloadPDF(detailReceipt)} disabled={pdfLoading === detailReceipt.id} variant="outline" className="flex-1 gap-2">
                {pdfLoading === detailReceipt.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={14} />}
                Download PDF
              </Button>
              {detailReceipt.status === 'selesai' && (
                <Button onClick={() => { setCancelConfirm(detailReceipt); setDetailReceipt(null) }} variant="destructive" className="flex-1 gap-2">
                  <XCircle size={14} />
                  Batalkan Kwitansi
                </Button>
              )}
              <Button onClick={() => { setDeleteConfirm(detailReceipt); setDetailReceipt(null) }} variant="destructive" className="flex-1 gap-2">
                <Trash2 size={14} />
                Hapus
              </Button>
              <Button onClick={() => setDetailReceipt(null)} variant="secondary" className="flex-1">Tutup</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Batalkan Confirmation */}
      <AlertDialog
        open={!!cancelConfirm}
        title="Batalkan Kwitansi"
        description={
          <>
            Yakin ingin membatalkan kwitansi{' '}
            <span className="font-semibold text-foreground">{cancelConfirm?.receipt_number}</span>{' '}
            dari supplier <span className="font-semibold text-foreground">{cancelConfirm?.supplier_name}</span>?
            <span className="mt-2 block text-xs text-destructive">
              Stok dari {(cancelConfirm?.supplier_receipt_items || []).length} item akan dikurangi kembali
              dan pengeluaran sebesar {formatRupiah(cancelConfirm?.total || 0)} dibatalkan dari perhitungan laba.
              Kwitansi tetap tersimpan sebagai riwayat berstatus {'"Dibatalkan"'}.
            </span>
          </>
        }
        confirmLabel={cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
        loading={cancelling}
        onConfirm={() => cancelConfirm && handleCancel(cancelConfirm)}
        onCancel={() => setCancelConfirm(null)}
      />

      {/* Hapus Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Kwitansi"
        description={
          <>
            Yakin ingin menghapus kwitansi{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.receipt_number}</span>{' '}
            dari supplier <span className="font-semibold text-foreground">{deleteConfirm?.supplier_name}</span>?
            {deleteConfirm?.status === 'selesai' && (
              <span className="mt-2 block text-xs text-destructive">
                Stok dari {(deleteConfirm.supplier_receipt_items || []).length} item akan dikurangi kembali
                dan pengeluaran sebesar {formatRupiah(deleteConfirm.total || 0)} dibatalkan dari perhitungan laba.
              </span>
            )}
            <span className="mt-2 block text-xs text-destructive">Data kwitansi akan dihapus permanen dan tidak dapat dikembalikan.</span>
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Ya, Hapus'}
        loading={deleting}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
