import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  highlight?: boolean
  color?: string
  compact?: boolean
  className?: string
}

export default function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  highlight = false,
  compact = false,
  className = ''
}: StatCardProps) {
  const accent = highlight ? '#059669' : undefined

  if (compact) {
    return (
      <div className={cn('card-premium flex flex-col items-center text-center p-3 gap-2 lg:flex-row lg:items-center lg:text-left lg:p-4 lg:gap-4', className)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#04123F] lg:h-11 lg:w-11 lg:rounded-xl">
          <Icon className="h-4 w-4 text-white lg:h-5 lg:w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 w-full lg:w-auto">
          <p className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wide leading-none truncate lg:text-[10px] lg:truncate-none">
            {title}
          </p>
          <p
            className="mt-1 text-sm font-bold leading-tight tabular-nums text-[#111827] break-words lg:text-xl"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[10px] leading-tight truncate lg:text-[11px] lg:truncate-none lg:break-words" style={{ color: accent ?? '#9CA3AF' }}>
              {sub}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card-premium flex items-center gap-4 p-4', className)}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#04123F]">
        <Icon className="h-5 w-5 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide leading-none">
          {title}
        </p>
        <p
          className="mt-1 text-base sm:text-xl font-bold leading-tight tabular-nums text-[#111827] break-words"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-[11px] leading-tight break-words" style={{ color: accent ?? '#9CA3AF' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
