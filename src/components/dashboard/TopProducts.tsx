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
  const maxQty = displayItems.length > 0 ? Math.max(...displayItems.map((i) => i.qty)) : 0

  const formatRupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111827]">Produk Terlaris</h3>
          <p className="text-xs text-[#6B7280] mt-0.5">Top {limit} produk berdasarkan quantity</p>
        </div>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F3F7] mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <p className="text-sm text-[#9CA3AF]">Belum ada data produk</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((item, index) => {
            const pct = maxQty > 0 ? Math.round((item.qty / maxQty) * 100) : 0
            const isTop = index === 0
            return (
              <div key={index} className="group">
                <div className="flex items-center gap-3 mb-1.5">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{
                      background: isTop ? '#FEC40B' : '#F1F3F7',
                      color: isTop ? '#04123F' : '#6B7280'
                    }}
                  >
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-[#111827] truncate flex-1 leading-tight">{item.name}</p>
                  <p className="text-sm font-semibold text-[#111827] tabular-nums shrink-0">{formatRupiah(item.revenue)}</p>
                </div>
                <div className="flex items-center gap-3 pl-9">
                  <div className="flex-1 h-1.5 rounded-full bg-[#F1F3F7] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: isTop ? '#FEC40B' : '#04123F'
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#9CA3AF] shrink-0 tabular-nums w-16 text-right">{item.qty} terjual</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
