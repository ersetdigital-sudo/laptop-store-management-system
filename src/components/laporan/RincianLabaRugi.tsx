'use client'

import { cn } from '@/lib/utils'

interface RincianRow {
  label: string
  value: number
  kind: 'in' | 'out'
}

interface RincianLabaRugiProps {
  rows: RincianRow[]
  labaBersih: number
  periodLabel: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

export default function RincianLabaRugi({ rows, labaBersih, periodLabel }: RincianLabaRugiProps) {
  const max = Math.max(...rows.map(r => Math.abs(r.value)), 1)

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-card">
      {/* Navy Header */}
      <div className="flex items-center justify-between gap-2 bg-[#04123F] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold text-white">Rincian Laba Rugi</h2>
        <span className="truncate text-xs text-white/60">{periodLabel}</span>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className={cn('shrink-0 font-mono font-semibold', r.kind === 'in' ? 'text-emerald-600' : 'text-red-600')}>
                {r.kind === 'in' ? formatRupiah(r.value) : `-${formatRupiah(r.value)}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn('h-full rounded-full transition-all duration-700', r.kind === 'in' ? 'bg-emerald-500' : 'bg-red-500')}
                style={{ width: `${Math.min((Math.abs(r.value) / max) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Total — Navy + Gold */}
      <div className="flex items-center justify-between gap-2 border-t border-hairline bg-gray-50/50 px-4 py-3.5 sm:px-5">
        <span className="text-sm font-bold text-gray-900">= Laba Bersih</span>
        <span className={cn('text-lg font-bold tabular-nums sm:text-xl', labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600')}>
          {formatRupiah(labaBersih)}
        </span>
      </div>
    </div>
  )
}
