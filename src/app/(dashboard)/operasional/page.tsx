'use client'

import { useEffect, useState } from 'react'
import { supabase, OperationalCost } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Plus, Trash2, Edit, CalendarDays, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { RupiahInput } from '@/components/ui/rupiah-input'
import PageHeader from '@/components/dashboard/PageHeader'

const labelClass = 'mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground'
const textareaClass = 'w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20'

export default function OperasionalPage() {
  const { user } = useAuth()
  const [costs, setCosts] = useState<OperationalCost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCost, setEditingCost] = useState<OperationalCost | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OperationalCost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth() + 1, year: now.getFullYear() }
  })

  useEffect(() => { fetchCosts() }, [filterMonth])

  async function fetchCosts() {
    try {
      const { data, error } = await supabase
        .from('operational_costs')
        .select('*')
        .eq('period_month', filterMonth.month)
        .eq('period_year', filterMonth.year)
        .order('cost_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setCosts(data || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleDeleteCost() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await supabase.from('operational_costs').delete().eq('id', deleteTarget.id)
      setDeleteTarget(null)
      fetchCosts()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  const totalBiaya = costs.reduce((sum, c) => sum + c.amount, 0)
  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  if (loading) return <div className="flex items-center justify-center p-12"><div className="spinner" /></div>

  return (
    <div className="space-y-3">
      <PageHeader title="Biaya Operasional" subtitle="Kelola biaya operasional bulanan">
        <Button onClick={() => { setEditingCost(null); setShowForm(true) }} className="gap-2">
          <Plus size={16} strokeWidth={2} />
          Tambah Biaya
        </Button>
      </PageHeader>

      {/* Filter bulan */}
      <Card className="shadow-card">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            <select
              value={filterMonth.month}
              onChange={e => setFilterMonth({ ...filterMonth, month: Number(e.target.value) })}
              className="h-9 w-[160px] rounded-lg border border-input bg-surface px-3 text-sm"
            >
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={filterMonth.year}
              onChange={e => setFilterMonth({ ...filterMonth, year: Number(e.target.value) })}
              className="h-9 w-[120px] rounded-lg border border-input bg-surface px-3 text-sm"
            >
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Hero total — ala category-spend-detail */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-danger to-danger/85 text-white shadow-card">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
              Total Biaya Operasional
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums sm:text-2xl">{formatRupiah(totalBiaya)}</p>
            <p className="mt-0.5 text-[11px] text-white/70">
              {costs.length} item biaya · {months[filterMonth.month - 1]} {filterMonth.year}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20">
            <TrendingDown className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* List */}
      {costs.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-sm font-medium text-foreground">Belum ada biaya</p>
            <p className="text-xs text-muted-foreground mt-1">Tambah biaya operasional bulan ini</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View — ala category-spend-detail */}
          <div className="block lg:hidden space-y-2.5">
            {costs.map(c => (
              <Card key={c.id} className="shadow-card">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
                      <TrendingDown className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                      {c.notes && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.notes}</p>}
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-stone">
                        <CalendarDays size={10} />
                        {c.cost_date ? new Date(`${c.cost_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold font-mono text-danger">{formatRupiah(c.amount)}</p>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2.5">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCost(c); setShowForm(true) }} className="h-7 px-2.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground">
                      <Edit size={12} /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)} className="h-7 px-2.5 text-[10px] gap-1 text-muted-foreground hover:text-destructive">
                      <Trash2 size={12} /> Hapus
                    </Button>
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
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Nama Biaya</th>
                        <th className="p-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Jumlah</th>
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Tanggal</th>
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Catatan</th>
                        <th className="p-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.map(c => (
                        <tr key={c.id} className="border-b border-border transition-colors hover:bg-secondary/30">
                          <td className="p-3 text-sm font-medium text-foreground">{c.name}</td>
                          <td className="p-3 text-right text-sm font-semibold text-danger">{formatRupiah(c.amount)}</td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {c.cost_date ? new Date(`${c.cost_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{c.notes || '-'}</td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingCost(c); setShowForm(true) }} className="h-7 w-7 p-0">
                                <Edit size={13} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(c)} className="h-7 w-7 p-0">
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
        </>
      )}

      {showForm && (
        <OperasionalForm
          cost={editingCost}
          month={filterMonth.month}
          year={filterMonth.year}
          userId={user?.id}
          onClose={() => { setShowForm(false); setEditingCost(null) }}
          onSaved={fetchCosts}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        title="Hapus Biaya"
        description={
          <>
            Yakin ingin menghapus biaya{' '}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span> ({deleteTarget && formatRupiah(deleteTarget.amount)})? Data ini tidak dapat dikembalikan.
          </>
        }
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        loading={deleting}
        onConfirm={handleDeleteCost}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function OperasionalForm({ cost, month, year, userId, onClose, onSaved }: {
  cost: OperationalCost | null; month: number; year: number; userId?: string; onClose: () => void; onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: cost?.name || '',
    amount: cost?.amount || 0,
    cost_date: cost?.cost_date || new Date().toISOString().split('T')[0],
    notes: cost?.notes || '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (cost) {
        const { error } = await supabase.from('operational_costs').update({
          name: form.name,
          amount: form.amount,
          cost_date: form.cost_date || null,
          notes: form.notes || null,
        }).eq('id', cost.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('operational_costs').insert({
          name: form.name,
          amount: form.amount,
          period_month: month,
          period_year: year,
          cost_date: form.cost_date || null,
          notes: form.notes || null,
          created_by: userId,
        })
        if (error) throw error
      }
      onSaved(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally { setLoading(false) }
  }

  return (
    <Modal title={cost ? 'Edit Biaya' : 'Tambah Biaya'} onClose={onClose} maxWidth="sm">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section: Informasi Biaya */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#04123F]" />
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Informasi Biaya</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">Nama Biaya *</label>
            <Input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Sewa Tempat, Listrik" className="h-10 w-full" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">Jumlah (Rp) *</label>
            <RupiahInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} className="h-10 w-full font-mono" />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-gray-500">Tanggal Biaya *</label>
            <input
              type="date"
              required
              value={form.cost_date}
              onChange={e => setForm({ ...form, cost_date: e.target.value })}
              className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Section: Catatan */}
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[#FEC40B]" />
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wide">Catatan (Opsional)</p>
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Tambahkan catatan untuk biaya ini..." className={textareaClass} />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-2 border-t border-hairline pt-4 sm:flex-row">
          <Button type="button" onClick={onClose} variant="secondary" className="h-11 w-full sm:flex-1">Batal</Button>
          <Button type="submit" disabled={loading} className="h-11 w-full sm:flex-1">{loading ? 'Menyimpan...' : 'Simpan'}</Button>
        </div>
      </form>
    </Modal>
  )
}
