import { User } from 'lucide-react'

interface TopCustomersProps {
  items: Array<{
    name: string
    total: number
    count: number
  }>
  limit?: number
}

export default function TopCustomers({ items, limit = 5 }: TopCustomersProps) {
  const displayItems = items.slice(0, limit)

  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

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
        <div className="space-y-2">
          {displayItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FC] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0" style={{ background: '#EEF0F8' }}>
                  <User size={16} className="text-[#04123F]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827] truncate leading-tight">{item.name}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{item.count} transaksi</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-[#111827] tabular-nums">{formatRupiah(item.total)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
