import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'day 🌿 — Manajemen Kebun Sawit',
  description: 'Aplikasi manajemen operasional kebun sawit',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1B5E20',
              color: '#fff',
              fontWeight: '600',
              fontSize: '14px',
            },
            error: {
              style: { background: '#E53935', color: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
