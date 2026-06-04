'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { FileText, Printer, RefreshCw, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah, formatAngka, formatTanggal, getHari, monthRange } from '@/lib/format'
import type { Ringkasan, DataHarian } from '@/types'
import clsx from 'clsx'
import { downloadPdfReport, fetchDetailedData } from '@/lib/report-export'

type TabPeriod = 'minggu' | 'bulan' | 'custom'

interface StatsData {
  ringkasan: Ringkasan
  trend: Array<{ tanggal: string; total_pemasukan: number; total_pengeluaran: number; total_tonase: number }>
  pengeluaranKat: Array<{ kategori: string; total: number }>
  dateFrom: string
  dateTo: string
}

const CAT_COLORS = ['#111111','#FF4D4D','#FFD84D','#00B894','#2563EB','#A855F7','#F97316','#374151']

export default function LaporanClient({ userRole }: { userRole: string }) {
  const [tab, setTab] = useState<TabPeriod>('bulan')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [dataList, setDataList] = useState<DataHarian[]>([])
  const [loading, setLoading] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const canExport = userRole === 'admin' || userRole === 'petugas'

  const getRange = useCallback(() => {
    if (tab === 'minggu') {
      const now = new Date()
      const day = now.getDay()
      const diff = day === 0 ? 6 : day - 1
      const mon = new Date(now); mon.setDate(now.getDate() - diff)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
    }
    if (tab === 'custom') return { from: customFrom, to: customTo }
    return monthRange(year, month)
  }, [tab, year, month, customFrom, customTo])

  const load = useCallback(async () => {
    const { from, to } = getRange()
    if (!from || !to) return
    setLoading(true)
    try {
      const [statsRes, dataRes] = await Promise.all([
        fetch(`/api/stats?from=${from}&to=${to}`),
        fetch(`/api/data?from=${from}&to=${to}&limit=200`),
      ])
      const [statsJson, dataJson] = await Promise.all([statsRes.json(), dataRes.json()])
      if (!statsRes.ok) throw new Error(statsJson.error ?? 'Gagal memuat statistik')
      if (!dataRes.ok) throw new Error(dataJson.error ?? 'Gagal memuat data')
      setStats(statsJson)
      setDataList(dataJson.data ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }, [getRange])

  useEffect(() => { load() }, [load])

  const periodeLabel = () => {
    if (!stats) return ''
    return `${formatTanggal(stats.dateFrom)} - ${formatTanggal(stats.dateTo)}`
  }

  async function handleExportPDF() {
    if (!stats || dataList.length === 0) { toast.error('Tidak ada data'); return }
    setExportingPdf(true)
    try {
      const detailed = await fetchDetailedData(dataList)
      await downloadPdfReport(stats, detailed, periodeLabel())
      toast.success('PDF berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleShareWhatsApp() {
    if (!stats) { toast.error('Tidak ada laporan untuk dibagikan'); return }

    const r = stats.ringkasan
    const lines = [
      '*Laporan Operasional Kebun Sawit*',
      periodeLabel(),
      '',
      `Pemasukan: ${formatRupiah(r.total_pemasukan)}`,
      `Pengeluaran: ${formatRupiah(r.total_pengeluaran)}`,
      `Keuntungan: ${formatRupiah(r.keuntungan)}`,
      `Tonase: ${formatAngka(r.total_tonase)} kg`,
      `Tandan: ${r.total_tandan}`,
      `Hari kerja: ${r.jumlah_hari_kerja} hari`,
      '',
      'Dikirim dari day Web',
    ]

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer')
  }

  const chartData = (stats?.trend ?? []).map(d => ({
    tgl: formatTanggal(d.tanggal).slice(0, 5),
    Pemasukan: Number(d.total_pemasukan),
    Pengeluaran: Number(d.total_pengeluaran),
    Tonase: Number(d.total_tonase),
  }))

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-1 bg-white border-2 border-black rounded-lg p-1">
            {(['minggu', 'bulan', 'custom'] as TabPeriod[]).map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-black capitalize transition-all',
                  tab === item ? 'bg-[#111111] text-white shadow-[3px_3px_0_#FFD84D]' : 'text-black hover:bg-[#FFD84D]'
                )}
              >
                {item === 'minggu' ? 'Mingguan' : item === 'bulan' ? 'Bulanan' : 'Custom'}
              </button>
            ))}
          </div>

          {tab === 'bulan' && (
            <div className="flex items-center gap-2">
              <select className="input py-2" value={month} onChange={e => setMonth(+e.target.value)}>
                {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              <select className="input py-2" value={year} onChange={e => setYear(+e.target.value)}>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" className="input py-2" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <input type="date" className="input py-2" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}

          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Tampilkan'}
          </button>

          {canExport && stats && dataList.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-auto">
              <button onClick={handleExportPDF} disabled={exportingPdf} className="btn-primary flex items-center gap-2 text-sm">
                <FileText size={15} />
                {exportingPdf ? 'Membuat PDF...' : 'PDF'}
              </button>
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
                <Printer size={15} /> Print
              </button>
              <button onClick={handleShareWhatsApp} className="btn-secondary flex items-center gap-2 text-sm">
                <MessageCircle size={15} /> WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {stats && (
        <>
          <div className={clsx(
            'rounded-lg border-4 border-black p-6 shadow-[7px_7px_0_#111]',
            stats.ringkasan.keuntungan >= 0 ? 'bg-[#B6FF63]' : 'bg-[#FF7A7A]'
          )}>
            <p className="text-black/70 text-sm mb-1 font-black uppercase">Keuntungan Bersih - {periodeLabel()}</p>
            <p className="text-4xl font-black mb-5 text-black">{formatRupiah(stats.ringkasan.keuntungan)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Pemasukan', value: formatRupiah(stats.ringkasan.total_pemasukan) },
                { label: 'Pengeluaran', value: formatRupiah(stats.ringkasan.total_pengeluaran) },
                { label: 'Total Tonase', value: `${formatAngka(stats.ringkasan.total_tonase)} kg` },
                { label: 'Hari Kerja', value: `${stats.ringkasan.jumlah_hari_kerja} hari` },
              ].map(item => (
                <div key={item.label} className="bg-white border-2 border-black rounded-lg p-3">
                  <div className="text-black/60 text-xs mb-0.5 font-black uppercase">{item.label}</div>
                  <div className="font-black text-sm text-black">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-5 lg:col-span-2">
                <h3 className="font-black text-gray-950 mb-4 uppercase">Tren Pemasukan vs Pengeluaran</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111111" opacity={0.2} />
                    <XAxis dataKey="tgl" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={v => `${(v / 1e6).toFixed(0)}jt`} tick={{ fontSize: 10 }} width={38} />
                    <Tooltip formatter={(value: unknown) => formatRupiah(Number(value ?? 0))} />
                    <Legend iconType="circle" iconSize={8} />
                    <Line type="monotone" dataKey="Pemasukan" stroke="#00B894" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="Pengeluaran" stroke="#FF4D4D" strokeWidth={3} dot={false} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card p-5">
                <h3 className="font-black text-gray-950 mb-4 uppercase">Tonase per Hari</h3>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111111" opacity={0.2} />
                    <XAxis dataKey="tgl" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={35} />
                    <Tooltip />
                    <Bar dataKey="Tonase" fill="#111111" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {stats.pengeluaranKat.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-black text-gray-950 mb-4 uppercase">Rincian Pengeluaran</h3>
                  {(() => {
                    const total = stats.pengeluaranKat.reduce((s, x) => s + x.total, 0)
                    return (
                      <div className="space-y-2.5">
                        {stats.pengeluaranKat.slice(0, 7).map((item, i) => (
                          <div key={item.kategori}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-700 truncate max-w-[150px] font-bold">{item.kategori}</span>
                              <span className="font-black ml-2">
                                {formatRupiah(item.total)} ({((item.total / total) * 100).toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-white border-2 border-black rounded-full overflow-hidden">
                              <div className="h-full" style={{
                                width: `${(item.total / total) * 100}%`,
                                background: CAT_COLORS[i % CAT_COLORS.length]
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          <div className="card overflow-hidden print:shadow-none">
            <div className="px-5 py-4 border-b-2 border-black flex items-center justify-between">
              <h3 className="font-black text-gray-950 uppercase">Tabel Detail Harian</h3>
              <span className="text-sm text-gray-600 font-bold">{dataList.length} hari</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Hari</th>
                    <th className="text-right">Tonase</th>
                    <th className="text-right">Harga/kg</th>
                    <th className="text-right">Pemasukan</th>
                    <th className="text-right">Pengeluaran</th>
                    <th className="text-right">Keuntungan</th>
                    <th>Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {dataList.map(item => (
                    <tr key={item.id}>
                      <td className="font-bold">{formatTanggal(item.tanggal)}</td>
                      <td className="text-gray-600">{getHari(item.tanggal)}</td>
                      <td className="text-right">{formatAngka(Number(item.total_tonase))} kg</td>
                      <td className="text-right">{formatRupiah(Number(item.harga_per_kg))}</td>
                      <td className="text-right text-[#008F6B] font-black">{formatRupiah(Number(item.total_pemasukan))}</td>
                      <td className="text-right text-[#D91F1F] font-black">{formatRupiah(Number(item.total_pengeluaran))}</td>
                      <td className={clsx('text-right font-black',
                        Number(item.keuntungan) >= 0 ? 'text-[#008F6B]' : 'text-[#D91F1F]'
                      )}>
                        {formatRupiah(Number(item.keuntungan))}
                      </td>
                      <td className="text-gray-500 text-xs">{item.created_by_nama ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFD84D] font-black text-black">
                    <td colSpan={2} className="px-4 py-3">TOTAL ({dataList.length} hari)</td>
                    <td className="text-right px-4">{formatAngka(stats.ringkasan.total_tonase)} kg</td>
                    <td />
                    <td className="text-right px-4">{formatRupiah(stats.ringkasan.total_pemasukan)}</td>
                    <td className="text-right px-4">{formatRupiah(stats.ringkasan.total_pengeluaran)}</td>
                    <td className="text-right px-4">{formatRupiah(stats.ringkasan.keuntungan)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
