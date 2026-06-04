import { formatRupiah, formatAngka, formatTanggal, getHari } from '@/lib/format'
import type { DataHarian, Ringkasan } from '@/types'

export interface ReportStats {
  ringkasan: Ringkasan
  pengeluaranKat: Array<{ kategori: string; total: number }>
  dateFrom: string
  dateTo: string
}

type Cell = string | number

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function xmlEscape(value: Cell) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function xmlCell(value: Cell, style = 'Data') {
  const type = typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String'
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`
}

function xmlRow(values: Cell[], style = 'Data') {
  return `<Row>${values.map(value => xmlCell(value, style)).join('')}</Row>`
}

function xmlSheet(name: string, rows: string[]) {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.join('')}</Table></Worksheet>`
}

function flattenSupir(dataList: DataHarian[]) {
  return dataList.flatMap(dh => (dh.supir_list ?? []).map(item => ({
    ...item,
    data_harian_id: dh.id,
    tanggal: dh.tanggal,
    pemasukan: Number(item.tonase) * Number(dh.harga_per_kg),
  })))
}

function flattenPemanen(dataList: DataHarian[]) {
  return dataList.flatMap(dh => (dh.pemanen_list ?? []).map(item => ({
    ...item,
    data_harian_id: dh.id,
    tanggal: dh.tanggal,
  })))
}

function flattenPengeluaran(dataList: DataHarian[]) {
  return dataList.flatMap(dh => (dh.pengeluaran_list ?? []).map(item => ({
    ...item,
    data_harian_id: dh.id,
    tanggal: dh.tanggal,
  })))
}

export async function fetchDetailedData(dataList: DataHarian[]) {
  const missingDetail = dataList.some(dh => !dh.supir_list || !dh.pemanen_list || !dh.pengeluaran_list)
  if (!missingDetail) return dataList

  const responses = await Promise.all(
    dataList.map(async dh => {
      const res = await fetch(`/api/data/${dh.id}`)
      if (!res.ok) return dh
      const json = await res.json()
      return { ...dh, ...json.data } as DataHarian
    })
  )

  return responses
}

export function downloadJsonReport(stats: ReportStats, dataList: DataHarian[], periode: string) {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    type: 'laporan_sawit',
    periode: {
      label: periode,
      from: stats.dateFrom,
      to: stats.dateTo,
    },
    ringkasan: stats.ringkasan,
    data_harian: dataList,
    supir_tonase: flattenSupir(dataList),
    pemanen_tandan: flattenPemanen(dataList),
    pengeluaran: flattenPengeluaran(dataList),
    pengeluaran_per_kategori: stats.pengeluaranKat,
  }

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
    `laporan-sawit-${stats.dateFrom}-${stats.dateTo}.json`
  )
}

