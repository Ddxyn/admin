'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Scale, Leaf, Calendar,
  PlusCircle, ArrowRight
} from 'lucide-react'
import { formatRupiah, formatAngka, formatTanggal, getHari } from '@/lib/format'
import type { SessionUser, Ringkasan, DataHarian } from '@/types'
import clsx from 'clsx'

const PIE_COLORS = ['#111111', '#FF4D4D', '#FFD84D', '#00B894', '#2563EB', '#A855F7', '#F97316']

interface Props {
  user: SessionUser
  ringkasanHarian: Ringkasan
  ringkasanMingguan: Ringkasan
  ringkasanBulanan: Ringkasan
  trendBulanan: Array<{ tanggal: string; total_pemasukan: number; total_pengeluaran: number; keuntungan: number; total_tonase: number }>
  pengeluaranKat: Array<{ kategori: string; total: number }>
  recentData: DataHarian[]
}

const TABS = ['Hari Ini', 'Minggu Ini', 'Bulan Ini'] as const
type Tab = typeof TABS[number]

export default function DashboardClient({
  user, ringkasanHarian, ringkasanMingguan, ringkasanBulanan,
  trendBulanan, pengeluaranKat, recentData
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Bulan Ini')

  const ringkasan = activeTab === 'Hari Ini' ? ringkasanHarian
    : activeTab === 'Minggu Ini' ? ringkasanMingguan
    : ringkasanBulanan

  const chartData = trendBulanan.map(d => ({
    tanggal: formatTanggal(d.tanggal).slice(0, 5),
    Pemasukan: Number(d.total_pemasukan),
    Pengeluaran: Number(d.total_pengeluaran),
    Tonase: Number(d.total_tonase),
  }))

  const formatTooltipValue = (value: unknown) => formatRupiah(Number(value ?? 0))

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950 uppercase">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-semibold">
            Selamat datang, <span className="font-black text-black">{user.nama}</span>
          </p>
        </div>
        {(user.role === 'admin' || user.role === 'petugas') && (
          <Link href="/input">
            <button className="btn-primary flex items-center gap-2">
              <PlusCircle size={16} />
              <span className="hidden sm:inline">Input Data</span>
            </button>
          </Link>
        )}
      </div>

      <div className="flex gap-1 bg-white border-2 border-black rounded-lg p-1 w-fit max-w-full overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black whitespace-nowrap transition-all',
              activeTab === tab
                ? 'bg-[#111111] text-white shadow-[3px_3px_0_#FFD84D]'
                : 'text-black hover:bg-[#FFD84D]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={clsx(
        'rounded-lg border-4 border-black p-6 shadow-[7px_7px_0_#111]',
        ringkasan.keuntungan >= 0 ? 'bg-[#B6FF63]' : 'bg-[#FF7A7A]'
      )}>
        <p className="text-black/70 text-sm font-black uppercase mb-1">Keuntungan Bersih</p>
        <p className="text-3xl sm:text-4xl font-black mb-5 text-black break-words">
          {formatRupiah(ringkasan.keuntungan)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Tonase', value: `${formatAngka(ringkasan.total_tonase)} kg`, icon: <Scale size={14} /> },
            { label: 'Tandan', value: `${ringkasan.total_tandan}`, icon: <Leaf size={14} /> },
            { label: 'Hari Kerja', value: `${ringkasan.jumlah_hari_kerja}`, icon: <Calendar size={14} /> },
          ].map(item => (
            <div key={item.label} className="bg-white border-2 border-black rounded-lg p-3">
              <div className="flex items-center gap-1 text-black/60 text-xs mb-0.5 font-black uppercase">
                {item.icon} {item.label}
              </div>
              <div className="font-black text-sm text-black">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#008F6B]">
            <TrendingUp size={18} />
            <span className="text-sm font-black uppercase text-gray-600">Pemasukan</span>
          </div>
          <div className="text-xl font-black text-[#008F6B] break-words">
            {formatRupiah(ringkasan.total_pemasukan)}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-[#D91F1F]">
            <TrendingDown size={18} />
            <span className="text-sm font-black uppercase text-gray-600">Pengeluaran</span>
          </div>
          <div className="text-xl font-black text-[#D91F1F] break-words">
            {formatRupiah(ringkasan.total_pengeluaran)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartData.length > 1 && (
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-black text-gray-950 mb-4 uppercase">Tren Bulan Ini</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111111" opacity={0.2} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => `${(v / 1e6).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="Pemasukan" stroke="#00B894" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="Pengeluaran" stroke="#FF4D4D" strokeWidth={3} dot={false} strokeDasharray="5 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="card p-5">
            <h3 className="font-black text-gray-950 mb-4 uppercase">Tonase per Hari</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#111111" opacity={0.2} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={35} />
                <Tooltip />
                <Bar dataKey="Tonase" fill="#111111" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {pengeluaranKat.length > 0 && (
          <div className="card p-5">
            <h3 className="font-black text-gray-950 mb-4 uppercase">Rincian Pengeluaran</h3>
            <div className="space-y-2.5">
              {pengeluaranKat.slice(0, 6).map((item, i) => {
                const total = pengeluaranKat.reduce((s, x) => s + x.total, 0)
                const pct = total > 0 ? (item.total / total) * 100 : 0
                return (
                  <div key={item.kategori}>
                    <div className="flex justify-between text-xs mb-1 gap-2">
                      <span className="text-gray-700 truncate max-w-[160px] font-bold">{item.kategori}</span>
                      <span className="font-black text-gray-950 text-right">
                        {formatRupiah(item.total)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-white border-2 border-black rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {recentData.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b-2 border-black">
            <h3 className="font-black text-gray-950 uppercase">Aktivitas Terbaru</h3>
            <Link href="/data" className="text-black text-sm font-black flex items-center gap-1 hover:underline whitespace-nowrap">
              Lihat semua <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y-2 divide-black">
            {recentData.map(dh => (
              <div key={dh.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#FFF3B0] transition-colors">
                <div className="w-12 h-12 bg-[#FFD84D] border-2 border-black rounded-lg flex flex-col items-center justify-center flex-shrink-0 shadow-[2px_2px_0_#111]">
                  <span className="text-lg font-black text-black leading-none">
                    {new Date(dh.tanggal).getDate()}
                  </span>
                  <span className="text-[10px] text-black/70 font-bold">{formatTanggal(dh.tanggal).split(' ')[1]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm text-gray-950">
                    {getHari(dh.tanggal)}, {formatTanggal(dh.tanggal)}
                  </div>
                  <div className="text-xs text-gray-500 truncate font-semibold">
                    {formatAngka(Number(dh.total_tonase))} kg - {dh.jumlah_supir} supir
                    {dh.created_by_nama && ` - oleh ${dh.created_by_nama}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <div className="text-sm font-black text-[#008F6B]">
                    {formatRupiah(Number(dh.total_pemasukan))}
                  </div>
                  <div className={clsx(
                    'text-xs font-black',
                    Number(dh.keuntungan) >= 0 ? 'text-[#008F6B]' : 'text-[#D91F1F]'
                  )}>
                    {formatRupiah(Number(dh.keuntungan))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
