'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp } from './useCountUp'
import { resolveTrend } from '@/lib/trend'

const TONES = {
  emerald: { glow: '#10b981' },
  sky: { glow: '#0ea5e9' },
  orange: { glow: '#f97316' },
  danger: { glow: '#ef4444' },
  primary: { glow: '#FEC40B' },
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
  const isPrimary = tone === 'primary'
  const glow = TONES[tone].glow

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover',
        isPrimary
          ? 'bg-[#04123F] border border-[#04123F]'
          : 'bg-white border border-hairline',
        className,
      )}
    >
      {/* Subtle accent glow */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl"
        style={{ background: glow }}
      />

      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            isPrimary ? 'bg-[#FEC40B]' : 'bg-[#04123F]',
          )}
        >
          <Icon className={cn('h-5 w-5', isPrimary ? 'text-[#04123F]' : 'text-white')} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-[10px] font-semibold uppercase tracking-wide leading-none', isPrimary ? 'text-white/50' : 'text-gray-400')}>
            {title}
          </p>
          <p
            className={cn(
              'mt-1.5 break-words text-base font-bold leading-tight tabular-nums sm:text-lg lg:text-xl',
              value < 0 ? 'text-red-500' : isPrimary ? (tone === 'primary' ? 'text-white' : 'text-white') : 'text-gray-900',
            )}
          >
            {display}
          </p>
          {sub && (
            <p className={cn('mt-0.5 truncate text-[10px] font-medium', isPrimary ? 'text-white/40' : 'text-gray-400')}>
              {sub}
            </p>
          )}
        </div>
      </div>

      {trend && (
        <div className="relative mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold',
              trend.good ? 'bg-badge-success/10 text-badge-success' : 'bg-danger/10 text-danger',
            )}
          >
            {trend.up ? '↑' : '↓'} {trend.pct}%
          </span>
          <span className={cn('text-[10px]', isPrimary ? 'text-white/40' : 'text-muted-foreground')}>
            vs bln lalu
          </span>
        </div>
      )}
    </div>
  )
}
