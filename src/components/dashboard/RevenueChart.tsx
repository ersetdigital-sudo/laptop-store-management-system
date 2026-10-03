'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

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
const LIGHT_GRAY = '#E5E7EB'

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

  return (
    <div className="card-premium p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-2">
        <div>
          <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
            {title}{year ? ` ${year}` : ''}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} />
            <span className="text-xs text-[#6B7280] font-medium">Omzet</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: HONEY }} />
            <span className="text-xs text-[#6B7280] font-medium">Profit</span>
          </div>
          {data[0]?.biaya !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#D1D5DB' }} />
              <span className="text-xs text-[#6B7280] font-medium">Biaya</span>
            </div>
          )}
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 0, left: -16, bottom: 5 }}>
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
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F8F9FC' }} />
            <Bar dataKey="omzet" fill={NAVY} name="Omzet" radius={[6, 6, 0, 0]} maxBarSize={32} />
            <Bar dataKey="profit" fill={HONEY} name="Profit" radius={[6, 6, 0, 0]} maxBarSize={32} />
            {data[0]?.biaya !== undefined && (
              <Bar dataKey="biaya" fill="#D1D5DB" name="Biaya" radius={[6, 6, 0, 0]} maxBarSize={32} />
            )}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] mb-4">
            <BarChart size={26} className="text-[#9CA3AF]" />
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
