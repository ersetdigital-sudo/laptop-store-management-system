'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface RevenueChartProps {
  data: Array<{
    name: string
    omzet: number
    profit: number
    biaya?: number
  }>
  title: string
  subtitle?: string
  year?: string
}

const NAVY = '#04123F'
const HONEY = '#FEC40B'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3 min-w-[160px]">
      <p className="text-xs font-semibold text-[#111827] mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1 last:mb-0">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-xs text-[#6B7280]">{entry.name}</span>
          </div>
          <span className="text-xs font-semibold text-[#111827] tabular-nums">
            Rp {Number(entry.value).toLocaleString('id-ID')}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RevenueChart({ data, title, subtitle, year }: RevenueChartProps) {
  const formatRupiah = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
    return value.toString()
  }

  const hasData = data.some(d => d.omzet > 0 || d.profit > 0 || (d.biaya ?? 0) > 0)
  const totalOmzet = data.reduce((sum, d) => sum + d.omzet, 0)
  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0)

  return (
    <div className="card-premium p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-5 gap-3">
        <div>
          <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
            {title}{year ? ` ${year}` : ''}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
          )}
        </div>
        {/* Summary + Legend */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} />
              <span className="text-xs text-[#6B7280] font-medium">Omzet</span>
            </div>
            <p className="text-sm font-bold text-[#111827] tabular-nums">Rp {totalOmzet.toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: HONEY }} />
              <span className="text-xs text-[#6B7280] font-medium">Profit</span>
            </div>
            <p className="text-sm font-bold text-[#111827] tabular-nums">Rp {totalProfit.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -16, bottom: 5 }}>
            <defs>
              <linearGradient id="grad-omzet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.25} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HONEY} stopOpacity={0.35} />
                <stop offset="100%" stopColor={HONEY} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={{ stroke: '#F1F3F7' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatRupiah}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="omzet"
              stroke={NAVY}
              strokeWidth={2.5}
              fill="url(#grad-omzet)"
              name="Omzet"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke={HONEY}
              strokeWidth={2.5}
              fill="url(#grad-profit)"
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] mb-4">
            <AreaChart size={26} className="text-[#9CA3AF]" />
          </div>
          <p className="text-sm font-semibold text-[#111827] mb-1">Belum ada data transaksi</p>
          <p className="text-xs text-[#6B7280] max-w-[240px]">
            Data performa akan muncul setelah toko memiliki transaksi.
          </p>
        </div>
      )}
    </div>
  )
}
