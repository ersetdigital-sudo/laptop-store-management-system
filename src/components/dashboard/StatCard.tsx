import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  highlight?: boolean
  color?: string
  className?: string
}

export default function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  highlight = false,
  className = ''
}: StatCardProps) {
  const accent = highlight ? '#059669' : undefined

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
