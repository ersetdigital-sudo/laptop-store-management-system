'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RupiahInput } from '@/components/ui/rupiah-input'
import type { Product } from '@/lib/supabase'

export interface SparepartItem {
  product_id: string
  name: string
  quantity: number
  price: number
  buy_price: number
  max_qty: number
}

export interface DeviceEntryData {
  device_type: string
  device_brand: string
  device_model: string
  kelengkapan: string
  complaint: string
  notes: string
  service_fee: number
  items: SparepartItem[]
}

interface DeviceEntryProps {
  index: number
  data: DeviceEntryData
  spareparts: Product[]
  formatRupiah: (n: number) => string
  onChange: (data: DeviceEntryData) => void
  onRemove: () => void
  canRemove: boolean
}

export function DeviceEntry({ index, data, spareparts, formatRupiah, onChange, onRemove, canRemove }: DeviceEntryProps) {
  const parts_fee = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const parts_modal = data.items.reduce((sum, item) => sum + item.buy_price * item.quantity, 0)
  const deviceTotal = data.service_fee + parts_fee

  function updateField<K extends keyof DeviceEntryData>(field: K, value: DeviceEntryData[K]) {
    onChange({ ...data, [field]: value })
  }

  function addSparepart() {
    onChange({ ...data, items: [...data.items, { product_id: '', name: '', quantity: 0, price: 0, buy_price: 0, max_qty: 0 }] })
  }

  function updateItem(i: number, field: keyof SparepartItem, value: string | number) {
    const updated = [...data.items]
    if (field === 'product_id') {
      const product = spareparts.find(p => p.id === value)
      if (product) {
        updated[i] = {
          ...updated[i],
          product_id: product.id,
          name: product.name,
          price: product.sell_price || product.buy_price,
          buy_price: product.buy_price || 0,
          max_qty: product.quantity,
          quantity: 1,
        }
      }
    } else {
      updated[i] = { ...updated[i], [field]: value }
    }
    onChange({ ...data, items: updated })
  }

  function removeItem(i: number) {
    onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="rounded-xl border border-[#04123F]/10 bg-[#04123F]/[0.02] p-4">
      {/* Header: device number + remove button */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#04123F]/10">
            <span className="text-xs font-bold text-[#04123F]">{index + 1}</span>
          </div>
          <h4 className="text-sm font-bold text-[#04123F]">Perangkat</h4>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 items-center gap-1 rounded-md border border-destructive/30 px-2 text-[11px] font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={12} /> Hapus Perangkat
          </button>
        )}
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Jenis Perangkat <span className="text-destructive">*</span>
          </label>
          <select
            value={data.device_type}
            onChange={e => updateField('device_type', e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option>Laptop</option><option>PC</option><option>Printer</option><option>Lainnya</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Merk</label>
          <Input type="text" value={data.device_brand} onChange={e => updateField('device_brand', e.target.value)} className="h-10 w-full" placeholder="Contoh: Asus" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Model/Tipe</label>
          <Input type="text" value={data.device_model} onChange={e => updateField('device_model', e.target.value)} className="h-10 w-full" placeholder="Contoh: ROG" />
        </div>
      </div>

      {/* Kelengkapan */}
      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Kelengkapan</label>
        <Input type="text" value={data.kelengkapan} onChange={e => updateField('kelengkapan', e.target.value)} className="h-10 w-full" placeholder="Contoh: Charger, Tas, Unit saja" />
      </div>

      {/* Complaint */}
      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keluhan/Kerusakan</label>
        <textarea
          value={data.complaint}
          onChange={e => updateField('complaint', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder="Deskripsikan keluhan atau kerusakan perangkat..."
        />
      </div>

      {/* Keterangan / Tindakan per perangkat */}
      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Keterangan / Tindakan</label>
        <textarea
          value={data.notes}
          onChange={e => updateField('notes', e.target.value)}
          rows={2}
          className="w-full resize-none rounded-lg border border-input bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          placeholder="Tindakan / keterangan untuk perangkat ini..."
        />
      </div>

      {/* Sparepart yang Dipakai */}
      <div className="mt-3 rounded-lg border border-dashed border-[#04123F]/15 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h5 className="text-xs font-bold text-[#04123F]">Sparepart yang Dipakai</h5>
            <p className="text-[10px] text-muted-foreground">Stok otomatis berkurang saat servis disimpan</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addSparepart} className="h-7 gap-1.5 text-[11px]">
            <Plus size={12} /> Tambah
          </Button>
        </div>

        {data.items.length === 0 && (
          <p className="py-3 text-center text-[11px] text-muted-foreground">Belum ada sparepart ditambahkan</p>
        )}

        <div className="space-y-2">
          {data.items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <select
                    value={item.product_id}
                    onChange={e => updateItem(i, 'product_id', e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-surface px-2 text-xs"
                  >
                    <option value="">Pilih sparepart...</option>
                    {spareparts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (stok: {p.quantity}) — {formatRupiah(p.sell_price || p.buy_price)}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeItem(i)} className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-muted-foreground">Qty:</label>
                    <input
                      type="number"
                      min={1}
                      max={item.max_qty || 999}
                      value={item.quantity || ''}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 0)}
                      onBlur={e => { if (!e.target.value || Number(e.target.value) < 1) updateItem(i, 'quantity', 1) }}
                      className="h-9 w-16 rounded-md border border-input bg-surface px-2 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-[10px] text-muted-foreground shrink-0">Harga:</label>
                    <RupiahInput
                      value={item.price}
                      onChange={v => updateItem(i, 'price', v)}
                      className="h-9 min-w-0 flex-1 text-xs"
                    />
                  </div>
                  <div className="text-xs font-mono font-medium text-foreground shrink-0">
                    = {formatRupiah(item.price * item.quantity)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Biaya Jasa per device */}
      <div className="mt-3">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Biaya Jasa (Rp)
        </label>
        <RupiahInput value={data.service_fee} onChange={v => updateField('service_fee', v)} className="h-10 w-full font-mono" />
      </div>

      {/* Per-device summary */}
      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#04123F]/[0.04] px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Sparepart: <span className="font-mono">{formatRupiah(parts_fee)}</span>
          {parts_modal > 0 && <span className="ml-2 text-stone">Modal: {formatRupiah(parts_modal)}</span>}
        </span>
        <span className="font-mono font-bold text-[#04123F]">{formatRupiah(deviceTotal)}</span>
      </div>
    </div>
  )
}
