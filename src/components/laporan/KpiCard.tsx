'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp } from './useCountUp'
import { resolveTrend } from '@/lib/trend'

const TONES = {
  emerald: { tile: 'bg-emerald-50 text-emerald-600', bar: 'from-emerald-500' },
  sky: { tile: 'bg-sky-50 text-sky-600', bar: 'from-sky-500' },
  orange: { tile: 'bg-orange-50 text-orange-600', bar: 'from-orange-500' },
  danger: { tile: 'bg-red-50 text-red-600', bar: 'from-red-500' },
  primary: { tile: 'bg-[#04123F] text-white', bar: 'from-[#04123F]' },
} as const

interface KpiCardProps {
  title: string
  value: number
  format?: (n: number) => string
  sub?: string
  icon: LucideIcon
  tone?: keyof typeof TONES
  delta?: number | null
  invertDelta?: boolean
  className?: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n))

export default function KpiCard({
  title,
  value,
  format = formatRupiah,
  sub,
  icon: Icon,
  tone = 'primary',
  delta,
  invertDelta = false,
  className,
}: KpiCardProps) {
  const animated = useCountUp(value)
  const display = format(animated)
  const trend = delta != null ? resolveTrend(delta, invertDelta) : null

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-hairline bg-surface-card p-3.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        className,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent', TONES[tone].bar)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{title}</p>
          <p className={cn('mt-1.5 break-words text-base font-bold tabular-nums sm:text-lg lg:text-xl', value < 0 ? 'text-red-600' : 'text-gray-900')}>{display}</p>
          {sub && <p className="mt-0.5 truncate text-[10px] font-medium text-gray-400">{sub}</p>}
        </div>
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110', TONES[tone].tile)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
      {trend && (
        <div
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            trend.good ? 'bg-badge-success/10 text-badge-success' : 'bg-danger/10 text-danger',
          )}
        >
          {trend.up ? '↑' : '↓'} {trend.pct}%
          <span className="font-normal text-muted-foreground">vs bln lalu</span>
        </div>
      )}
    </div>
  )
}
