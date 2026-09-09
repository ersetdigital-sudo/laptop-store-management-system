'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'

const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const selectClass = 'h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'
const textareaClass = 'w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'

const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Category { id: string; name: string }

export default function BeliSparepartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    name: '', category_id: '', specs: '', condition: 'baru' as 'baru' | 'bekas' | 'refurbished',
    buy_price: 0, sell_price: 0, quantity: 0,
    source_type: 'supplier' as 'supplier' | 'customer', source_name: '', source_phone: '',
    purchase_date: todayLocal(), notes: '',
  })

  useEffect(() => {
    supabase.from('categories').select('id, name').order('name').then(({ data }) => {
      setCategories(data || [])
      const sparepart = (data || []).find(c => c.name.toLowerCase().trim() === 'sparepart')
      setForm(f => ({ ...f, category_id: f.category_id || sparepart?.id || '' }))
    })
  }, [])

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const marginPerUnit = form.sell_price > 0 ? form.sell_price - form.buy_price : 0
  const potensiMargin = marginPerUnit * form.quantity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category_id) { setError('Pilih kategori terlebih dahulu'); return }
    setLoading(true)
    setError('')
    try {
      // 1. Cari produk existing by nama + kategori
      const { data: existing } = await supabase.from('products')
        .select('id').eq('name', form.name.trim()).eq('category_id', form.category_id).maybeSingle()

      let productId: string
      if (existing) {
        const patch: Record<string, unknown> = { buy_price: form.buy_price }
        if (form.sell_price > 0) patch.sell_price = form.sell_price
        const { error: updErr } = await supabase.from('products').update(patch).eq('id', existing.id)
        if (updErr) throw updErr
        productId = existing.id
      } else {
        const { data: product, error: productError } = await supabase.from('products').insert({
          category_id: form.category_id, name: form.name.trim(), specs: form.specs || null,
          condition: form.condition, buy_price: form.buy_price, sell_price: form.sell_price,
          quantity: 0, status: 'ready',
        }).select('id').single()
        if (productError) throw productError
        productId = product.id
      }

      // 2. Catat pembelian = pengeluaran toko
      const total = form.buy_price * form.quantity
      const { data: purchase, error: purchaseError } = await supabase.from('sparepart_purchases').insert({
        product_id: productId, name: form.name.trim(), quantity: form.quantity,
        buy_price: form.buy_price, total,
        source_type: form.source_type, source_name: form.source_name || null, source_phone: form.source_phone || null,
        purchase_date: form.purchase_date, notes: form.notes || null, created_by: user?.id,
      }).select('id').single()
      if (purchaseError) throw purchaseError

      // 3. Mutasi stok masuk (trigger update qty di DB)
      const { error: movErr } = await supabase.from('stock_movements').insert({
        product_id: productId, type: 'masuk', quantity: form.quantity, reference_type: 'pembelian_sparepart',
        reference_id: purchase.id, notes: `Pembelian sparepart ${form.name.trim()}`, created_by: user?.id,
      })
      if (movErr) throw movErr

      router.push('/stok')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button onClick={() => router.back()} variant="secondary" className="h-9 w-9 shrink-0 p-0">
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="font-serif text-lg font-bold tracking-tight text-foreground">Beli Sparepart</h1>
          <p className="text-xs text-muted-foreground">Pembelian tercatat sebagai pengeluaran toko & menambah stok</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card className="shadow-card">
          <CardContent className="p-4 sm:p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nama Sparepart *</label>
                  <Input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="RAM DDR4 8GB" className="h-10 w-full" />
                </div>
                <div>
                  <label className={labelClass}>Kategori *</label>
                  <select required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={selectClass}>
                    <option value="">Pilih kategori…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Spesifikasi</label>
                <textarea value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} placeholder="128GB SATA" rows={2} className={textareaClass} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Kondisi *</label>
                  <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as 'baru' | 'bekas' | 'refurbished' })} className={selectClass}>
                    <option value="baru">Baru</option><option value="bekas">Bekas</option><option value="refurbished">Refurbished</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Qty/Stok *</label>
                  <Input type="number" min={1} required value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: Number(e.target.value) || 0 })} onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) setForm(f => ({ ...f, quantity: 1 })) }} className="h-10 w-full" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Harga Beli (Rp) *</label>
                  <RupiahInput value={form.buy_price} onChange={v => setForm({ ...form, buy_price: v })} className="h-10 w-full font-mono" />
                </div>
                <div>
                  <label className={labelClass}>Harga Jual (Rp)</label>
                  <RupiahInput value={form.sell_price} onChange={v => setForm({ ...form, sell_price: v })} className="h-10 w-full font-mono" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3">
                <span className="text-sm text-muted-foreground">Potensi Margin ({form.quantity} × {formatRupiah(marginPerUnit)})</span>
                <span className="font-mono text-base font-bold text-badge-success">{formatRupiah(potensiMargin)}</span>
              </div>

              <div>
                <label className={labelClass}>Tanggal Pembelian</label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} className="h-10 w-full" />
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-bold text-foreground">Sumber Pembelian</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Tipe</label>
                    <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value as 'supplier' | 'customer' })} className={selectClass}>
                      <option value="supplier">Supplier</option><option value="customer">Customer</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nama</label>
                    <Input type="text" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} className="h-10 w-full" />
                  </div>
                  <div>
                    <label className={labelClass}>No. HP</label>
                    <Input type="text" value={form.source_phone} onChange={e => setForm({ ...form, source_phone: e.target.value })} className="h-10 w-full" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Catatan</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={textareaClass} />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row">
                <Button type="button" onClick={() => router.back()} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
                <Button type="submit" disabled={loading} className="h-11 w-full sm:flex-1">{loading ? 'Menyimpan...' : 'Simpan Pembelian'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}