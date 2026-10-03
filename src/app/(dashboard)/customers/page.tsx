'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Customer } from '@/lib/supabase'
import { Search, Eye, ArrowUpDown, Loader2, Trash2, MessageCircle, Users, ShoppingBag, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { CustomerDetailSheet } from '@/components/customers/customer-detail-sheet'
import PageHeader from '@/components/dashboard/PageHeader'
import { showToast } from '@/components/ui/toast'

interface CustomerWithStats extends Customer {
  total_transaksi: number
  transaksi_terakhir: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'nama' | 'transaksi_terakhir'>('nama')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirm, setDeleteConfirm] = useState<CustomerWithStats | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch customers
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .order(sortBy === 'nama' ? 'nama' : 'created_at', { ascending: sortDir === 'asc' })

      if (error) throw error

      // Fetch stats for each customer
      const customersWithStats: CustomerWithStats[] = await Promise.all(
        (customersData || []).map(async (cust) => {
          // Count sales
          const { count: salesCount } = await supabase
            .from('sales')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', cust.id)

          // Count services
          const { count: serviceCount } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', cust.id)

          // Get last transaction date
          const { data: lastSale } = await supabase
            .from('sales')
            .select('date')
            .eq('customer_id', cust.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle()

          const { data: lastService } = await supabase
            .from('services')
            .select('date_in')
            .eq('customer_id', cust.id)
            .order('date_in', { ascending: false })
            .limit(1)
            .maybeSingle()

          const lastDate = lastSale?.date || lastService?.date_in || null

          return {
            ...cust,
            total_transaksi: (salesCount || 0) + (serviceCount || 0),
            transaksi_terakhir: lastDate,
          }
        })
      )

      // Sort by transaksi_terakhir if needed
      if (sortBy === 'transaksi_terakhir') {
        customersWithStats.sort((a, b) => {
          const dateA = a.transaksi_terakhir ? new Date(a.transaksi_terakhir).getTime() : 0
          const dateB = b.transaksi_terakhir ? new Date(b.transaksi_terakhir).getTime() : 0
          return sortDir === 'asc' ? dateA - dateB : dateB - dateA
        })
      }

      setCustomers(customersWithStats)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [sortBy, sortDir])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Filter by search
  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return c.nama.toLowerCase().includes(q) || c.no_wa.includes(q)
  })

  const toggleSort = (field: 'nama' | 'transaksi_terakhir') => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('customers').delete().eq('id', deleteConfirm.id)
      if (error) throw error
      setDeleteConfirm(null)
      showToast('Customer berhasil dihapus', 'success')
      fetchCustomers()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus customer', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Avatar warna deterministik dari nama — ala list-search
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

  const waLink = (noWa: string) => `https://wa.me/${noWa.replace(/^0/, '62')}`

  return (
    <div className="space-y-3">
      <PageHeader title="Customer" subtitle="Daftar customer yang pernah melakukan transaksi" />

      {/* Search & Filter */}
      <Card className="shadow-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama atau No. WA..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={sortBy === 'nama' ? 'default' : 'outline'}
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => toggleSort('nama')}
              >
                Nama
                <ArrowUpDown size={12} />
              </Button>
              <Button
                variant={sortBy === 'transaksi_terakhir' ? 'default' : 'outline'}
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => toggleSort('transaksi_terakhir')}
              >
                Transaksi Terakhir
                <ArrowUpDown size={12} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Mobile Card View — Premium */}
      {!loading && (
        <div className="block lg:hidden space-y-2.5">
          {filtered.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {search ? 'Customer tidak ditemukan' : 'Belum ada data customer'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(c => (
              <Card key={c.id} className="shadow-card overflow-hidden">
                <CardContent className="p-0">
                  {/* Header row with navy tint */}
                  <div className="flex items-center gap-3 px-3.5 py-3 bg-[#04123F]/[0.03]">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${avatarTone(c.nama)}`}>
                      {initials(c.nama)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{c.nama}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground font-mono">{c.no_wa}</p>
                    </div>
                    <a
                      href={waLink(c.no_wa)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${c.nama}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      <MessageCircle size={15} strokeWidth={2} />
                    </a>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-px bg-hairline">
                    <div className="bg-surface px-3.5 py-2.5">
                      <p className="text-[10px] text-stone uppercase tracking-wide">Transaksi</p>
                      <p className="text-sm font-bold text-ink">{c.total_transaksi}</p>
                    </div>
                    <div className="bg-surface px-3.5 py-2.5">
                      <p className="text-[10px] text-stone uppercase tracking-wide">Terakhir</p>
                      <p className="text-sm font-semibold text-ink">{c.transaksi_terakhir ? formatDate(c.transaksi_terakhir) : '-'}</p>
                    </div>
                  </div>
                  {/* Action row */}
                  <div className="flex gap-1.5 px-3.5 py-2.5 border-t border-hairline">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setDetailId(c.id)}
                      className="h-8 flex-1 gap-1 text-[11px]"
                    >
                      <Eye size={12} /> Lihat Detail
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(c)}
                      className="h-8 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Desktop Table View — Premium */}
      {!loading && (
        <div className="hidden lg:block">
          <Card className="shadow-card overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hairline bg-[#04123F]/[0.02]">
                      <th className="text-left p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">Customer</th>
                      <th className="text-left p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">No. WA</th>
                      <th className="text-left p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">Alamat</th>
                      <th className="text-center p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">Transaksi</th>
                      <th className="text-left p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">Terakhir</th>
                      <th className="text-center p-3.5 text-xs font-semibold text-stone uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-xs text-muted-foreground">
                          {search ? 'Customer tidak ditemukan' : 'Belum ada data customer'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(c => (
                        <tr key={c.id} className="border-b border-hairline hover:bg-[#04123F]/[0.02] transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${avatarTone(c.nama)}`}>
                                {initials(c.nama)}
                              </div>
                              <p className="text-sm font-semibold text-ink">{c.nama}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <p className="text-xs font-mono text-ink">{c.no_wa}</p>
                          </td>
                          <td className="p-3.5">
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.alamat || '-'}</p>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#04123F]/[0.06] px-2.5 py-1 text-xs font-semibold text-[#04123F]">
                              {c.total_transaksi}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <p className="text-xs text-muted-foreground">{formatDate(c.transaksi_terakhir)}</p>
                          </td>
                          <td className="p-3.5">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setDetailId(c.id)} className="h-7 w-7 p-0">
                                <Eye size={13} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(c)} className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        title="Hapus Customer"
        description={
          <>
            Yakin ingin menghapus customer{' '}
            <span className="font-semibold text-foreground">{deleteConfirm?.nama}</span>? Data customer dan kaitannya
            dengan transaksi akan dihapus permanen.
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Detail Customer — sheet/drawer */}
      <CustomerDetailSheet
        key={detailId ?? 'closed'}
        open={!!detailId}
        customerId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}
