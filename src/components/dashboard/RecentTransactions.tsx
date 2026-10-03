import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  type: 'servis' | 'sale' | 'purchase'
  title: string
  subtitle: string
  amount: number
  date: string
  status?: string
}

interface RecentTransactionsProps {
  items: Transaction[]
  limit?: number
  isAdmin?: boolean
}

export default function RecentTransactions({ items, limit = 5, isAdmin = true }: RecentTransactionsProps) {
  const displayItems = items.slice(0, limit)

  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      servis: 'Servis',
      sale: 'Penjualan',
      purchase: 'Pembelian'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTypeStyle = (type: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      servis: { bg: '#EEF0F8', color: '#04123F' },
      sale: { bg: '#ECFDF5', color: '#059669' },
      purchase: { bg: '#F1F3F7', color: '#6B7280' },
    }
    return styles[type] || styles.purchase
  }

  return (
    <div className="card-premium p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#111827]" style={{ fontWeight: 700 }}>
            Transaksi Terbaru
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {limit} transaksi terakhir di periode ini
          </p>
        </div>
        <Link
          href="/laporan"
          className="text-xs text-[#04123F] font-medium hover:underline flex items-center gap-1 flex-shrink-0"
        >
          Lihat semua
          <ArrowRight size={12} />
        </Link>
      </div>

      {displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F3F7] mb-3">
            <Clock size={22} className="text-[#9CA3AF]" />
          </div>
          <p className="text-sm font-semibold text-[#111827] mb-1">Belum ada transaksi</p>
          <p className="text-xs text-[#6B7280]">Transaksi akan muncul di sini setelah ada penjualan atau servis.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => {
            const typeStyle = getTypeStyle(item.type)
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F8F9FC] transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: typeStyle.bg, color: typeStyle.color }}
                    >
                      {getTypeLabel(item.type)}
                    </span>
                    {item.status && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#111827] truncate leading-tight">{item.title}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5 leading-tight">{item.subtitle}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">{formatDate(item.date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {isAdmin ? (
                    <p className="text-sm font-semibold text-[#111827] tabular-nums">
                      {formatRupiah(item.amount)}
                    </p>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {item.status || 'Selesai'}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Clock({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 12 16" />
    </svg>
  )
}
