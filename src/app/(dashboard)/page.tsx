'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchFinanceData } from '@/lib/finance'
import { Wrench, TrendingUp, DollarSign } from 'lucide-react'

import MonthPicker from '@/components/dashboard/MonthPicker'
import StatCard from '@/components/dashboard/StatCard'
import RevenueChart from '@/components/dashboard/RevenueChart'
import CategoryChart from '@/components/dashboard/CategoryChart'
import TopProducts from '@/components/dashboard/TopProducts'
import TopCustomers from '@/components/dashboard/TopCustomers'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
// PageHeader no longer used — inline header with new typography

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

interface DashboardStats {
  totalServis: number
  totalOmzet: number
  totalProfit: number
  totalBiaya: number
  unitTerjual: number
  sparepartDigunakan: number
}

export default function DashboardPage() {
  const { profile, isAdmin } = useAuth()
  const params = useSearchParams()
  const month = params?.get('m') ?? 'all'
  const year = params?.get('y') ?? String(new Date().getFullYear())

  const [stats, setStats] = useState<DashboardStats>({
    totalServis: 0, totalOmzet: 0, totalProfit: 0,
    totalBiaya: 0, unitTerjual: 0, sparepartDigunakan: 0
  })
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [marketplaceData, setMarketplaceData] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState({ sales: 0, omzet: 0, servis: 0 })

  useEffect(() => { fetchAll() }, [month, year])

  async function fetchAll() {
    try {
      const yearNum = Number(year)
      const monthNum = month === 'all' ? null : Number(month) + 1

      const { summary, services, sales, parts } = await fetchFinanceData({ year: yearNum, month: monthNum })

      const sparepartDigunakan = (parts || []).reduce((sum, p) => sum + (p.quantity || 0), 0)

      setStats({
        totalServis: services.length,
        totalOmzet: summary.omzetServis + summary.omzetPenjualan,
        totalProfit: summary.labaBersih,
        totalBiaya: 0,
        unitTerjual: summary.totalTransaksiUnit,
        sparepartDigunakan,
      })

      // Monthly chart data
      const monthly = summary.monthly.map((m) => ({
        name: MONTHS[m.month - 1].slice(0, 3),
        omzet: m.omzetServis + m.omzetPenjualan,
        profit: m.laba,
        biaya: m.biaya,
      }))
      setMonthlyData(monthly)

      // Category breakdown
      const servisProfit = summary.omzetServis - summary.modalSparepart
      const grossProfit = servisProfit + summary.marginUnit
      setCategoryData([
        {
          name: 'Servis',
          value: Math.round(servisProfit),
          pct: grossProfit > 0 ? Math.round((servisProfit / grossProfit) * 100) : 0,
        },
        {
          name: 'Unit Laptop',
          value: Math.round(summary.marginUnit),
          pct: grossProfit > 0 ? Math.round((summary.marginUnit / grossProfit) * 100) : 0,
        },
      ])

      // Laba vs Biaya
      const labaBersih = Math.max(0, summary.labaBersih)
      const biayaTotal = summary.biayaOperasional || 0
      const totalLabaBiaya = labaBersih + biayaTotal
      setMarketplaceData([
        { name: 'Laba Bersih', value: Math.round(labaBersih), pct: totalLabaBiaya > 0 ? Math.round((labaBersih / totalLabaBiaya) * 100) : 0 },
        { name: 'Biaya Operasional', value: Math.round(biayaTotal), pct: totalLabaBiaya > 0 ? Math.round((biayaTotal / totalLabaBiaya) * 100) : 0 },
      ])

      // Top products
      const productMap: Record<string, { qty: number; revenue: number; category: string }> = {}
      sales.forEach(s => {
        const prodName = s.product_name || s.product_id || 'Unknown'
        if (!productMap[prodName]) productMap[prodName] = { qty: 0, revenue: 0, category: 'Unit' }
        productMap[prodName].qty += s.quantity || 1
        productMap[prodName].revenue += s.sell_price || 0
      })
      const topProds = Object.entries(productMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
      setTopProducts(topProds)

      // Top customers
      const customerMap: Record<string, { total: number; count: number }> = {}
      services.forEach(s => {
        const name = s.customer_name || 'Unknown'
        if (!customerMap[name]) customerMap[name] = { total: 0, count: 0 }
        customerMap[name].total += s.total_fee || 0
        customerMap[name].count += 1
      })
      sales.forEach(s => {
        const name = s.buyer_name || 'Unknown'
        if (!customerMap[name]) customerMap[name] = { total: 0, count: 0 }
        customerMap[name].total += s.sell_price || 0
        customerMap[name].count += 1
      })
      const topCust = Object.entries(customerMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
      setTopCustomers(topCust)

      // Recent transactions
      const recent = [
        ...services.map(s => ({
          id: s.id,
          type: 'servis' as const,
          title: `Servis ${s.nota_number}`,
          subtitle: `${s.customer_name} · ${s.device_type}`,
          amount: s.total_fee || 0,
          date: s.created_at,
          status: s.status
        })),
        ...sales.map(s => ({
          id: s.id,
          type: 'sale' as const,
          title: `Penjualan Unit`,
          subtitle: s.buyer_name || 'Customer',
          amount: s.sell_price || 0,
          date: s.created_at,
          status: s.status
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentTransactions(recent)

      // Today's summary (from fetched data)
      const today = new Date().toISOString().slice(0, 10)
      const todaySales = sales.filter(s => s.created_at?.slice(0, 10) === today)
      const todayServices = services.filter(s => s.created_at?.slice(0, 10) === today)
      setTodayStats({
        sales: todaySales.length,
        omzet: todaySales.reduce((sum, s) => sum + (s.sell_price || 0), 0),
        servis: todayServices.length,
      })

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatRupiah = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`
  }

  const periodLabel = month === 'all'
    ? `Kumulatif Tahun ${year}`
    : `${MONTHS[Number(month)]} ${year}`

  const hasData = stats.totalOmzet > 0 || stats.totalServis > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-[#04123F] leading-tight tracking-tight" style={{ fontWeight: 800 }}>
            Dashboard POS
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            {isAdmin ? `Pantau bisnis toko laptop Anda — ${periodLabel}` : 'Aktivitas Anda hari ini'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <MonthPicker month={month} year={year} />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 gap-4 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <StatCard
          title="Total Servis"
          value={loading ? '...' : String(stats.totalServis)}
          sub={loading ? 'Memuat...' : `${stats.sparepartDigunakan} sparepart digunakan`}
          icon={Wrench}
        />
        {isAdmin && (
          <>
            <StatCard
              title="Total Omzet"
              value={loading ? '...' : formatRupiah(stats.totalOmzet)}
              sub={loading ? 'Memuat...' : `${stats.unitTerjual} unit terjual`}
              icon={DollarSign}
            />
            <StatCard
              title="Total Profit"
              value={loading ? '...' : formatRupiah(stats.totalProfit)}
              sub={loading ? 'Memuat...' : stats.totalOmzet > 0 ? `${((stats.totalProfit / stats.totalOmzet) * 100).toFixed(1)}% margin` : 'Belum ada penjualan'}
              icon={TrendingUp}
              highlight
            />
          </>
        )}
      </div>

      {/* Main Chart */}
      {isAdmin && (
        <RevenueChart
          data={monthlyData}
          title="Tren Bulanan"
          subtitle="Omzet dan profit per bulan"
          year={year}
        />
      )}

      {/* Analytics Section */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CategoryChart
            data={categoryData}
            title="Profit per Kategori"
            subtitle="Servis vs Unit Laptop"
          />
          <CategoryChart
            data={marketplaceData}
            title="Laba vs Biaya Operasional"
            subtitle="Sisa laba bersih setelah biaya bulan ini"
          />
        </div>
      )}

      {/* Top Products & Customers */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopProducts items={topProducts} limit={5} />
          <TopCustomers items={topCustomers} limit={5} />
        </div>
      )}

      {/* Recent Transactions */}
      <RecentTransactions items={recentTransactions} limit={20} isAdmin={isAdmin} />
    </div>
  )
}
