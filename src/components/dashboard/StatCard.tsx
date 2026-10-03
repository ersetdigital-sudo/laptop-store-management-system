import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  color?: 'navy' | 'honey' | 'success' | 'danger'
  valueClass?: string
  className?: string
}

const ICON_STYLES: Record<string, { bg: string; color: string }> = {
  navy: { bg: '#EEF0F8', color: '#04123F' },
  honey: { bg: '#FEF9C3', color: '#B45309' },
  success: { bg: '#ECFDF5', color: '#059669' },
  danger: { bg: '#FEF2F2', color: '#DC2626' },
}

const SUB_COLOR: Record<string, string> = {
  navy: '#6B7280',
  honey: '#6B7280',
  success: '#059669',
  danger: '#DC2626',
}

export default function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color = 'navy',
  valueClass = '',
  className = ''
}: StatCardProps) {
  const iconStyle = ICON_STYLES[color]
  const subColor = SUB_COLOR[color]

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-[#E5E7EB] p-5 transition-shadow',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ background: iconStyle.bg }}
        >
          <Icon className="h-5 w-5" strokeWidth={2} style={{ color: iconStyle.color }} />
        </div>
      </div>

      <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide leading-none">
        {title}
      </p>
      <p
        className="text-[26px] font-bold mt-1.5 leading-none tabular-nums text-[#111827]"
        style={{ fontWeight: 700 }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-xs font-medium mt-2 leading-none"
          style={{ color: subColor }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}
