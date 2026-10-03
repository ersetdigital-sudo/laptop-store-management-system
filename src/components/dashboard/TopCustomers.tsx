'use client'

import { Crown } from 'lucide-react'

interface TopCustomersProps {
  items: Array<{
    name: string
    total: number
    count: number
  }>
  limit?: number
}

const NAVY = '#04123F'
const HONEY = '#FEC40B'

export default function TopCustomers({ items, limit = 5 }: TopCustomersProps) {
  const displayItems = items.slice(0, limit)
  const maxTotal = displayItems.length > 0 ? displayItems[0].total : 1

  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const rankColors = [
    { bg: HONEY, text: NAVY, icon: true },
    { bg: '#E5E7EB', text: '#6B7280' },
    { bg: '#F3E8D8', text: '#92700C' },
  ]

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
          Customer Terbaik
        </h3>
        <p className="text-xs text-[#6B7280] mt-0.5">Top {limit} customer berdasarkan total belanja</p>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-[#9CA3AF]">Belum ada data customer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item, index) => {
            const rank = rankColors[index] || null
            const pct = Math.max(8, Math.round((item.total / maxTotal) * 100))
            return (
              <div key={index} className="group">
                <div className="flex items-center gap-3 mb-1.5">
                  {/* Rank badge */}
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 text-xs font-bold"
                    style={rank ? { background: rank.bg, color: rank.text } : { background: '#F1F3F7', color: '#9CA3AF' }}
                  >
                    {rank?.icon ? <Crown size={14} /> : index + 1}
                  </div>
                  {/* Avatar with initials */}
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0 text-xs font-bold"
                    style={{ background: '#EEF0F8', color: NAVY }}
                  >
                    {getInitials(item.name)}
                  </div>
                  {/* Name + count */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#111827] truncate leading-tight">{item.name}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{item.count} transaksi</p>
                  </div>
                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#111827] tabular-nums">{formatRupiah(item.total)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="ml-10 h-1.5 rounded-full bg-[#F1F3F7] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: index === 0 ? HONEY : NAVY }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
