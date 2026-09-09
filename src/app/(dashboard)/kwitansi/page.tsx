'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase, SupplierReceipt, SupplierReceiptItem } from '@/lib/supabase'
import { Search, FileText, Plus, Eye, Download, XCircle, ChevronLeft, ChevronRight, Package, User, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
    { label: 'Total Kwitansi', value: receipts.length, icon: FileText, color: 'text-badge-info' },
    { label: 'Total Item', value: totalItems, icon: Package, color: 'text-badge-success' },
    { label: 'Total Pengeluaran', value: formatRupiah(totalAmount), icon: DollarSign, color: 'text-badge-warning' },
    { label: 'Supplier', value: new Set(receipts.map(r => r.supplier_name)).size, icon: User, color: 'text-badge-info' },
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
      <PageHeader title="Riwayat Kwitansi Pembelian" subtitle="Daftar kwitansi pembelian dari supplier">
        <Link href="/kwitansi/buat">
          <Button className="gap-1.5 h-10 text-xs sm:text-sm">
            <Plus size={14} strokeWidth={2} />
            Buat Kwitansi Pembelian
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
          placeholder="Cari no. kwitansi, supplier, catatan…"
          className="h-11 w-full rounded-xl border border-hairline-strong bg-surface pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      {/* Mobile Cards */}
      <div className="block divide-y divide-hairline rounded-xl border border-hairline bg-surface-card shadow-card lg:hidden">
        {paginated.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada kwitansi di {periodLabel}</div>
        ) : paginated.map(r => (
          <div key={r.id} onClick={() => setDetailReceipt(r)} className="p-3 space-y-2 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink font-mono">{r.receipt_number}</p>
              <Badge variant={r.status === 'selesai' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5 capitalize">{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">Supplier: {r.supplier_name}</p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(r.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {(r.supplier_receipt_items || []).length} item</span>
              <span className="font-mono font-bold text-badge-warning">{formatRupiah(r.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-hairline bg-surface-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-secondary/30 text-left text-xs text-ash">
              <th className="px-4 py-2.5 font-medium">No. Kwitansi</th>
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Supplier</th>
              <th className="px-4 py-2.5 font-medium text-center">Item</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium text-center">Status</th>
              <th className="px-4 py-2.5 font-medium text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">Belum ada kwitansi di {periodLabel}</td></tr>
            ) : paginated.map(r => (
              <tr key={r.id} className="transition-colors hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">{r.receipt_number}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(r.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-ink">{r.supplier_name}</p>
                  {r.supplier_phone && <p className="text-[10px] text-muted-foreground">{r.supplier_phone}</p>}
                </td>
                <td className="px-4 py-3 text-center text-xs">{(r.supplier_receipt_items || []).length} item</td>
                <td className="px-4 py-3 text-right font-semibold text-badge-warning">{formatRupiah(r.total)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={r.status === 'selesai' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5 capitalize">{r.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => setDetailReceipt(r)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors" title="Detail">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => handleDownloadPDF(r)} disabled={pdfLoading === r.id} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-ink hover:bg-secondary/60 transition-colors" title="Download PDF">
                      {pdfLoading === r.id ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={15} />}
                    </button>
                    {r.status === 'selesai' && (
                      <button onClick={() => setCancelConfirm(r)} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Batalkan Kwitansi">
                        <XCircle size={15} />
                      </button>
                    )}
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
    </div>
  )
}