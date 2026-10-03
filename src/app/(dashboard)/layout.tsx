'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Wrench, Laptop, Package, Receipt, FileText,
  BarChart3, Users, LogOut, Menu, X, ShoppingCart, Contact, Banknote,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ToastContainer } from '@/components/ui/toast'

const PAGE_SUBTITLES: Record<string, string> = {
  '/': 'Overview bisnis toko secara ringkas',
  '/unit-laptop/jual': 'Transaksi penjualan unit laptop',
  '/servis': 'Manajemen servis dan perbaikan',
  '/stok': 'Manajemen stok produk dan sparepart',
  '/customers': 'Daftar dan detail customer',
  '/riwayat-penjualan': 'Riwayat transaksi penjualan',
  '/kwitansi': 'Manajemen kwitansi dan pembayaran',
  '/operasional': 'Catatan biaya operasional toko',
  '/laporan': 'Laporan keuangan dan analitik',
  '/pengaturan': 'Pengaturan toko dan pengguna',
}

const getNavItems = (role: string) => {
  const base = [
    { href: '/',           label: 'Dashboard',  icon: LayoutDashboard, roles: ['admin', 'karyawan'] },
    { href: '/unit-laptop/jual', label: 'Jual Barang', icon: Banknote, roles: ['admin', 'karyawan'] },
    { href: '/servis',     label: 'Servis',      icon: Wrench,          roles: ['admin', 'karyawan'] },
    { href: '/stok',       label: 'Stok Barang', icon: Package,         roles: ['admin', 'karyawan'] },
    { href: '/customers',  label: 'Customer',    icon: Contact,         roles: ['admin', 'karyawan'] },
  ]
  const admin = [
    { href: '/riwayat-penjualan', label: 'Riwayat Penjualan', icon: ShoppingCart, roles: ['admin'] },
    { href: '/kwitansi',    label: 'Kwitansi',    icon: FileText,  roles: ['admin'] },
    { href: '/operasional', label: 'Operasional', icon: Receipt,  roles: ['admin'] },
    { href: '/laporan',     label: 'Laporan',     icon: BarChart3,roles: ['admin'] },
    { href: '/pengaturan',  label: 'Pengaturan',  icon: Users,    roles: ['admin'] },
  ]
  return [...base, ...admin].filter(i => i.roles.includes(role))
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileError, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [storeName, setStoreName] = useState('Kasir POS')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'store_name').maybeSingle()
      .then(({ data }) => { if (data?.value) setStoreName(data.value) })
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#04123F]" />
      </div>
    )
  }
  if (!user) return null
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-soft p-4">
        <p className="text-sm text-[#6B7280]">{profileError || 'Memuat profil...'}</p>
        {profileError && (
          <Button variant="secondary" onClick={() => { signOut(); router.push('/login') }}>
            Keluar & Login Ulang
          </Button>
        )}
      </div>
    )
  }

  const navItems = getNavItems(profile.role)
  const currentPage = navItems.find(n => n.href === pathname || (n.href !== '/' && pathname.startsWith(n.href)))
  const pageLabel = currentPage?.label ?? 'Dashboard'
  const pageSubtitle = PAGE_SUBTITLES[pathname] ?? PAGE_SUBTITLES[currentPage?.href ?? ''] ?? 'Kelola toko laptop Anda'

  return (
    <div className="flex min-h-screen bg-soft">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`sidebar-panel ${open ? 'open' : ''} flex flex-col`}
        style={{ background: '#04123F' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-5 shrink-0">
          <Link href="/" className="flex items-center gap-3 no-underline w-full" onClick={() => setOpen(false)}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FEC40B' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2.5" stroke="#04123F" strokeWidth="1.8"/>
                <line x1="6.5" y1="6" x2="13.5" y2="6" stroke="#04123F" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="#04123F" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="6.5" y1="13" x2="10" y2="13" stroke="#04123F" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-bold text-white leading-tight tracking-tight truncate" style={{ wordBreak: 'break-word' }}>
                {storeName}
              </h1>
              <p className="text-[11px] text-white/40 leading-tight mt-0.5">POS System</p>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="mobile-only ml-2 h-8 w-8 flex items-center justify-center rounded-lg border-none bg-white/10 cursor-pointer text-white/70 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline transition-all min-h-[44px]"
                style={
                  isActive
                    ? { background: '#FEC40B', color: '#04123F', fontWeight: 600 }
                    : { color: 'rgba(255,255,255,0.6)', fontWeight: 500 }
                }
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-3">
          <div className="mx-1 mb-3 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(254,196,11,0.15)', border: '1.5px solid rgba(254,196,11,0.3)' }}>
              <span className="text-sm font-bold" style={{ color: '#FEC40B' }}>
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
              <p className="text-[11px] capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.role}</p>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-2.5 rounded-xl px-3 h-10 text-sm transition-all border-none cursor-pointer"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
            onClick={() => { signOut(); router.push('/login') }}
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between bg-white px-4 sm:px-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              className="lg:hidden flex items-center justify-center h-10 w-10 -ml-2 border-none bg-transparent cursor-pointer text-[#111827] rounded-xl hover:bg-[#F1F3F7] transition-colors"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#111827] leading-tight">
                {pageLabel}
              </h2>
              <p className="text-xs text-[#6B7280] leading-tight mt-0.5 hidden sm:block">
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Slot for page-specific actions (filters, etc.) */}
            <div id="topbar-actions" className="flex items-center gap-2" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-soft">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
