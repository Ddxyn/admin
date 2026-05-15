// ============================================================
// types/index.ts — semua type definitions
// ============================================================

export type Role = 'admin' | 'petugas' | 'melihat'

export interface User {
  id: string
  nama: string
  role: 'admin' | 'petugas'
  keterangan?: string
  aktif: boolean
  created_at: string
}

export interface SessionUser {
  id: string
  nama: string
  role: Role
  // untuk role melihat, tidak ada id user
  isVisitor?: boolean
}

export interface DataHarian {
  id: string
  tanggal: string
  harga_per_kg: number
  catatan?: string
  created_by_nama?: string
  updated_by_nama?: string
  created_at: string
  updated_at: string
  // computed dari view
  total_tonase: number
  total_pemasukan: number
  total_pengeluaran: number
  keuntungan: number
  total_tandan: number
  jumlah_supir: number
  // relasi
  supir_list?: SupirTonase[]
  pemanen_list?: PemanenTandan[]
  pengeluaran_list?: Pengeluaran[]
}

export interface SupirTonase {
  id: string
  data_harian_id: string
  nama_supir: string
  tonase: number
  tanggal: string
}

export interface PemanenTandan {
  id: string
  data_harian_id: string
  nama_pemanen: string
  jumlah_tandan: number
  tanggal: string
}

export interface Pengeluaran {
  id: string
  data_harian_id?: string
  tanggal: string
  kategori: string
  deskripsi?: string
  jumlah: number
  created_by_nama?: string
}

export interface KategoriPengeluaran {
  id: string
  nama: string
  icon: string
  aktif: boolean
}

export interface Ringkasan {
  total_pemasukan: number
  total_pengeluaran: number
  keuntungan: number
  total_tonase: number
  total_tandan: number
  jumlah_hari_kerja: number
}

export interface ActivityLog {
  id: string
  user_nama: string
  action: string
  entity: string
  detail: Record<string, unknown>
  created_at: string
}

// Form types
export interface FormSupir {
  nama_supir: string
  tonase: string
}

export interface FormPemanen {
  nama_pemanen: string
  jumlah_tandan: string
}

export interface FormPengeluaran {
  kategori: string
  deskripsi: string
  jumlah: string
}

export interface FormDataHarian {
  tanggal: string
  harga_per_kg: string
  catatan: string
  supir_list: FormSupir[]
  pemanen_list: FormPemanen[]
  pengeluaran_list: FormPengeluaran[]
}

// API Response
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}
