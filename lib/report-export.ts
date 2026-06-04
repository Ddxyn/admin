import { formatRupiah, formatAngka, formatTanggal, getHari } from '@/lib/format'
import type { DataHarian, Ringkasan } from '@/types'
import type { jsPDF as JsPDFDocument } from 'jspdf'

export interface ReportStats {
  ringkasan: Ringkasan
  pengeluaranKat: Array<{ kategori: string; total: number }>
  dateFrom: string
  dateTo: string
}

type Cell = string | number
type PdfDocumentWithAutoTable = JsPDFDocument & { lastAutoTable?: { finalY: number } }

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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as PdfDocumentWithAutoTable
  const r = stats.ringkasan
  const supirRows = flattenSupir(dataList)
  const pengeluaranRows = flattenPengeluaran(dataList)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = { left: 10, right: 10 }

  function sectionTitle(title: string, minHeight = 24) {
    let y = (doc.lastAutoTable?.finalY ?? 24) + 7
    if (y + minHeight > pageHeight - 14) {
      doc.addPage()
      y = 14
    }
    doc.setTextColor(17, 17, 17)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin.left, y)
    return y + 4
  }

  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, pageWidth, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('day - Laporan Operasional Kebun Sawit', margin.left, 10)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text(periode, margin.left, 17)

  autoTable(doc, {
    startY: 28,
    head: [['Pemasukan', 'Pengeluaran', 'Keuntungan', 'Tonase', 'Tandan', 'Hari Kerja']],
    body: [[
      formatRupiah(r.total_pemasukan),
      formatRupiah(r.total_pengeluaran),
      formatRupiah(r.keuntungan),
      `${formatAngka(r.total_tonase)} kg`,
      `${r.total_tandan}`,
      `${r.jumlah_hari_kerja} hari`,
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
      lineColor: [17, 17, 17],
      lineWidth: 0.12,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'center',
    },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fillColor: [255, 247, 209], fontStyle: 'bold' },
    margin,
  })

  autoTable(doc, {
    startY: sectionTitle('DETAIL DATA HARIAN', 32),
    head: [['Tanggal', 'Hari', 'Tonase', 'Harga/kg', 'Pemasukan', 'Pengeluaran', 'Keuntungan', 'Oleh']],
    body: dataList.map(dh => [
      formatTanggal(dh.tanggal),
      getHari(dh.tanggal),
      `${formatAngka(Number(dh.total_tonase))} kg`,
      formatRupiah(Number(dh.harga_per_kg)),
      formatRupiah(Number(dh.total_pemasukan)),
      formatRupiah(Number(dh.total_pengeluaran)),
      formatRupiah(Number(dh.keuntungan)),
      dh.created_by_nama ?? '-',
    ]),
    foot: [[
      'TOTAL',
      '',
      `${formatAngka(r.total_tonase)} kg`,
      '',
      formatRupiah(r.total_pemasukan),
      formatRupiah(r.total_pengeluaran),
      formatRupiah(r.keuntungan),
      '',
    ]],
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: { top: 1.15, right: 1.4, bottom: 1.15, left: 1.4 },
      lineColor: [17, 17, 17],
      lineWidth: 0.08,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [255, 216, 77], textColor: [17, 17, 17], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 247, 209] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 20 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 34 },
      5: { halign: 'right', cellWidth: 34 },
      6: { halign: 'right', cellWidth: 34 },
      7: { cellWidth: 28 },
    },
    margin,
  })

  if (supirRows.length > 0) {
    autoTable(doc, {
      startY: sectionTitle('DETAIL TONASE PER SUPIR', 26),
      head: [['Tanggal', 'Hari', 'Nama Supir', 'Tonase', 'Pemasukan']],
      body: supirRows.map(row => [
        formatTanggal(row.tanggal),
        getHari(row.tanggal),
        row.nama_supir,
        `${formatAngka(Number(row.tonase))} kg`,
        formatRupiah(row.pemasukan),
      ]),
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 1.15, right: 1.4, bottom: 1.15, left: 1.4 },
        lineColor: [17, 17, 17],
        lineWidth: 0.08,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 247, 209] },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 22 },
        2: { cellWidth: 82 },
        3: { halign: 'right', cellWidth: 34 },
        4: { halign: 'right', cellWidth: 42 },
      },
      margin,
    })
  }

  if (pengeluaranRows.length > 0) {
    autoTable(doc, {
      startY: sectionTitle('DETAIL PENGELUARAN', 26),
      head: [['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah']],
      body: pengeluaranRows.map(row => [
        formatTanggal(row.tanggal),
        row.kategori,
        row.deskripsi ?? '-',
        formatRupiah(Number(row.jumlah)),
      ]),
      foot: [['TOTAL', '', '', formatRupiah(r.total_pengeluaran)]],
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: { top: 1.15, right: 1.4, bottom: 1.15, left: 1.4 },
        lineColor: [17, 17, 17],
        lineWidth: 0.08,
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 216, 77], textColor: [17, 17, 17], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 247, 209] },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 48 },
        2: { cellWidth: 142 },
        3: { halign: 'right', cellWidth: 44 },
      },
      margin,
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(`day Web - ${periode}`, margin.left, pageHeight - 6)
    doc.text(`Hal ${i}/${pageCount}`, pageWidth - margin.right, pageHeight - 6, { align: 'right' })
  }

  doc.save(`laporan-sawit-${stats.dateFrom}-${stats.dateTo}.pdf`)
}