export function downloadExcelReport(stats: ReportStats, dataList: DataHarian[], periode: string) {
  const r = stats.ringkasan
  const supirRows = flattenSupir(dataList)
  const pemanenRows = flattenPemanen(dataList)
  const pengeluaranRows = flattenPengeluaran(dataList)

  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#111111" ss:Pattern="Solid"/></Style>
  <Style ss:ID="SubHeader"><Font ss:Bold="1"/><Interior ss:Color="#FFD84D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Data"><Font ss:Size="10"/></Style>
  <Style ss:ID="Total"><Font ss:Bold="1"/><Interior ss:Color="#FFF3B0" ss:Pattern="Solid"/></Style>
</Styles>
${xmlSheet('Ringkasan', [
  xmlRow(['day - Laporan Operasional Kebun Sawit'], 'Header'),
  xmlRow([periode], 'SubHeader'),
  xmlRow([]),
  xmlRow(['Metrik', 'Nilai'], 'Header'),
  xmlRow(['Total Pemasukan', r.total_pemasukan]),
  xmlRow(['Total Pengeluaran', r.total_pengeluaran]),
  xmlRow(['Keuntungan Bersih', r.keuntungan]),
  xmlRow(['Total Tonase (kg)', r.total_tonase]),
  xmlRow(['Total Tandan', r.total_tandan]),
  xmlRow(['Hari Kerja', r.jumlah_hari_kerja]),
])}
${xmlSheet('Detail Harian', [
  xmlRow(['Tanggal', 'Hari', 'Tonase (kg)', 'Harga/kg', 'Pemasukan', 'Pengeluaran', 'Keuntungan', 'Oleh'], 'Header'),
  ...dataList.map(dh => xmlRow([
    dh.tanggal,
    getHari(dh.tanggal),
    Number(dh.total_tonase),
    Number(dh.harga_per_kg),
    Number(dh.total_pemasukan),
    Number(dh.total_pengeluaran),
    Number(dh.keuntungan),
    dh.created_by_nama ?? '',
  ])),
  xmlRow(['TOTAL', '', r.total_tonase, '', r.total_pemasukan, r.total_pengeluaran, r.keuntungan, ''], 'Total'),
])}
${xmlSheet('Supir & Tonase', [
  xmlRow(['Tanggal', 'Hari', 'Nama Supir', 'Tonase (kg)', 'Pemasukan'], 'Header'),
  ...supirRows.map(row => xmlRow([
    row.tanggal,
    getHari(row.tanggal),
    row.nama_supir,
    Number(row.tonase),
    row.pemasukan,
  ])),
])}
${xmlSheet('Pemanen & Tandan', [
  xmlRow(['Tanggal', 'Hari', 'Nama Pemanen', 'Jumlah Tandan'], 'Header'),
  ...pemanenRows.map(row => xmlRow([
    row.tanggal,
    getHari(row.tanggal),
    row.nama_pemanen,
    Number(row.jumlah_tandan),
  ])),
])}
${xmlSheet('Pengeluaran', [
  xmlRow(['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah (Rp)'], 'Header'),
  ...pengeluaranRows.map(row => xmlRow([
    row.tanggal,
    row.kategori,
    row.deskripsi ?? '',
    Number(row.jumlah),
  ])),
  xmlRow(['TOTAL', '', '', r.total_pengeluaran], 'Total'),
])}
</Workbook>`

  downloadBlob(
    new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    `laporan-sawit-${stats.dateFrom}-${stats.dateTo}.xls`
  )
}

export async function downloadPdfReport(stats: ReportStats, dataList: DataHarian[], periode: string) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const r = stats.ringkasan
  const supirRows = flattenSupir(dataList)
  const pengeluaranRows = flattenPengeluaran(dataList)

  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('day - Laporan Operasional Kebun Sawit', 14, 13)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(periode, 14, 21)

  doc.setTextColor(17, 17, 17)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('RINGKASAN', 14, 40)

  autoTable(doc, {
    startY: 44,
    head: [['Metrik', 'Nilai']],
    body: [
      ['Total Pemasukan', formatRupiah(r.total_pemasukan)],
      ['Total Pengeluaran', formatRupiah(r.total_pengeluaran)],
      ['Keuntungan Bersih', formatRupiah(r.keuntungan)],
      ['Total Tonase', `${formatAngka(r.total_tonase)} kg`],
      ['Total Tandan', `${r.total_tandan}`],
      ['Hari Kerja', `${r.jumlah_hari_kerja} hari`],
    ],
    styles: { fontSize: 9, lineColor: [17, 17, 17], lineWidth: 0.2 },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    alternateRowStyles: { fillColor: [255, 243, 176] },
    margin: { left: 14, right: 14 },
  })

  doc.addPage()
  doc.setTextColor(17, 17, 17)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('DETAIL DATA HARIAN', 14, 16)

  autoTable(doc, {
    startY: 20,
    head: [['Tanggal', 'Hari', 'Tonase', 'Harga/kg', 'Pemasukan', 'Pengeluaran', 'Keuntungan']],
    body: dataList.map(dh => [
      formatTanggal(dh.tanggal),
      getHari(dh.tanggal),
      `${formatAngka(Number(dh.total_tonase))} kg`,
      formatRupiah(Number(dh.harga_per_kg)),
      formatRupiah(Number(dh.total_pemasukan)),
      formatRupiah(Number(dh.total_pengeluaran)),
      formatRupiah(Number(dh.keuntungan)),
    ]),
    foot: [[
      'TOTAL',
      '',
      `${formatAngka(r.total_tonase)} kg`,
      '',
      formatRupiah(r.total_pemasukan),
      formatRupiah(r.total_pengeluaran),
      formatRupiah(r.keuntungan),
    ]],
    styles: { fontSize: 8, lineColor: [17, 17, 17], lineWidth: 0.15 },
    headStyles: { fillColor: [17, 17, 17], textColor: 255 },
    footStyles: { fillColor: [255, 216, 77], textColor: [17, 17, 17], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 247, 209] },
    margin: { left: 14, right: 14 },
  })

  if (supirRows.length > 0) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DETAIL TONASE PER SUPIR', 14, 16)
    autoTable(doc, {
      startY: 20,
      head: [['Tanggal', 'Hari', 'Nama Supir', 'Tonase', 'Pemasukan']],
      body: supirRows.map(row => [
        formatTanggal(row.tanggal),
        getHari(row.tanggal),
        row.nama_supir,
        `${formatAngka(Number(row.tonase))} kg`,
        formatRupiah(row.pemasukan),
      ]),
      styles: { fontSize: 8, lineColor: [17, 17, 17], lineWidth: 0.15 },
      headStyles: { fillColor: [17, 17, 17], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 247, 209] },
      margin: { left: 14, right: 14 },
    })
  }

  if (pengeluaranRows.length > 0) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DETAIL PENGELUARAN', 14, 16)
    autoTable(doc, {
      startY: 20,
      head: [['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah']],
      body: pengeluaranRows.map(row => [
        formatTanggal(row.tanggal),
        row.kategori,
        row.deskripsi ?? '',
        formatRupiah(Number(row.jumlah)),
      ]),
      styles: { fontSize: 8, lineColor: [17, 17, 17], lineWidth: 0.15 },
      headStyles: { fillColor: [17, 17, 17], textColor: 255 },
      alternateRowStyles: { fillColor: [255, 247, 209] },
      margin: { left: 14, right: 14 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`day Web - ${periode} - Hal ${i}/${pageCount}`, 14, 290)
  }

  doc.save(`laporan-sawit-${stats.dateFrom}-${stats.dateTo}.pdf`)
}
