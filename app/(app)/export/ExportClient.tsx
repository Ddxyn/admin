'use client'
import { useCallback, useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileJson, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatAngka, formatRupiah, formatTanggal, monthRange } from '@/lib/format'
import type { DataHarian } from '@/types'
import {
  downloadExcelReport,
  downloadJsonReport,
  fetchDetailedData,
  type ReportStats,
} from '@/lib/report-export'

type TabPeriod = 'minggu' | 'bulan' | 'custom'

export default function ExportClient() {
  const [tab, setTab] = useState<TabPeriod>('bulan')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [dataList, setDataList] = useState<DataHarian[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState<'excel' | 'json' | null>(null)

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
        fetch(`/api/data?from=${from}&to=${to}&limit=500`),
      ])
      const [statsJson, dataJson] = await Promise.all([statsRes.json(), dataRes.json()])
      if (!statsRes.ok) throw new Error(statsJson.error ?? 'Gagal memuat statistik')
      if (!dataRes.ok) throw new Error(dataJson.error ?? 'Gagal memuat data')
      setStats(statsJson)
      setDataList(dataJson.data ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat data export')
    } finally {
      setLoading(false)
    }
  }, [getRange])

  useEffect(() => { load() }, [load])

  const periodeLabel = stats
    ? `${formatTanggal(stats.dateFrom)} - ${formatTanggal(stats.dateTo)}`
    : ''

  async function exportExcel() {
    if (!stats || dataList.length === 0) { toast.error('Tidak ada data untuk export'); return }
    setExporting('excel')
    try {
      const detailed = await fetchDetailedData(dataList)
      downloadExcelReport(stats, detailed, periodeLabel)
      toast.success('Excel berhasil diunduh')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal export Excel')
    } finally {
      setExporting(null)
    }
  }

  async function exportJson() {
    if (!stats || dataList.length === 0) { toast.error('Tidak ada data untuk export'); return }
    setExporting('json')
    try {
      const detailed = await fetchDetailedData(dataList)
      downloadJsonReport(stats, detailed, periodeLabel)
      toast.success('JSON berhasil diunduh')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal export JSON')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-1 bg-white border-2 border-black rounded-lg p-1">
            {(['minggu', 'bulan', 'custom'] as TabPeriod[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={tab === item ? 'btn-primary py-2 px-4 text-sm' : 'px-4 py-2 text-sm font-black'}
              >
                {item === 'minggu' ? 'Mingguan' : item === 'bulan' ? 'Bulanan' : 'Custom'}
              </button>
            ))}
          </div>

          {tab === 'bulan' && (
            <div className="flex gap-2">
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
            <div className="flex flex-wrap gap-2">
              <input type="date" className="input py-2" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <input type="date" className="input py-2" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          )}

          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memuat...' : 'Muat Data'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['Periode', periodeLabel],
            ['Jumlah Hari', `${dataList.length} hari`],
            ['Tonase', `${formatAngka(stats.ringkasan.total_tonase)} kg`],
            ['Keuntungan', formatRupiah(stats.ringkasan.keuntungan)],
          ].map(([label, value]) => (
            <div key={label} className="stat-card">
              <span className="text-xs font-black uppercase text-gray-600">{label}</span>
              <span className="text-lg font-black text-gray-950">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="w-12 h-12 bg-[#B6FF63] border-2 border-black rounded-lg flex items-center justify-center mb-4 shadow-[3px_3px_0_#111]">
            <FileSpreadsheet size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Export Excel</h2>
          <p className="text-sm text-gray-600 mt-2 mb-5">
            Format workbook mengikuti referensi: Ringkasan, Detail Harian, Supir & Tonase, Pemanen & Tandan, dan Pengeluaran.
          </p>
          <button onClick={exportExcel} disabled={!!exporting || dataList.length === 0} className="btn-primary flex items-center gap-2">
            <Download size={16} />
            {exporting === 'excel' ? 'Menyiapkan...' : 'Download Excel'}
          </button>
        </div>

        <div className="card p-6">
          <div className="w-12 h-12 bg-[#A7F3D0] border-2 border-black rounded-lg flex items-center justify-center mb-4 shadow-[3px_3px_0_#111]">
            <FileJson size={24} />
          </div>
          <h2 className="text-xl font-black uppercase">Export JSON</h2>
          <p className="text-sm text-gray-600 mt-2 mb-5">
            Struktur JSON mengikuti backup referensi: data harian, supir tonase, pemanen tandan, pengeluaran, dan ringkasan periode.
          </p>
          <button onClick={exportJson} disabled={!!exporting || dataList.length === 0} className="btn-secondary flex items-center gap-2">
            <Download size={16} />
            {exporting === 'json' ? 'Menyiapkan...' : 'Download JSON'}
          </button>
        </div>
      </div>
    </div>
  )
}
