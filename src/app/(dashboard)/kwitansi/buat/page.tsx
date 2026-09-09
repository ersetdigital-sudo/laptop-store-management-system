'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, PaymentMethod } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Download, Plus, Trash2, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { NotaMultiPDF } from '@/components/pdf/nota-multi'
import { downloadPDF } from '@/components/pdf/utils'

const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const selectClass = 'h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'
const textareaClass = 'w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type ItemType = 'sparepart' | 'unit'

interface FormItem {
  key: number
  item_type: ItemType
  name: string
  brand: string
  model: string
  specs: string
  condition: 'baru' | 'bekas' | 'refurbished'
  imei_serial: string
  quantity: number
  buy_price: number
  sell_price: number
}

let nextItemKey = 1
const newItem = (): FormItem => ({
  key: nextItemKey++,
  item_type: 'sparepart',
  name: '',
  brand: '',
  model: '',
  specs: '',
  condition: 'baru',
  imei_serial: '',
  quantity: 1,
  buy_price: 0,
  sell_price: 0,
})

export default function BuatKwitansiPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [items, setItems] = useState<FormItem[]>([newItem()])
  const [storeInfo, setStoreInfo] = useState({ storeName: 'Kasir POS', storeAddress: '', storePhone: '' })
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountNumber: '', bankAccountHolder: '' })
  const [form, setForm] = useState({
    supplier_name: '', supplier_phone: '', purchase_date: todayLocal(),
    payment_method: 'Cash', notes: '',
  })
  const [saved, setSaved] = useState<{ receipt_number: string; items: FormItem[]; total: number } | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  async function fetchPaymentMethods() {
    try {
      const { data } = await supabase.from('payment_methods').select('*').eq('is_active', true).order('sort_order', { ascending: true })
      setPaymentMethods(data || [])
      if (data && data.length > 0) setForm(f => ({ ...f, payment_method: data[0].name }))
    } catch (e) { console.error(e) }
  }

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
    fetchPaymentMethods()
    fetchStoreSettings()
  }, [])

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const total = items.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0)
  const itemName = (item: FormItem) =>
    item.item_type === 'unit' ? `${item.brand} ${item.model}`.trim() || item.name : item.name.trim()

  function updateItem(key: number, patch: Partial<FormItem>) {
    setItems(items.map(i => (i.key === key ? { ...i, ...patch } : i)))
  }

  function addItem() {
    setItems([...items, newItem()])
  }

  function removeItem(key: number) {
    if (items.length === 1) return
    setItems(items.filter(i => i.key !== key))
  }

  function validate(): string | null {
    if (!form.supplier_name.trim()) return 'Nama supplier wajib diisi'
    if (!form.purchase_date) return 'Tanggal pembelian wajib diisi'
    if (items.length === 0) return 'Tambahkan minimal 1 item'
    for (const item of items) {
      if (item.item_type === 'sparepart' && !item.name.trim()) return 'Nama barang wajib diisi untuk item sparepart'
      if (item.item_type === 'unit' && (!item.brand.trim() || !item.model.trim())) return 'Merk dan Tipe/Model wajib diisi untuk item unit laptop'
      if (item.quantity <= 0) return 'Qty harus lebih dari 0'
      if (item.buy_price <= 0) return 'Harga beli wajib diisi untuk setiap item'
    }
    return null
  }

  // Cari kategori 'Sparepart' / 'Unit Laptop' (buat otomatis jika belum ada, pola sama seperti Beli Unit)
  async function ensureCategory(name: string) {
    let { data: cat } = await supabase.from('categories').select('id').eq('name', name).maybeSingle()
    if (!cat) {
      const { data: newCat, error: catErr } = await supabase.from('categories').insert({ name, description: `Kategori ${name}` }).select('id').single()
      if (catErr) throw new Error(`Gagal membuat kategori ${name}`)
      cat = newCat
    }
    return cat.id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    let receiptId: string | null = null
    // Lacak stok yang sudah benar-benar masuk (untuk rollback parsial saat gagal di tengah)
    const appliedStock: { productId: string; quantity: number }[] = []
    try {
      // 1. Simpan header kwitansi (nomor auto-generate via trigger DB: KW-2026-0001)
      const { data: receipt, error: receiptError } = await supabase.from('supplier_receipts').insert({
        supplier_name: form.supplier_name.trim(),
        supplier_phone: form.supplier_phone.trim() || null,
        purchase_date: form.purchase_date,
        total,
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      }).select('id, receipt_number').single()
      if (receiptError) throw receiptError
      receiptId = receipt.id

      // 2. Proses setiap item: simpan snapshot kwitansi + stok + pengeluaran (channel yang sama seperti Beli Sparepart/Beli Unit)
      for (const item of items) {
        const qty = Math.max(1, item.quantity || 1)
        const buyPrice = item.buy_price || 0
        const name = itemName(item)
        const subtotal = buyPrice * qty
        let productId: string | null = null

        if (item.item_type === 'sparepart') {
          const catId = await ensureCategory('Sparepart')
          // Find-or-create produk (pola sama seperti Beli Sparepart)
          const { data: existing } = await supabase.from('products')
            .select('id').eq('name', name).eq('category_id', catId).maybeSingle()
          if (existing) {
            const patch: Record<string, unknown> = { buy_price: buyPrice }
            if (item.sell_price > 0) patch.sell_price = item.sell_price
            await supabase.from('products').update(patch).eq('id', existing.id)
            productId = existing.id
          } else {
            const { data: product, error: productError } = await supabase.from('products').insert({
              category_id: catId, name, specs: item.specs.trim() || null,
              condition: item.condition, buy_price: buyPrice, sell_price: item.sell_price,
              quantity: 0, status: 'ready',
            }).select('id').single()
            if (productError) throw productError
            productId = product.id
          }

          // Pengeluaran toko via channel sparepart_purchases (otomatis masuk formula laba finance.ts)
          const { error: purchaseError } = await supabase.from('sparepart_purchases').insert({
            product_id: productId, name, quantity: qty, buy_price: buyPrice, total: subtotal,
            source_type: 'supplier', source_name: form.supplier_name.trim() || null,
            source_phone: form.supplier_phone.trim() || null,
            purchase_date: form.purchase_date, notes: `Kwitansi ${receipt.receipt_number}`,
            receipt_id: receipt.id, created_by: user?.id,
          })
          if (purchaseError) throw purchaseError

          // Mutasi stok masuk (trigger DB menambah products.quantity)
          const { error: movErr } = await supabase.from('stock_movements').insert({
            product_id: productId, type: 'masuk', quantity: qty, reference_type: 'pembelian_kwitansi',
            reference_id: receipt.id, notes: `Pembelian ${name} (${receipt.receipt_number})`, created_by: user?.id,
          })
          if (movErr) throw movErr
          appliedStock.push({ productId: productId as string, quantity: qty })
        } else {
          const catId = await ensureCategory('Unit Laptop')
          // Unit laptop: selalu buat produk baru (pola sama seperti Beli Unit Laptop)
          const { data: product, error: productError } = await supabase.from('products').insert({
            category_id: catId, name, brand: item.brand.trim() || null, model: item.model.trim() || null,
            specs: item.specs.trim() || null, condition: item.condition,
            imei_serial: item.imei_serial.trim() || null,
            buy_price: buyPrice, sell_price: item.sell_price, quantity: 0, status: 'ready',
          }).select('id').single()
          if (productError) throw productError
          productId = product.id

          // Pengeluaran unit via channel purchases (sama seperti Beli Unit — ikut margin saat terjual)
          const { error: purchaseError } = await supabase.from('purchases').insert({
            product_id: productId, source_type: 'supplier', source_name: form.supplier_name.trim() || null,
            source_phone: form.supplier_phone.trim() || null, buy_price: buyPrice,
            status: 'completed', date: `${form.purchase_date}T12:00:00`,
            notes: `Kwitansi ${receipt.receipt_number}`, receipt_id: receipt.id, created_by: user?.id,
          })
          if (purchaseError) throw purchaseError

          const { error: movErr } = await supabase.from('stock_movements').insert({
            product_id: productId, type: 'masuk', quantity: qty, reference_type: 'pembelian_kwitansi',
            reference_id: receipt.id, notes: `Pembelian unit ${name} (${receipt.receipt_number})`, created_by: user?.id,
          })
          if (movErr) throw movErr
          appliedStock.push({ productId: productId as string, quantity: qty })
        }

        // 3. Snapshot item di level kwitansi (harga beli per pembelian, pola snapshot sparepart-ke-servis)
        const { error: itemError } = await supabase.from('supplier_receipt_items').insert({
          receipt_id: receipt.id, product_id: productId, item_type: item.item_type, item_name: name,
          brand: item.brand.trim() || null, model: item.model.trim() || null,
          specs: item.specs.trim() || null, condition: item.condition,
          imei_serial: item.imei_serial.trim() || null,
          quantity: qty, buy_price: buyPrice, sell_price: item.sell_price,
        })
        if (itemError) throw itemError
      }

      setSaved({ receipt_number: receipt.receipt_number, items: [...items], total })
    } catch (err: unknown) {
      // Cleanup parsial: kalau gagal di tengah proses item, hapus data yang sudah terlanjur dibuat
      if (receiptId) {
        try {
          // Kembalikan stok untuk item yang sudah masuk (trigger hanya berjalan saat INSERT)
          for (const s of appliedStock) {
            const { data: product } = await supabase.from('products').select('quantity').eq('id', s.productId).single()
            if (product) {
              await supabase.from('products').update({ quantity: Math.max(0, (product.quantity || 0) - s.quantity) }).eq('id', s.productId)
            }
          }
          await supabase.from('sparepart_purchases').delete().eq('receipt_id', receiptId)
          await supabase.from('purchases').delete().eq('receipt_id', receiptId)
          await supabase.from('stock_movements').delete().eq('reference_id', receiptId).eq('reference_type', 'pembelian_kwitansi')
          await supabase.from('supplier_receipts').delete().eq('id', receiptId)
        } catch (cleanupErr) { console.error('Gagal cleanup kwitansi parsial:', cleanupErr) }
      }
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kwitansi')
    } finally { setLoading(false) }
  }

  async function handleDownloadPDF() {
    if (!saved) return
    setPdfLoading(true)
    try {
      const doc = NotaMultiPDF({
        mode: 'pembelian',
        sale: {
          id: '',
          invoice_number: saved.receipt_number,
          buyer_name: form.supplier_name,
          buyer_phone: form.supplier_phone || null,
          sell_price: saved.total,
          buy_price: saved.total,
          payment_method: form.payment_method,
          garansi: 'Tanpa Garansi',
          warranty_end_date: null,
          date: form.purchase_date,
          notes: form.notes,
        },
        items: saved.items.map(item => ({
          name: itemName(item),
          type: item.item_type,
          quantity: item.quantity,
          sell_price: item.buy_price,
          buy_price: item.buy_price,
          specs: item.specs,
        })),
        ...storeInfo,
        ...bankInfo,
      })
      await downloadPDF(doc, `Kwitansi-${saved.receipt_number}.pdf`)
    } catch (e) { console.error('Gagal generate PDF:', e) }
    finally { setPdfLoading(false) }
  }

  // Layar sukses
  if (saved) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button onClick={() => { setSaved(null); setItems([newItem()]); setForm(f => ({ ...f, supplier_name: '', supplier_phone: '', notes: '' })) }} variant="secondary" className="h-9 w-9 shrink-0 p-0">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-tight text-foreground">Kwitansi Tersimpan</h1>
            <p className="text-xs text-muted-foreground">Kwitansi {saved.receipt_number} telah dibuat</p>
          </div>
        </div>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-badge-success/20">
              <svg className="h-8 w-8 text-badge-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Kwitansi Pembelian Berhasil Disimpan</p>
              <p className="text-sm text-muted-foreground">No. Kwitansi: {saved.receipt_number}</p>
              <p className="text-xs text-muted-foreground mt-1">Stok otomatis bertambah & pengeluaran tercatat</p>
            </div>

            {/* Ringkasan item */}
            <div className="text-left rounded-lg border border-border bg-secondary/50 p-3">
              {saved.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">{itemName(item)} x{item.quantity}</span>
                  <span className="font-mono font-medium">{formatRupiah(item.buy_price * item.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 mt-2 border-t border-border">
                <span>Total Pembelian</span>
                <span className="font-mono">{formatRupiah(saved.total)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleDownloadPDF} disabled={pdfLoading} variant="outline" className="gap-2">
                {pdfLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" /> : <Download size={16} />}
                {pdfLoading ? 'Generating...' : 'Download Kwitansi PDF'}
              </Button>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setSaved(null); setItems([newItem()]); setForm(f => ({ ...f, supplier_name: '', supplier_phone: '', notes: '' })) }} variant="secondary">Buat Lagi</Button>
              <Button onClick={() => router.push('/kwitansi')} variant="outline">Lihat Riwayat</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button onClick={() => router.back()} variant="secondary" className="h-9 w-9 shrink-0 p-0">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="font-serif text-lg font-bold tracking-tight text-foreground">Buat Kwitansi Pembelian</h1>
          <p className="text-xs text-muted-foreground">Satu kwitansi untuk banyak item — stok & pengeluaran otomatis tercatat</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <Card className="shadow-card">
          <CardContent className="p-4 sm:p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Data Supplier */}
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <h3 className="mb-3 text-sm font-bold text-foreground">Data Supplier</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Nama Supplier *</label>
                    <Input type="text" required value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} placeholder="PT Maju Jaya Komputer" className="h-10 w-full" />
                  </div>
                  <div>
                    <label className={labelClass}>No. HP Supplier</label>
                    <Input type="text" value={form.supplier_phone} onChange={e => setForm({ ...form, supplier_phone: e.target.value })} className="h-10 w-full" />
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Pembelian</label>
                    <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="h-10 w-full" />
                  </div>
                  <div>
                    <label className={labelClass}>Metode Bayar</label>
                    <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className={selectClass}>
                      {paymentMethods.length === 0 && <option value="Cash">Cash</option>}
                      {paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Daftar Item */}
              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Item Pembelian ({items.length})</h4>
                    <p className="text-[10px] text-muted-foreground">Bisa lebih dari satu barang dalam satu kwitansi</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={addItem} className="h-8 gap-1.5 text-xs">
                    <Plus size={14} /> Tambah Item
                  </Button>
                </div>

                {items.map((item) => (
                  <div key={item.key} className="mb-3 rounded-lg border border-border bg-card p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex flex-1 gap-2">
                        <button
                          type="button"
                          onClick={() => updateItem(item.key, { item_type: 'sparepart' })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            item.item_type === 'sparepart' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-secondary/50'
                          }`}
                        >
                          Sparepart
                        </button>
                        <button
                          type="button"
                          onClick={() => updateItem(item.key, { item_type: 'unit' })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                            item.item_type === 'unit' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-secondary/50'
                          }`}
                        >
                          Unit Laptop
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        disabled={items.length === 1}
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                        title="Hapus item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {item.item_type === 'sparepart' ? (
                      <div className="space-y-3">
                        <div>
                          <label className={labelClass}>Nama Barang *</label>
                          <Input type="text" value={item.name} onChange={e => updateItem(item.key, { name: e.target.value })} placeholder="RAM DDR4 8GB" className="h-10 w-full" />
                        </div>
                        <div>
                          <label className={labelClass}>Spesifikasi</label>
                          <Input type="text" value={item.specs} onChange={e => updateItem(item.key, { specs: e.target.value })} placeholder="3200MHz SODIMM" className="h-10 w-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Merk *</label>
                            <Input type="text" value={item.brand} onChange={e => updateItem(item.key, { brand: e.target.value })} placeholder="ASUS, Lenovo" className="h-10 w-full" />
                          </div>
                          <div>
                            <label className={labelClass}>Tipe/Model *</label>
                            <Input type="text" value={item.model} onChange={e => updateItem(item.key, { model: e.target.value })} placeholder="ROG Strix G15" className="h-10 w-full" />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Spesifikasi</label>
                          <Input type="text" value={item.specs} onChange={e => updateItem(item.key, { specs: e.target.value })} placeholder="i5-1135G7, RAM 8GB, SSD 256GB" className="h-10 w-full" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>IMEI/SN</label>
                            <Input type="text" value={item.imei_serial} onChange={e => updateItem(item.key, { imei_serial: e.target.value })} className="h-10 w-full font-mono" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div>
                        <label className={labelClass}>Kondisi</label>
                        <select value={item.condition} onChange={e => updateItem(item.key, { condition: e.target.value as 'baru' | 'bekas' | 'refurbished' })} className={selectClass}>
                          <option value="baru">Baru</option><option value="bekas">Bekas</option><option value="refurbished">Refurbished</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Qty *</label>
                        <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-10 w-full" />
                      </div>
                      <div>
                        <label className={labelClass}>Harga Beli (Rp) *</label>
                        <RupiahInput value={item.buy_price} onChange={v => updateItem(item.key, { buy_price: v })} className="h-10 w-full font-mono" />
                      </div>
                      <div>
                        <label className={labelClass}>Harga Jual (Rp)</label>
                        <RupiahInput value={item.sell_price} onChange={v => updateItem(item.key, { sell_price: v })} className="h-10 w-full font-mono" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-1.5">
                      <span className="text-[11px] text-muted-foreground">Subtotal {itemName(item) || 'item'}</span>
                      <span className="text-sm font-mono font-bold text-foreground">{formatRupiah(item.buy_price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Catatan */}
              <div>
                <label className={labelClass}>Catatan / Keterangan</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={textareaClass} placeholder="Opsional — keterangan pembelian..." />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Nilai Pembelian ({items.length} item)</span>
                </div>
                <span className="font-mono text-lg font-bold text-badge-warning">{formatRupiah(total)}</span>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row">
                <Button type="button" onClick={() => router.back()} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
                <Button type="submit" disabled={loading || items.length === 0} className="h-11 w-full sm:flex-1">{loading ? 'Menyimpan...' : `Simpan Kwitansi (${items.length} item)`}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}