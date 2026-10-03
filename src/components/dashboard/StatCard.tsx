import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  color?: 'navy' | 'honey' | 'neutral'
  dark?: boolean
  className?: string
}

const ICON_STYLES: Record<string, { bg: string; color: string }> = {
  navy: { bg: '#EEF0F8', color: '#04123F' },
  honey: { bg: '#FEF9C3', color: '#B45309' },
  neutral: { bg: '#F1F3F7', color: '#6B7280' },
}

export default function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color = 'navy',
  dark = false,
  className = ''
}: StatCardProps) {
  const iconStyle = ICON_STYLES[color]

  if (dark) {
    return (
      <div className={cn('rounded-2xl p-5 flex flex-col justify-between min-h-[120px]', className)}
        style={{ background: '#04123F' }}
      >
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wide leading-none" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {title}
          </p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Icon className="h-5 w-5" strokeWidth={2} style={{ color: '#FEC40B' }} />
          </div>
        </div>
        <div>
          <p className="text-[28px] font-bold leading-none tabular-nums text-white" style={{ fontWeight: 700 }}>
            {value}
          </p>
          {sub && (
            <span className="inline-block mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(254,196,11,0.15)', color: '#FEC40B' }}
            >
              {sub}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card-premium p-5 flex flex-col justify-between min-h-[120px]', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide leading-none">
          {title}
        </p>
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: iconStyle.bg }}>
          <Icon className="h-5 w-5" strokeWidth={2} style={{ color: iconStyle.color }} />
        </div>
      </div>
      <div>
        <p className="text-[28px] font-bold leading-none tabular-nums text-[#111827]" style={{ fontWeight: 700 }}>
          {value}
        </p>
        {sub && (
          <span className="inline-block mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: '#F1F3F7', color: '#6B7280' }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
