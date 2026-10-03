'use client'

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts'

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
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-3.5 min-w-[180px]">
      <p className="text-xs font-bold text-[#111827] mb-2.5">{label} {label && '2026'}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: entry.color }} />
              <span className="text-xs text-[#6B7280]">{entry.name}</span>
            </div>
            <span className="text-xs font-bold text-[#111827] tabular-nums">
              Rp {Number(entry.value).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveDot(props: any) {
  const { cx, cy, fill } = props
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
    />
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
  const avgOmzet = totalOmzet / (data.length || 1)

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
        {/* Summary stats */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#F8F9FC] px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} />
              <span className="text-[11px] text-[#6B7280] font-medium">Total Omzet</span>
            </div>
            <p className="text-sm font-bold text-[#111827] tabular-nums">Rp {totalOmzet.toLocaleString('id-ID')}</p>
          </div>
          <div className="rounded-xl bg-[#FEFBF0] px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: HONEY }} />
              <span className="text-[11px] text-[#6B7280] font-medium">Total Profit</span>
            </div>
            <p className="text-sm font-bold text-[#111827] tabular-nums">Rp {totalProfit.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 5, left: -16, bottom: 5 }}>
            <defs>
              <linearGradient id="grad-omzet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NAVY} stopOpacity={0.18} />
                <stop offset="100%" stopColor={NAVY} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="grad-profit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HONEY} stopOpacity={0.28} />
                <stop offset="100%" stopColor={HONEY} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#F1F3F7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={formatRupiah}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="omzet"
              stroke={false}
              fill="url(#grad-omzet)"
              name="Omzet"
              activeDot={<ActiveDot fill={NAVY} />}
            />
            <Line
              type="monotone"
              dataKey="omzet"
              stroke={NAVY}
              strokeWidth={2.5}
              dot={false}
              activeDot={<ActiveDot fill={NAVY} />}
              name="Omzet"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke={false}
              fill="url(#grad-profit)"
              name="Profit"
              activeDot={<ActiveDot fill={HONEY} />}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke={HONEY}
              strokeWidth={2.5}
              dot={false}
              activeDot={<ActiveDot fill={HONEY} />}
              name="Profit"
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 3 5-6" />
            </svg>
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
