'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ListChecks, PlusCircle, BarChart3,
  Wrench, Users, LogOut, Menu, X, Leaf, ChevronRight,
  FileText, Eye
} from 'lucide-react'
import type { SessionUser } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import SessionKeepAlive from './SessionKeepAlive'

interface LayoutProps {
  children: React.ReactNode
  user: SessionUser
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['admin', 'petugas', 'melihat'],
  },
  {
    href: '/data',
    label: 'Daftar Data',
    icon: <ListChecks size={18} />,
    roles: ['admin', 'petugas', 'melihat'],
  },
  {
    href: '/input',
    label: 'Input Data',
    icon: <PlusCircle size={18} />,
    roles: ['admin', 'petugas'],
  },
  {
    href: '/laporan',
    label: 'Laporan',
    icon: <BarChart3 size={18} />,
    roles: ['admin', 'petugas', 'melihat'],
  },
  {
    href: '/export',
    label: 'Export',
    icon: <FileText size={18} />,
    roles: ['admin', 'petugas'],
  },
  {
    href: '/users',
    label: 'Kelola Pengguna',
    icon: <Users size={18} />,
    roles: ['admin'],
    badge: 'Admin',
  },
  {
    href: '/admin',
    label: 'Pengaturan',
    icon: <Wrench size={18} />,
    roles: ['admin'],
    badge: 'Admin',
  },
]

const ROLE_BADGE: Record<string, React.ReactNode> = {
  admin: <span className="badge-admin">Admin</span>,
  petugas: <span className="badge-petugas">Petugas</span>,
  melihat: <span className="badge-melihat"><Eye size={10} className="inline mr-1" />Melihat</span>,
}

export default function Layout({ children, user }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role))

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Gagal logout')
    } finally {
      setLoggingOut(false)
    }
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-5 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FFD84D] border-2 border-black rounded-lg flex items-center justify-center shadow-[3px_3px_0_#111]">
            <Leaf className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="text-black font-black text-lg leading-none">day</div>
            <div className="text-black/70 text-[10px] leading-tight font-bold">Kebun Sawit</div>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b-2 border-black">
        <div className="bg-white rounded-lg border-2 border-black px-3 py-2.5 shadow-[3px_3px_0_#111]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-[#A7F3D0] border-2 border-black rounded-full flex items-center justify-center">
              <span className="text-black text-xs font-black">
                {user.nama.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-black font-black text-sm truncate">{user.nama}</span>
          </div>
          <div>{ROLE_BADGE[user.role]}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx('nav-item', isActive && 'active')}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={14} className="text-white/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t-2 border-black">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="nav-item w-full bg-[#FF4D4D] hover:bg-[#FF7A7A]"
        >
          <LogOut size={18} />
          <span>{loggingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9FBF2]">
      {/* Session keep-alive — mencegah logout otomatis */}
      <SessionKeepAlive />

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#B6FF63] border-r-4 border-black flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-72 bg-[#B6FF63] border-r-4 border-black z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-[#FF4D4D]"
            >
              <X size={20} />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#B6FF63] border-b-4 border-black">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-black p-1.5 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_#111]"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Leaf className="w-5 h-5 text-black" />
            <span className="text-black font-black">day</span>
          </div>
          <div>{ROLE_BADGE[user.role]}</div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
