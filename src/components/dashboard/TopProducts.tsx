import { Badge } from '@/components/ui/badge'

interface TopProductsProps {
  items: Array<{
    name: string
    qty: number
    revenue: number
    category?: string
  }>
  limit?: number
}

export default function TopProducts({ items, limit = 5 }: TopProductsProps) {
  const displayItems = items.slice(0, limit)

  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
          Produk Terlaris
        </h3>
        <p className="text-xs text-[#6B7280] mt-0.5">Top {limit} produk berdasarkan quantity</p>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-[#9CA3AF]">Belum ada data produk</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F8F9FC] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 text-xs font-bold"
                  style={{
                    background: index === 0 ? '#FEF9C3' : '#F1F3F7',
                    color: index === 0 ? '#B45309' : '#6B7280',
                  }}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827] truncate leading-tight">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#9CA3AF]">{item.qty} terjual</span>
                    {item.category && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-[#111827] tabular-nums">{formatRupiah(item.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
