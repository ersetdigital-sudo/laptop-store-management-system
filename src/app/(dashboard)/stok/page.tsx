'use client'

import { useEffect, useState } from 'react'
import { supabase, Product, StockMovement } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Search, ArrowDown, ArrowUp, ArrowDownUp, AlertTriangle, Plus, Package, X, Cpu, Wrench, Pencil, Trash2, ShoppingCart, ArrowDownToLine, Laptop, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { BrandAutocomplete } from '@/components/ui/brand-autocomplete'
import PageHeader from '@/components/dashboard/PageHeader'
import KpiCard from '@/components/laporan/KpiCard'
import { showToast } from '@/components/ui/toast'

type TabType = 'sparepart' | 'unit'

export default function StokPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('sparepart')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [showMutasiLog, setShowMutasiLog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  useEffect(() => { fetchData(); fetchCategories() }, [])

  // Next.js 16: saat halaman direstore dari bfcache/router cache,
  // useEffect mount tidak dijalankan lagi → refetch data agar tidak stale.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) { fetchData(); fetchCategories() }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function fetchData() {
    try {
      const [prodRes, movRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*, products(name, categories(name))').order('created_at', { ascending: false }).limit(200),
      ])
      setProducts(prodRes.data || [])
      setMovements(movRes.data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function fetchCategories() {
    try {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      setCategories(data || [])
    } catch (e) { console.error(e) }
  }

  // Filter products by tab

  async function handleDeleteProduct(product: Product) {
    setDeleting(true)
    try {
      // Hapus semua data terkait dulu, baru hapus produk
      await supabase.from('service_parts').delete().eq('product_id', product.id)
      await supabase.from('purchases').delete().eq('product_id', product.id)
      await supabase.from('sparepart_purchases').delete().eq('product_id', product.id)
      await supabase.from('stock_movements').delete().eq('product_id', product.id)
      await supabase.from('sales').delete().eq('product_id', product.id)

      const { error } = await supabase.from('products').delete().eq('id', product.id)
      if (error) throw error

      setDeleteConfirm(null)
      showToast(`Produk "${product.name}" berhasil dihapus`, 'success')
      fetchData()
    } catch (e) {
      console.error(e)
      showToast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
    } finally {
      setDeleting(false)
    }
  }
  const catName = (p: Product) => (p as Product & { categories?: { name: string } }).categories?.name || ''
  const isSparepart = (name: string) => name.toLowerCase().trim() === 'sparepart'
  const isUnitLaptop = (name: string) => {
    const n = name.toLowerCase().trim()
    return n === 'unit laptop' || n === 'laptop'
  }
  const filteredByTab = products.filter(p => {
    if (activeTab === 'sparepart') return isSparepart(catName(p))
    return isUnitLaptop(catName(p))
  })

  const filtered = filteredByTab.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  // Total aset inventori = Σ (harga beli × stok) dari barang yang masih tersedia
  const aset = (list: Product[]) =>
    list.filter(p => p.quantity > 0).reduce((sum, p) => sum + (p.buy_price || 0) * p.quantity, 0)
  const asetSparepart = aset(products.filter(p => isSparepart(catName(p))))
  const asetUnit = aset(products.filter(p => isUnitLaptop(catName(p))))

  // Filter movements by tab category
  const filteredMovements = movements.filter(m => {
    const prod = m as StockMovement & { products?: { name: string; categories?: { name: string } } }
    const cat = prod.products?.categories?.name || ''
    if (activeTab === 'sparepart') return isSparepart(cat)
    return isUnitLaptop(cat)
  })

  const lowStock = filteredByTab.filter(p => p.quantity <= p.min_quantity && p.min_quantity > 0)
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="spinner" /></div>
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Stok Barang"
        subtitle={activeTab === 'sparepart' ? 'Kelola stok sparepart untuk servis' : 'Kelola stok unit laptop untuk dijual'}
      >
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href="/stok/beli-sparepart">
            <Button variant="secondary" className="gap-1.5 h-9 sm:h-10 text-xs sm:text-sm">
              <ArrowDownToLine size={14} strokeWidth={2} />
              Beli Sparepart
            </Button>
          </Link>
          <Link href="/unit-laptop/beli">
            <Button variant="secondary" className="gap-1.5 h-9 sm:h-10 text-xs sm:text-sm">
              <ArrowDownToLine size={14} strokeWidth={2} />
              Beli Unit
            </Button>
          </Link>
          <Link href="/unit-laptop/jual">
            <Button variant="secondary" className="gap-1.5 h-9 sm:h-10 text-xs sm:text-sm">
              <ShoppingCart size={14} strokeWidth={2} />
              Jual
            </Button>
          </Link>
          <Link href="/stok/riwayat-pembelian">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Riwayat Pembelian">
              <Clock size={16} />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setShowAddCategoryForm(true)} className="h-9 w-9 text-muted-foreground" title="Tambah Kategori">
            <Plus size={16} />
          </Button>
        </div>
      </PageHeader>

      {/* Total Aset */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
        <KpiCard
          title="Aset Sparepart"
          value={asetSparepart}
          sub="modal stok sparepart"
          icon={Wrench}
          tone="emerald"
        />
        <KpiCard
          title="Aset Unit Laptop"
          value={asetUnit}
          sub="modal unit laptop"
          icon={Laptop}
          tone="primary"
        />
        <KpiCard
          title="Total Aset Inventori"
          value={asetSparepart + asetUnit}
          icon={Package}
          tone="sky"
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1">
          <button
            onClick={() => { setActiveTab('sparepart'); setSearch('') }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'sparepart'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-secondary/50 border border-border'
            }`}
          >
            <Wrench size={16} />
            Sparepart
          </button>
          <button
            onClick={() => { setActiveTab('unit'); setSearch('') }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'unit'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-secondary/50 border border-border'
            }`}
          >
            <Cpu size={16} />
            Unit Laptop
          </button>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowMutasiLog(true)}
          className="gap-2 w-full sm:w-auto"
        >
          <ArrowDown size={14} />
          Catatan Stok
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <Card className="shadow-card border-l-4 border-l-badge-warning">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-badge-warning/10 flex-shrink-0">
                <AlertTriangle size={16} className="text-badge-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink mb-1.5">Stok Menipis</p>
                <div className="flex flex-wrap gap-2">
                  {lowStock.map(p => (
                    <Badge key={p.id} variant="warning" className="text-[10px] px-2 py-0.5">
                      {p.name} ({p.quantity})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Filter */}
      <Card className="shadow-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
            <Input 
              type="text" 
              placeholder={`Cari ${activeTab === 'sparepart' ? 'sparepart' : 'unit laptop'}...`} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile Card View — grid 2 kolom ala marketplace */}
      <div className="block lg:hidden">
        {filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Package size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Belum ada data stok</p>
              <p className="text-xs text-muted-foreground mt-1">Tambah barang pertama Anda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.map(p => {
              const catLabel = (p as Product & { categories?: { name: string } }).categories?.name || '-'
              const isLow = p.quantity <= p.min_quantity && p.min_quantity > 0
              const isOut = p.quantity === 0
              const isUnit = isUnitLaptop(catLabel)
              const toneCls = isUnit ? 'bg-primary/10 text-primary' : 'bg-badge-success/10 text-badge-success'
              const stockCls = isOut
                ? 'bg-danger text-white'
                : isLow
                  ? 'bg-badge-warning text-white'
                  : 'bg-card/90 text-ink shadow-sm ring-1 ring-hairline'
              const stockPct = p.min_quantity > 0 ? Math.max(0, Math.min(1, p.quantity / p.min_quantity)) : 1
              const barCls = isOut ? 'bg-danger' : isLow ? 'bg-badge-warning' : 'bg-badge-success'
              const conditionLabel = p.condition === 'bekas' ? 'Bekas' : p.condition === 'refurbished' ? 'Refurbished' : null

              return (
                <Card key={p.id} className={`flex flex-col overflow-hidden shadow-card ${isLow || isOut ? 'ring-1 ring-badge-warning/60' : ''}`}>
                  {/* Visual */}
                  <div className={`relative flex h-24 shrink-0 items-center justify-center ${toneCls}`}>
                    {isUnit ? <Laptop size={36} strokeWidth={1.5} /> : <Wrench size={36} strokeWidth={1.5} />}
                    <span className={`absolute right-2 top-2 flex h-5 items-center rounded-full px-2 text-[9px] font-bold ${stockCls}`}>
                      {isOut ? 'Habis' : `Stok ${p.quantity}`}
                    </span>
                    {isOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[2px]">
                        <span className="rounded-md bg-danger px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                          Stok Habis
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1 p-3 pb-2">
                    <p className="text-[12px] font-semibold leading-snug line-clamp-2">{p.name}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate font-mono text-[9px] text-muted-foreground">{p.sku || catLabel}</p>
                      {conditionLabel && (
                        <span className="shrink-0 rounded bg-secondary px-1 py-px text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
                          {conditionLabel}
                        </span>
                      )}
                    </div>
                    {p.specs && <p className="truncate text-[9px] text-muted-foreground/80">{p.specs}</p>}
                    {p.min_quantity > 0 && (
                      <div className="mt-auto flex items-center gap-1.5 pt-1.5">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${stockPct * 100}%` }} />
                        </div>
                        <span className="text-[8px] text-muted-foreground">min {p.min_quantity}</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="shrink-0 border-t border-border bg-secondary/30 px-3 py-2">
                    <p className="truncate font-mono text-[13px] font-bold leading-tight">{formatRupiah(p.sell_price)}</p>
                    <p className="truncate font-mono text-[9px] text-muted-foreground">beli {formatRupiah(p.buy_price)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-stretch justify-around border-t border-border">
                    <button onClick={() => setEditProduct(p)} title="Edit barang" className="flex h-9 flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setAdjustProduct(p)} title="Penyesuaian stok" className="flex h-9 flex-1 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => setSelectedProduct(p)} title="Riwayat mutasi" className="flex h-9 flex-1 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
                      <ArrowDownUp size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(p)} title="Hapus" className="flex h-9 flex-1 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Card className="shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-hairline bg-secondary/30">
                    <th className="text-left p-4 text-xs font-medium text-ash uppercase tracking-wide">Barang</th>
                    <th className="text-left p-4 text-xs font-medium text-ash uppercase tracking-wide">Kategori</th>
                    <th className="text-center p-4 text-xs font-medium text-ash uppercase tracking-wide">Stok</th>
                    <th className="text-right p-4 text-xs font-medium text-ash uppercase tracking-wide">Harga Beli</th>
                    <th className="text-right p-4 text-xs font-medium text-ash uppercase tracking-wide">Harga Jual</th>
                    <th className="text-left p-4 text-xs font-medium text-ash uppercase tracking-wide">Status</th>
                    <th className="text-center p-4 text-xs font-medium text-ash uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-12">
                        <Package size={32} className="text-stone mx-auto mb-2" />
                        <p className="text-xs text-stone">Belum ada data stok</p>
                      </td>
                    </tr>
                  ) : filtered.map(p => {
                    const catName = (p as Product & { categories?: { name: string } }).categories?.name || '-'
                    const isLow = p.quantity <= p.min_quantity && p.min_quantity > 0
                    // Status berdasarkan quantity, bukan field status statis
                    const displayStatus = p.quantity > 0 ? 'ready' : 'sold'
                    const statusVariant = displayStatus === 'ready' ? 'success' : 'secondary'
                    
                    return (
                      <tr 
                        key={p.id} 
                        className={`border-b border-hairline hover:bg-secondary/30 transition-colors ${isLow ? 'bg-badge-warning/5' : ''}`}
                      >
                        <td className="p-4">
                          <p className="text-sm font-semibold text-ink">{p.name}</p>
                          <p className="text-[10px] text-stone font-mono mt-0.5">{p.sku || '-'}</p>
                          {p.specs && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 max-w-56">{p.specs}</p>}
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-charcoal">{catName}</p>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-sm font-bold ${isLow ? 'text-badge-warning' : 'text-ink'}`}>
                              {p.quantity}
                            </span>
                            {isLow && <AlertTriangle size={12} className="text-badge-warning" />}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-xs font-semibold text-ink font-mono">{formatRupiah(p.buy_price)}</p>
                        </td>
                        <td className="p-4 text-right">
                          <p className="text-xs font-bold text-ink font-mono">{formatRupiah(p.sell_price)}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusVariant as any} className="text-[10px] px-2 py-0.5 capitalize">
                            {displayStatus}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => setEditProduct(p)}
                              className="h-7 px-2 gap-1"
                            >
                              <Pencil size={12} />
                              <span className="text-[11px]">Edit</span>
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => setAdjustProduct(p)}
                              className="h-7 px-2 gap-1"
                            >
                              <Plus size={12} />
                              <span className="text-[11px]">Stok</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedProduct(p)}
                              className="h-7 px-2"
                            >
                              <span className="text-[11px]">Mutasi</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDeleteConfirm(p)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 size={13} />
                            </Button>
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

      {/* Mutasi Modal */}
      {selectedProduct && (
        <Modal title="Mutasi Stok" onClose={() => setSelectedProduct(null)} maxWidth="md">
          <p className="mb-3 -mt-1 text-xs text-muted-foreground">
            {selectedProduct.name} — Stok: <span className="font-bold text-foreground">{selectedProduct.quantity}</span>
          </p>

          <div className="space-y-2">
            {movements.filter(m => m.product_id === selectedProduct.id).map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/30"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.type === 'masuk' ? 'bg-badge-success/10' : 'bg-destructive/10'
                }`}>
                  {m.type === 'masuk' ? (
                    <ArrowDown size={14} className="text-badge-success" />
                  ) : (
                    <ArrowUp size={14} className="text-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {m.type === 'masuk' ? '+' : '-'}{m.quantity}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{m.notes || m.reference_type}</p>
                </div>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
            {movements.filter(m => m.product_id === selectedProduct.id).length === 0 && (
              <div className="py-8 text-center">
                <p className="text-xs text-muted-foreground">Belum ada mutasi stok</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Catatan Stok Modal (Mutasi Log) */}
      {showMutasiLog && (
        <Modal 
          title={`Catatan Stok ${activeTab === 'sparepart' ? 'Sparepart' : 'Unit Laptop'}`} 
          onClose={() => setShowMutasiLog(false)} 
          maxWidth="2xl"
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredMovements.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={24} className="text-stone mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Belum ada catatan stok</p>
              </div>
            ) : filteredMovements.map(m => {
              const prod = m as StockMovement & { products?: { name: string } }
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/30"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    m.type === 'masuk' ? 'bg-badge-success/10' : 'bg-destructive/10'
                  }`}>
                    {m.type === 'masuk' ? (
                      <ArrowDown size={16} className="text-badge-success" />
                    ) : (
                      <ArrowUp size={16} className="text-destructive" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {m.type === 'masuk' ? '+' : '-'}{m.quantity}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs font-medium text-foreground truncate">{prod.products?.name || '-'}</p>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                      {m.notes || m.reference_type}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Produk"
        description={
          <>
            Yakin ingin menghapus produk{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>?
            <span className="mt-2 block text-xs text-destructive">
              Semua data mutasi stok, penjualan, dan pembelian terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </span>
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        onConfirm={() => deleteConfirm && handleDeleteProduct(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {editProduct && <EditStokForm product={editProduct} onClose={() => setEditProduct(null)} onSaved={fetchData} onCategoryAdded={fetchCategories} defaultCategory={activeTab === 'sparepart' ? 'Sparepart' : 'Unit Laptop'} userId={user?.id} />}
      {adjustProduct && <AdjustStokForm product={adjustProduct} onClose={() => setAdjustProduct(null)} onSaved={fetchData} userId={user?.id} />}
      {showAddCategoryForm && (
        <AddCategoryForm
          existingCategories={categories}
          onClose={() => setShowAddCategoryForm(false)}
          onSaved={() => { fetchCategories(); fetchData() }}
        />
      )}
    </div>
  )
}

const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const selectClass = 'h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'
const textareaClass = 'w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'

/* ── Inline Add Category ──── */
function InlineAddCategory({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.from('categories').insert({ name: form.name, description: form.description || null })
      if (error) throw error
      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kategori')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elevated" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Tambah Kategori Baru</h2>
          <Button onClick={onClose} variant="ghost" size="sm" aria-label="Tutup" className="h-7 w-7 p-0"><X size={14} /></Button>
        </div>
        {error && (
          <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Nama Kategori *</label>
            <Input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aksesoris, Adapter, dll" className="h-10 w-full" />
          </div>
          <div>
            <label className={labelClass}>Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={textareaClass} />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
            <Button type="button" onClick={onClose} variant="secondary" className="h-10 w-full sm:flex-1">Batal</Button>
            <Button type="submit" disabled={loading} className="h-10 w-full sm:flex-1">{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Edit Product Form ─────────────────────────── */
function EditStokForm({ product, onClose, onSaved, onCategoryAdded, defaultCategory, userId }: { 
  product: Product; onClose: () => void; onSaved: () => void; onCategoryAdded?: () => void;
  defaultCategory?: string; userId?: string;
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [showCatForm, setShowCatForm] = useState(false)
  const [form, setForm] = useState({
    category_id: product.category_id || '',
    name: product.name,
    sku: product.sku || '',
    brand: product.brand || '',
    model: product.model || '',
    specs: product.specs || '',
    condition: (product.condition || 'baru') as 'baru' | 'bekas' | 'refurbished',
    buy_price: product.buy_price,
    sell_price: product.sell_price,
    quantity: product.quantity,
    min_quantity: product.min_quantity,
  })

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('id, name').order('name')
    // Deduplicate by name (case-insensitive)
    const unique = (data || []).reduce((acc, cat) => {
      const key = cat.name.toLowerCase().trim()
      if (!acc.has(key)) acc.set(key, cat)
      return acc
    }, new Map<string, { id: string; name: string }>())
    setCategories(Array.from(unique.values()))
  }

  useEffect(() => { loadCategories() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const delta = form.quantity - product.quantity
      if (form.quantity < 0) { setError('Stok tidak boleh negatif'); setLoading(false); return }

      const { error } = await supabase.from('products').update({
        category_id: form.category_id || null, name: form.name, sku: form.sku || null,
        brand: form.brand || null, model: form.model || null, specs: form.specs || null,
        condition: form.condition, buy_price: form.buy_price, sell_price: form.sell_price,
        min_quantity: form.min_quantity,
      }).eq('id', product.id)
      if (error) throw error

      // Catat perubahan stok sebagai mutasi — trigger DB (trigger_stock_movement)
      // otomatis menerapkan selisihnya ke products.quantity.
      if (delta !== 0) {
        const { error: movError } = await supabase.from('stock_movements').insert({
          product_id: product.id,
          type: delta > 0 ? 'masuk' : 'keluar',
          quantity: Math.abs(delta),
          reference_type: 'adjustment',
          notes: `Ubah stok via edit (${product.quantity} → ${form.quantity})`,
          created_by: userId,
        })
        if (movError) throw movError
      }

      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Modal title="Edit Barang" onClose={onClose} maxWidth="xl">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Kategori *</label>
            <div className="flex gap-2">
              <select required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={selectClass}>
                <option value="">Pilih kategori...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button type="button" variant="secondary" onClick={() => setShowCatForm(true)} title="Tambah kategori baru" className="h-10 w-10 shrink-0 p-0">
                <Plus size={14} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nama Barang *</label>
              <Input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="RAM 8GB DDR4" className="h-10 w-full" />
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <Input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" className="h-10 w-full font-mono" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Merk</label>
              <BrandAutocomplete value={form.brand} onChange={v => setForm({ ...form, brand: v })} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <Input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="h-10 w-full" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Spesifikasi</label>
            <textarea value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })} rows={2} placeholder="DDR4 3200MHz, SODIMM" className={textareaClass} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Kondisi</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value as 'baru' | 'bekas' | 'refurbished' })} className={selectClass}>
                <option value="baru">Baru</option><option value="bekas">Bekas</option><option value="refurbished">Refurbished</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Stok Saat Ini</label>
              <Input type="number" min={0} value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="h-10 w-full" />
              <p className="mt-1 text-[10px] text-muted-foreground">Perubahan stok otomatis tercatat di mutasi stok</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Harga Beli (Rp) *</label>
              <RupiahInput value={form.buy_price} onChange={v => setForm({ ...form, buy_price: v })} className="h-10 w-full font-mono" />
            </div>
            <div>
              <label className={labelClass}>Harga Jual (Rp)</label>
              <RupiahInput value={form.sell_price} onChange={v => setForm({ ...form, sell_price: v })} className="h-10 w-full font-mono" />
            </div>
            <div>
              <label className={labelClass}>Min. Stok</label>
              <Input type="number" min={0} value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: Number(e.target.value) })} className="h-10 w-full" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row">
            <Button type="button" onClick={onClose} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
            <Button type="submit" disabled={loading} className="h-11 w-full sm:flex-1">{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </form>
      </Modal>

      {showCatForm && (
        <InlineAddCategory
          onClose={() => setShowCatForm(false)}
          onSaved={() => { loadCategories(); onCategoryAdded?.() }}
        />
      )}
    </>
  )
}

/* ── Adjust Stock Form ─────────────────────────── */
function AdjustStokForm({ product, onClose, onSaved, userId }: {
  product: Product; onClose: () => void; onSaved: () => void; userId?: string;
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<'masuk' | 'keluar'>('masuk')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const newQty = type === 'masuk' ? product.quantity + quantity : product.quantity - quantity
      if (newQty < 0) { setError('Stok tidak cukup'); setLoading(false); return }
      // Jangan update quantity manual di sini — trigger DB (trigger_stock_movement)
      // otomatis menambah/mengurangi stok saat stock_movements di-insert.
      await supabase.from('stock_movements').insert({
        product_id: product.id, type, quantity, reference_type: 'adjustment',
        notes: notes || `Penyesuaian stok ${type}`, created_by: userId,
      })
      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally { setLoading(false) }
  }

  return (
    <Modal title="Penyesuaian Stok" onClose={onClose} maxWidth="sm">
      <p className="mb-4 -mt-1 text-sm text-muted-foreground">
        {product.name} — Stok saat ini: <strong className="text-foreground">{product.quantity}</strong>
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('masuk')}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
              type === 'masuk'
                ? 'border-badge-success bg-badge-success/10 text-badge-success'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            <ArrowDown size={16} />
            Stok Masuk
          </button>
          <button
            type="button"
            onClick={() => setType('keluar')}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm font-medium transition-colors ${
              type === 'keluar'
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            <ArrowUp size={16} />
            Stok Keluar
          </button>
        </div>

        <div>
          <label className={labelClass}>Jumlah *</label>
          <Input type="number" required min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="h-10 w-full" />
        </div>

        <div>
          <label className={labelClass}>Catatan</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Keterangan..." className={textareaClass} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-3">
          <span className="text-sm text-muted-foreground">Stok setelah</span>
          <span className={`text-lg font-bold ${type === 'masuk' ? 'text-badge-success' : 'text-destructive'}`}>
            {type === 'masuk' ? product.quantity + quantity : product.quantity - quantity}
          </span>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row">
          <Button type="button" onClick={onClose} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
          <Button
            type="submit"
            disabled={loading}
            variant={type === 'masuk' ? 'default' : 'destructive'}
            className="h-11 w-full sm:flex-1"
          >
            {loading ? 'Menyimpan...' : type === 'masuk' ? 'Tambah Stok' : 'Kurangi Stok'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Add Category Form (standalone modal) ──────── */
function AddCategoryForm({ existingCategories, onClose, onSaved }: {
  existingCategories: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', description: '' })
  const [editItem, setEditItem] = useState<{ id: string; name: string; description?: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [categories, setCategories] = useState(existingCategories)

  // Deduplicate categories by name (case-insensitive)
  const uniqueCategories = categories.reduce((acc, cat) => {
    const key = cat.name.toLowerCase().trim()
    if (!acc.has(key)) {
      acc.set(key, cat)
    }
    return acc
  }, new Map<string, { id: string; name: string }>())

  const displayCategories = Array.from(uniqueCategories.values())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (editItem) {
        // Update existing category
        const { error } = await supabase.from('categories').update({ 
          name: form.name, 
          description: form.description || null 
        }).eq('id', editItem.id)
        if (error) throw error
      } else {
        // Insert new category
        const { error } = await supabase.from('categories').insert({ name: form.name, description: form.description || null })
        if (error) throw error
      }
      onSaved()
      // Refresh categories list
      const { data } = await supabase.from('categories').select('id, name').order('name')
      setCategories(data || [])
      setForm({ name: '', description: '' })
      setEditItem(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kategori')
    } finally { setLoading(false) }
  }

  async function handleDelete(cat: { id: string; name: string }) {
    setDeleteError('')
    setDeleting(true)
    try {
      // Check if category is used by products
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)

      if (countError) throw countError

      if (count && count > 0) {
        setDeleteError(`Kategori "${cat.name}" masih dipakai oleh ${count} produk, tidak bisa dihapus.`)
        setDeleting(false)
        return
      }

      // Safe to delete
      const { error } = await supabase.from('categories').delete().eq('id', cat.id)
      if (error) throw error

      setDeleteConfirm(null)
      onSaved()
      // Refresh categories list
      const { data } = await supabase.from('categories').select('id, name').order('name')
      setCategories(data || [])
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus kategori')
    } finally { setDeleting(false) }
  }

  function startEdit(cat: { id: string; name: string }) {
    setEditItem(cat)
    setForm({ name: cat.name, description: '' })
    setError('')
  }

  function cancelEdit() {
    setEditItem(null)
    setForm({ name: '', description: '' })
    setError('')
  }

  return (
    <Modal title={editItem ? 'Edit Kategori' : 'Tambah Kategori'} onClose={onClose} maxWidth="md">
      <p className="mb-4 -mt-1 text-sm text-muted-foreground">
        {editItem ? 'Ubah nama kategori' : 'Kategori untuk mengelompokkan produk'}
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nama Kategori *</label>
          <Input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Aksesoris, Adapter, dll" className="h-10 w-full" />
        </div>
        <div>
          <label className={labelClass}>Deskripsi</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Keterangan kategori..." className={textareaClass} />
        </div>

        <div className="flex gap-2">
          {editItem && (
            <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1 h-10">Batal Edit</Button>
          )}
          <Button type="submit" disabled={loading} className="flex-1 h-10">
            {loading ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Simpan Kategori'}
          </Button>
        </div>
      </form>

      {/* Existing Categories List */}
      {displayCategories.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Kategori yang sudah ada:</p>
          <div className="space-y-2">
            {displayCategories.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 group hover:bg-secondary/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit kategori"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteConfirm(c); setDeleteError('') }}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Hapus kategori"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Kategori"
        description={
          <>
            Yakin ingin menghapus kategori{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>?
            {deleteError && (
              <span className="mt-2 block rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {deleteError}
              </span>
            )}
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        confirmDisabled={!!deleteError}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => { setDeleteConfirm(null); setDeleteError('') }}
      />
    </Modal>
  )
}
