'use client'

import { useState, useEffect } from 'react'
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

function safeNum(v: unknown): number {
  if (v === null || v === undefined || typeof v === 'string' && (v === 'NaN' || v === '')) return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

function formatRupiah(value: number): string {
  return `Rp ${safeNum(value).toLocaleString('id-ID')}`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const omzetEntry = payload.find((e: any) => e.dataKey === 'omzet')
  const profitEntry = payload.find((e: any) => e.dataKey === 'profit')

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3 min-w-[170px]">
      <p className="text-xs font-bold text-[#111827] mb-2">{label}</p>
      <div className="space-y-1.5">
        {omzetEntry && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} />
              <span className="text-xs text-[#6B7280]">Total Omzet</span>
            </div>
            <span className="text-xs font-bold text-[#111827] tabular-nums">{formatRupiah(omzetEntry.value)}</span>
          </div>
        )}
        {profitEntry && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: HONEY }} />
              <span className="text-xs text-[#6B7280]">Total Profit</span>
            </div>
            <span className="text-xs font-bold text-[#111827] tabular-nums">{formatRupiah(profitEntry.value)}</span>
          </div>
        )}
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
    />
  )
}

export default function RevenueChart({ data, title, subtitle, year }: RevenueChartProps) {
  const [chartHeight, setChartHeight] = useState(320)

  useEffect(() => {
    function updateHeight() {
      setChartHeight(window.innerWidth >= 1024 ? 360 : 280)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  const formatYAxis = (value: number) => {
    if (value === 0) return '0'
    const n = safeNum(value)
    const abs = Math.abs(n)
    if (abs >= 1000000) return `${n < 0 ? '-' : ''}${Math.round(abs / 1000000)}M`
    if (abs >= 1000) return `${n < 0 ? '-' : ''}${Math.round(abs / 1000)}K`
    return String(n)
  }

  const hasData = data.some(d => safeNum(d.omzet) > 0 || safeNum(d.profit) > 0 || safeNum(d.biaya) > 0)
  const totalOmzet = data.reduce((sum, d) => sum + safeNum(d.omzet), 0)
  const totalProfit = data.reduce((sum, d) => sum + safeNum(d.profit), 0)

  return (
    <div className="card-premium p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
        <div>
          <h3 className="text-base font-bold text-[#111827]">
            {title}{year ? ` ${year}` : ''}
          </h3>
          {subtitle && (
            <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
          )}
        </div>
        {/* Summary pills */}
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-[#F8F9FC] px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: NAVY }} />
              <span className="text-[10px] text-[#6B7280] font-medium">Total Omzet</span>
            </div>
            <p className="text-xs font-bold text-[#111827] tabular-nums mt-0.5">{formatRupiah(totalOmzet)}</p>
          </div>
          <div className="rounded-lg bg-[#FEFBF0] px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ background: HONEY }} />
              <span className="text-[10px] text-[#6B7280] font-medium">Total Profit</span>
            </div>
            <p className="text-xs font-bold text-[#111827] tabular-nums mt-0.5">{formatRupiah(totalProfit)}</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: NAVY }} />
          <span className="text-[11px] font-medium text-[#6B7280]">Total Omzet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: HONEY }} />
          <span className="text-[11px] font-medium text-[#6B7280]">Total Profit</span>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F7" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="omzet"
              stroke="none"
              fill={NAVY}
              fillOpacity={0.06}
              name="Omzet"
              activeDot={false}
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
              stroke="none"
              fill={HONEY}
              fillOpacity={0.08}
              name="Profit"
              activeDot={false}
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
