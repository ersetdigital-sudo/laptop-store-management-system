'use client'

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface DailyChartProps {
  data: Array<{ date: string; omzet: number; profit: number }>
  title: string
  subtitle?: string
}

const formatRupiahShort = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
  return `${v}`
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

export default function DailyChart({ data, title, subtitle }: DailyChartProps) {
  return (
    <Card className="shadow-card transition-shadow hover:shadow-card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs text-ash">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOmzet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#04123F" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#04123F" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FEC40B" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#FEC40B" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#f0f0f0' }}
            />
            <YAxis
              tickFormatter={formatRupiahShort}
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#f0f0f0' }}
            />
            <Tooltip
              formatter={(value) => `Rp ${Number(value).toLocaleString('id-ID')}`}
              labelFormatter={(label) =>
                new Date(`${label}T00:00:00`).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              }
              contentStyle={{
                backgroundColor: '#04123F',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(4,18,63,0.25)',
                fontSize: '11px',
                color: '#fff',
              }}
              labelStyle={{ color: '#FEC40B', fontWeight: 700 }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" />
            <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#04123F" strokeWidth={2.5} fill="url(#gradOmzet)" />
            <Area type="monotone" dataKey="profit" name="Profit" stroke="#FEC40B" strokeWidth={2.5} fill="url(#gradProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
