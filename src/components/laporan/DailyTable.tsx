'use client'

import { ShoppingCart, Wrench, PackageX, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DailyRow {
  date: string
  omzetServis: number
  omzetUnit: number
  marginUnit: number
  pembelianSparepart: number
  profit: number
  countServis: number
  countUnit: number
}

interface DailyTableProps {
  rows: DailyRow[]
  onDayClick?: (date: string) => void
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTanggal = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', opts)

export default function DailyTable({ rows, onDayClick }: DailyTableProps) {
  const totals = rows.reduce(
    (acc, d) => ({
      omzetServis: acc.omzetServis + d.omzetServis,
      omzetUnit: acc.omzetUnit + d.omzetUnit,
      marginUnit: acc.marginUnit + d.marginUnit,
      pembelianSparepart: acc.pembelianSparepart + d.pembelianSparepart,
      profit: acc.profit + d.profit,
      countServis: acc.countServis + d.countServis,
      countUnit: acc.countUnit + d.countUnit,
    }),
    { omzetServis: 0, omzetUnit: 0, marginUnit: 0, pembelianSparepart: 0, profit: 0, countServis: 0, countUnit: 0 },
  )

  const profitClass = (v: number) => (v >= 0 ? 'text-emerald-600' : 'text-red-600')

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
      {/* Mobile Card View */}
      <div className="block divide-y divide-hairline lg:hidden">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Belum ada data harian</div>
        ) : rows.map(d => (
          <div key={d.date} onClick={() => onDayClick?.(d.date)} className={`p-3 space-y-2 ${onDayClick ? 'cursor-pointer hover:bg-secondary/30 transition-colors' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                {formatTanggal(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-[10px] text-stone">{d.countServis + d.countUnit} transaksi</p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wrench size={12} className="shrink-0" />
                <span>Omzet Servis</span>
                <span className="ml-auto font-mono font-medium text-ink">{formatRupiah(d.omzetServis)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShoppingCart size={12} className="shrink-0" />
                <span>Omzet Unit</span>
                <span className="ml-auto font-mono font-medium text-ink">{formatRupiah(d.omzetUnit)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp size={12} className="shrink-0" />
                <span>Margin Unit</span>
                <span className="ml-auto font-mono font-medium text-badge-success">{formatRupiah(d.marginUnit)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <PackageX size={12} className="shrink-0" />
                <span>Pembelian Sparepart</span>
                <span className="ml-auto font-mono font-medium text-danger">{formatRupiah(d.pembelianSparepart)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-hairline pt-1.5">
              <span className="text-[10px] text-muted-foreground">Profit Hari Ini</span>
              <span className={cn('text-sm font-bold font-mono', profitClass(d.profit))}>{formatRupiah(d.profit)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-hairline bg-[#04123F]/[0.02]">
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tanggal</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Omzet Servis</th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Servis</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Omzet Unit</th>
              <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Unit</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Margin Unit</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Pembelian Sparepart</th>
              <th className="p-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs text-stone">Belum ada data harian</td>
              </tr>
            ) : rows.map(d => (
              <tr key={d.date} onClick={() => onDayClick?.(d.date)} className={`border-b border-hairline transition-colors ${onDayClick ? 'cursor-pointer hover:bg-[#04123F]/[0.02]' : 'hover:bg-[#04123F]/[0.01]'}`}>
                <td className="p-3 text-xs font-medium text-gray-900">
                  {formatTanggal(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                </td>
                <td className="p-3 text-right font-mono text-xs text-gray-700">{formatRupiah(d.omzetServis)}</td>
                <td className="p-3 text-center text-xs text-gray-500">{d.countServis}</td>
                <td className="p-3 text-right font-mono text-xs text-gray-700">{formatRupiah(d.omzetUnit)}</td>
                <td className="p-3 text-center text-xs text-gray-500">{d.countUnit}</td>
                <td className="p-3 text-right font-mono text-xs text-emerald-600">{formatRupiah(d.marginUnit)}</td>
                <td className="p-3 text-right font-mono text-xs text-red-600">
                  {d.pembelianSparepart > 0 ? formatRupiah(d.pembelianSparepart) : '-'}
                </td>
                <td className={cn('p-3 text-right font-mono text-xs font-bold', profitClass(d.profit))}>
                  {formatRupiah(d.profit)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-hairline-strong bg-[#04123F]/[0.03]">
                <td className="p-3 text-xs font-bold uppercase text-gray-900">Total</td>
                <td className="p-3 text-right font-mono text-xs font-bold text-gray-900">{formatRupiah(totals.omzetServis)}</td>
                <td className="p-3 text-center text-xs font-bold text-gray-900">{totals.countServis}</td>
                <td className="p-3 text-right font-mono text-xs font-bold text-gray-900">{formatRupiah(totals.omzetUnit)}</td>
                <td className="p-3 text-center text-xs font-bold text-gray-900">{totals.countUnit}</td>
                <td className="p-3 text-right font-mono text-xs font-bold text-emerald-600">{formatRupiah(totals.marginUnit)}</td>
                <td className="p-3 text-right font-mono text-xs font-bold text-red-600">{formatRupiah(totals.pembelianSparepart)}</td>
                <td className={cn('p-3 text-right font-mono text-sm font-bold', profitClass(totals.profit))}>
                  {formatRupiah(totals.profit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
