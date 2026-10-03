'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface CategoryChartProps {
  data: Array<{
    name: string
    value: number
    pct?: number
  }>
  title: string
  subtitle?: string
}

const NAVY = '#04123F'
const HONEY = '#FEC40B'
const COLORS = [NAVY, HONEY, '#9CA3AF', '#3B82F6', '#DC2626', '#D1D5DB']

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3">
      <p className="text-xs font-semibold text-[#111827]">{item.payload.name}</p>
      <p className="text-xs text-[#6B7280] mt-1 tabular-nums">
        Rp {Number(item.payload.value).toLocaleString('id-ID')}
      </p>
    </div>
  )
}

export default function CategoryChart({ data, title, subtitle }: CategoryChartProps) {
  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const hasData = data.some(d => d.value > 0)
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="card-premium p-5 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
        )}
      </div>

      {hasData ? (
        <div className="flex flex-col gap-4">
          {/* Donut Chart */}
          <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] text-[#9CA3AF] font-medium">Total</p>
              <p className="text-sm font-bold text-[#111827] tabular-nums">
                {formatRupiah(total)}
              </p>
            </div>
          </div>

          {/* Legend with values */}
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-[#6B7280] truncate font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.pct !== undefined && (
                    <span className="text-[11px] text-[#9CA3AF] tabular-nums">{item.pct}%</span>
                  )}
                  <span className="text-xs font-semibold text-[#111827] tabular-nums">
                    {formatRupiah(item.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F3F7] mb-3">
            <PieChart size={22} className="text-[#9CA3AF]" />
          </div>
          <p className="text-sm font-semibold text-[#111827] mb-1">Belum ada data</p>
          <p className="text-xs text-[#6B7280] max-w-[220px]">
            Data akan muncul setelah ada transaksi tercatat.
          </p>
        </div>
      )}
    </div>
  )
}
