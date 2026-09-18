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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }
  if (!user) return null
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
        <p className="text-muted-foreground text-sm">{profileError || 'Memuat profil...'}</p>
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

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`sidebar-panel ${open ? 'open' : ''} flex w-64 flex-col`}
        style={{
          background: 'var(--sidebar)',
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 no-underline w-full" onClick={() => setOpen(false)}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="white" strokeWidth="1.5"/>
                <line x1="6.5" y1="6" x2="13.5" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="6.5" y1="13" x2="10" y2="13" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-bold text-white leading-tight tracking-tight" style={{ wordBreak: 'break-word' }}>
                {storeName}
              </h1>
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
        <div className="mx-4 h-px bg-white/10" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-white/15 font-semibold text-white shadow-sm'
                    : 'font-medium text-white/60 hover:bg-white/10 hover:text-white/90'
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-3">
          <div className="mx-1 mb-2 h-px bg-white/10" />
          <div className="mb-2 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <span className="text-sm font-bold text-white">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{profile.name}</p>
              <p className="text-[11px] text-white/50 capitalize">{profile.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 rounded-xl border-none text-white/60 hover:text-white hover:bg-white/10 h-10"
            onClick={() => { signOut(); router.push('/login') }}
          >
            <LogOut size={16} />
            <span className="text-sm">Keluar</span>
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar - Clean minimal */}
        <header className="flex h-14 shrink-0 items-center justify-between bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setOpen(true)} 
              aria-label="Buka menu" 
              className="lg:hidden flex items-center justify-center h-10 w-10 -ml-2 border-none bg-transparent cursor-pointer text-foreground rounded-xl hover:bg-muted active:bg-muted transition-colors"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {currentPage?.label ?? 'Dashboard'}
              </h2>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
