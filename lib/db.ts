import { supabaseAdmin } from './supabase'
import type {
  DataHarian, KategoriPengeluaran, Ringkasan,
  FormDataHarian
} from '@/types'

// ============================================================
// DATA HARIAN
// ============================================================
export async function getDataHarianList(params?: {
  from?: string
  to?: string
  limit?: number
  offset?: number
}): Promise<DataHarian[]> {
  let viewQuery = supabaseAdmin
    .from('v_data_harian')
    .select('*')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (params?.from) viewQuery = viewQuery.gte('tanggal', params.from)
  if (params?.to)   viewQuery = viewQuery.lte('tanggal', params.to)
  if (params?.offset !== undefined) {
    viewQuery = viewQuery.range(params.offset, params.offset + (params.limit ?? 20) - 1)
  } else if (params?.limit) {
    viewQuery = viewQuery.limit(params.limit)
  }

  const { data, error } = await viewQuery
  if (!error) return data ?? []

  console.error('getDataHarianList view fallback:', error.message)

  let baseQuery = supabaseAdmin
    .from('data_harian')
    .select('id, tanggal, harga_per_kg, catatan, created_at')
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })

  if (params?.from) baseQuery = baseQuery.gte('tanggal', params.from)
  if (params?.to)   baseQuery = baseQuery.lte('tanggal', params.to)
  if (params?.offset !== undefined) {
    baseQuery = baseQuery.range(params.offset, params.offset + (params.limit ?? 20) - 1)
  } else if (params?.limit) {
    baseQuery = baseQuery.limit(params.limit)
  }

  const { data: rows, error: baseError } = await baseQuery
  if (baseError) throw baseError
  if (!rows || rows.length === 0) return []

  const ids = rows.map(row => row.id)
  const [supir, pemanen, pengeluaran] = await Promise.all([
    supabaseAdmin.from('supir_tonase').select('data_harian_id, tonase').in('data_harian_id', ids),
    supabaseAdmin.from('pemanen_tandan').select('data_harian_id, jumlah_tandan').in('data_harian_id', ids),
    supabaseAdmin.from('pengeluaran').select('data_harian_id, jumlah').in('data_harian_id', ids),
  ])

  const sumById = <T extends Record<string, unknown>>(
    list: T[] | null,
    key: keyof T
  ) => {
    const map = new Map<string, number>()
    for (const item of list ?? []) {
      const id = String(item.data_harian_id ?? '')
      map.set(id, (map.get(id) ?? 0) + Number(item[key] ?? 0))
    }
    return map
  }

  const countById = (list: Array<{ data_harian_id?: string }> | null) => {
    const map = new Map<string, number>()
    for (const item of list ?? []) {
      const id = String(item.data_harian_id ?? '')
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }

  const tonaseMap = sumById(supir.data, 'tonase')
  const tandanMap = sumById(pemanen.data, 'jumlah_tandan')
  const pengeluaranMap = sumById(pengeluaran.data, 'jumlah')
  const supirCountMap = countById(supir.data)
  const pemanenCountMap = countById(pemanen.data)

  return rows.map(row => {
    const totalTonase = tonaseMap.get(row.id) ?? 0
    const totalPengeluaran = pengeluaranMap.get(row.id) ?? 0
    const totalPemasukan = totalTonase * Number(row.harga_per_kg)
    return {
      ...row,
      created_by_nama: undefined,
      updated_by_nama: undefined,
      updated_at: row.created_at,
      total_tonase: totalTonase,
      total_pemasukan: totalPemasukan,
      total_pengeluaran: totalPengeluaran,
      keuntungan: totalPemasukan - totalPengeluaran,
      total_tandan: tandanMap.get(row.id) ?? 0,
      jumlah_supir: supirCountMap.get(row.id) ?? 0,
      jumlah_pemanen: pemanenCountMap.get(row.id) ?? 0,
    }
  })
}

export async function getDataHarianById(id: string): Promise<DataHarian | null> {
  const { data: dh, error } = await supabaseAdmin
    .from('v_data_harian')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    console.error('getDataHarianById view fallback:', error.message)

    const { data: base, error: baseError } = await supabaseAdmin
      .from('data_harian')
      .select('id, tanggal, harga_per_kg, catatan, created_by_nama, updated_by_nama, created_at, updated_at')
      .eq('id', id)
      .single()
    if (baseError || !base) return null

    const [supir, pemanen, pengeluaran] = await Promise.all([
      supabaseAdmin.from('supir_tonase').select('*').eq('data_harian_id', id),
      supabaseAdmin.from('pemanen_tandan').select('*').eq('data_harian_id', id),
      supabaseAdmin.from('pengeluaran').select('*').eq('data_harian_id', id),
    ])

    const totalTonase = (supir.data ?? []).reduce((sum, row) => sum + Number(row.tonase), 0)
    const totalTandan = (pemanen.data ?? []).reduce((sum, row) => sum + Number(row.jumlah_tandan), 0)
    const totalPengeluaran = (pengeluaran.data ?? []).reduce((sum, row) => sum + Number(row.jumlah), 0)
    const totalPemasukan = totalTonase * Number(base.harga_per_kg)

    return {
      ...base,
      total_tonase: totalTonase,
      total_pemasukan: totalPemasukan,
      total_pengeluaran: totalPengeluaran,
      keuntungan: totalPemasukan - totalPengeluaran,
      total_tandan: totalTandan,
      jumlah_supir: supir.data?.length ?? 0,
      supir_list: supir.data ?? [],
      pemanen_list: pemanen.data ?? [],
      pengeluaran_list: pengeluaran.data ?? [],
    }
  }

  // Load relasi
  const [supir, pemanen, pengeluaran] = await Promise.all([
    supabaseAdmin.from('supir_tonase').select('*').eq('data_harian_id', id),
    supabaseAdmin.from('pemanen_tandan').select('*').eq('data_harian_id', id),
    supabaseAdmin.from('pengeluaran').select('*').eq('data_harian_id', id),
  ])

  return {
    ...dh,
    supir_list: supir.data ?? [],
    pemanen_list: pemanen.data ?? [],
    pengeluaran_list: pengeluaran.data ?? [],
  }
}

export async function createDataHarian(
  form: FormDataHarian,
  userId: string,
  userName: string
): Promise<DataHarian> {
  const { data: dh, error } = await supabaseAdmin
    .from('data_harian')
    .insert({
      tanggal: form.tanggal,
      harga_per_kg: parseFloat(form.harga_per_kg),
      catatan: form.catatan || null,
      created_by: userId,
      created_by_nama: userName,
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505' && error.message.toLowerCase().includes('tanggal')) {
      throw new Error('Database masih membatasi 1 data per tanggal. Jalankan SQL update schema untuk mengizinkan beberapa data pada tanggal yang sama.')
    }
    throw error
  }

  // Insert supir
  if (form.supir_list.length > 0) {
    const supirValid = form.supir_list.filter(
      s => s.nama_supir.trim() && parseFloat(s.tonase) > 0
    )
    if (supirValid.length > 0) {
      await supabaseAdmin.from('supir_tonase').insert(
        supirValid.map(s => ({
          data_harian_id: dh.id,
          nama_supir: s.nama_supir.trim(),
          tonase: parseFloat(s.tonase),
          tanggal: form.tanggal,
        }))
      )
    }
  }

  // Insert pemanen
  if (form.pemanen_list.length > 0) {
    const pemanenValid = form.pemanen_list.filter(
      p => p.nama_pemanen.trim() && parseInt(p.jumlah_tandan) > 0
    )
    if (pemanenValid.length > 0) {
      await supabaseAdmin.from('pemanen_tandan').insert(
        pemanenValid.map(p => ({
          data_harian_id: dh.id,
          nama_pemanen: p.nama_pemanen.trim(),
          jumlah_tandan: parseInt(p.jumlah_tandan),
          tanggal: form.tanggal,
        }))
      )
    }
  }

  // Insert pengeluaran
  if (form.pengeluaran_list.length > 0) {
    const penValid = form.pengeluaran_list.filter(
      p => p.kategori && parseFloat(p.jumlah) > 0
    )
    if (penValid.length > 0) {
      await supabaseAdmin.from('pengeluaran').insert(
        penValid.map(p => ({
          data_harian_id: dh.id,
          tanggal: form.tanggal,
          kategori: p.kategori,
          deskripsi: p.deskripsi || null,
          jumlah: parseFloat(p.jumlah),
          created_by: userId,
          created_by_nama: userName,
        }))
      )
    }
  }

  return dh
}

export async function updateDataHarian(
  id: string,
  form: FormDataHarian,
  userId: string,
  userName: string
): Promise<void> {
  await supabaseAdmin
    .from('data_harian')
    .update({
      tanggal: form.tanggal,
      harga_per_kg: parseFloat(form.harga_per_kg),
      catatan: form.catatan || null,
      updated_by: userId,
      updated_by_nama: userName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Hapus dan re-insert relasi
  await Promise.all([
    supabaseAdmin.from('supir_tonase').delete().eq('data_harian_id', id),
    supabaseAdmin.from('pemanen_tandan').delete().eq('data_harian_id', id),
    supabaseAdmin.from('pengeluaran').delete().eq('data_harian_id', id),
  ])

  const supirValid = form.supir_list.filter(
    s => s.nama_supir.trim() && parseFloat(s.tonase) > 0
  )
  const pemanenValid = form.pemanen_list.filter(
    p => p.nama_pemanen.trim() && parseInt(p.jumlah_tandan) > 0
  )
  const penValid = form.pengeluaran_list.filter(
    p => p.kategori && parseFloat(p.jumlah) > 0
  )

  await Promise.all([
    supirValid.length > 0 && supabaseAdmin.from('supir_tonase').insert(
      supirValid.map(s => ({
        data_harian_id: id,
        nama_supir: s.nama_supir.trim(),
        tonase: parseFloat(s.tonase),
        tanggal: form.tanggal,
      }))
    ),
    pemanenValid.length > 0 && supabaseAdmin.from('pemanen_tandan').insert(
      pemanenValid.map(p => ({
        data_harian_id: id,
        nama_pemanen: p.nama_pemanen.trim(),
        jumlah_tandan: parseInt(p.jumlah_tandan),
        tanggal: form.tanggal,
      }))
    ),
    penValid.length > 0 && supabaseAdmin.from('pengeluaran').insert(
      penValid.map(p => ({
        data_harian_id: id,
        tanggal: form.tanggal,
        kategori: p.kategori,
        deskripsi: p.deskripsi || null,
        jumlah: parseFloat(p.jumlah),
        created_by: userId,
        created_by_nama: userName,
      }))
    ),
  ])
}

export async function deleteDataHarian(id: string): Promise<void> {
  await supabaseAdmin.from('data_harian').delete().eq('id', id)
}

export async function deleteDataHarianByDateRange(from: string, to: string) {
  const { data: rows, error: selectError } = await supabaseAdmin
    .from('data_harian')
    .select('id, tanggal')
    .gte('tanggal', from)
    .lte('tanggal', to)
    .order('tanggal', { ascending: true })

  if (selectError) throw selectError
  if (!rows || rows.length === 0) {
    return { deletedCount: 0, firstDate: null, lastDate: null }
  }

  const { error } = await supabaseAdmin
    .from('data_harian')
    .delete()
    .gte('tanggal', from)
    .lte('tanggal', to)
  if (error) throw error

  return {
    deletedCount: rows.length,
    firstDate: rows[0]?.tanggal ?? null,
    lastDate: rows[rows.length - 1]?.tanggal ?? null,
  }
}

// ============================================================
// RINGKASAN / STATISTIK
// ============================================================
export async function getRingkasan(from: string, to: string): Promise<Ringkasan> {
  const { data } = await supabaseAdmin
    .from('v_data_harian')
    .select('total_pemasukan, total_pengeluaran, keuntungan, total_tonase, total_tandan')
    .gte('tanggal', from)
    .lte('tanggal', to)

  if (!data || data.length === 0) {
    return {
      total_pemasukan: 0, total_pengeluaran: 0,
      keuntungan: 0, total_tonase: 0,
      total_tandan: 0, jumlah_hari_kerja: 0,
    }
  }

  return {
    total_pemasukan: data.reduce((s, d) => s + Number(d.total_pemasukan), 0),
    total_pengeluaran: data.reduce((s, d) => s + Number(d.total_pengeluaran), 0),
    keuntungan: data.reduce((s, d) => s + Number(d.keuntungan), 0),
    total_tonase: data.reduce((s, d) => s + Number(d.total_tonase), 0),
    total_tandan: data.reduce((s, d) => s + Number(d.total_tandan), 0),
    jumlah_hari_kerja: data.length,
  }
}

// Tren per hari untuk chart
export async function getTrendData(from: string, to: string) {
  const { data } = await supabaseAdmin
    .from('v_data_harian')
    .select('tanggal, total_pemasukan, total_pengeluaran, keuntungan, total_tonase')
    .gte('tanggal', from)
    .lte('tanggal', to)
    .order('tanggal', { ascending: true })
  return data ?? []
}

// Breakdown pengeluaran per kategori
export async function getPengeluaranByKategori(from: string, to: string) {
  const { data } = await supabaseAdmin
    .from('pengeluaran')
    .select('kategori, jumlah')
    .gte('tanggal', from)
    .lte('tanggal', to)

  if (!data) return []
  const map = new Map<string, number>()
  for (const p of data) {
    map.set(p.kategori, (map.get(p.kategori) ?? 0) + Number(p.jumlah))
  }
  return Array.from(map.entries())
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total)
}

// Autocomplete nama supir dan pemanen
export async function getNamaHistory() {
  const [supir, pemanen] = await Promise.all([
    supabaseAdmin
      .from('supir_tonase')
      .select('nama_supir')
      .order('nama_supir'),
    supabaseAdmin
      .from('pemanen_tandan')
      .select('nama_pemanen')
      .order('nama_pemanen'),
  ])

  const supirNames = [...new Set((supir.data ?? []).map(s => s.nama_supir))]
  const pemanenNames = [...new Set((pemanen.data ?? []).map(p => p.nama_pemanen))]

  return { supirNames, pemanenNames }
}

// ============================================================
// KATEGORI PENGELUARAN
// ============================================================
export async function getKategori(): Promise<KategoriPengeluaran[]> {
  const { data } = await supabaseAdmin
    .from('kategori_pengeluaran')
    .select('*')
    .eq('aktif', true)
    .order('nama')
  return data ?? []
}

export async function addKategori(nama: string): Promise<KategoriPengeluaran> {
  const cleanName = nama.trim()
  const { data, error } = await supabaseAdmin
    .from('kategori_pengeluaran')
    .upsert({ nama: cleanName, icon: 'other', aktif: true }, { onConflict: 'nama' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

const DEFAULT_KATEGORI_NAMES = new Set([
  'Upah Panen',
  'Upah Tarik Bargas',
  'Upah Muat',
  'Biaya Transportasi',
  'Biaya Lainnya',
])

export async function deleteKategori(id: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('kategori_pengeluaran')
    .select('nama')
    .eq('id', id)
    .single()

  if (data?.nama && DEFAULT_KATEGORI_NAMES.has(data.nama)) {
    throw new Error('Kategori bawaan tidak bisa dihapus')
  }

  const { error } = await supabaseAdmin
    .from('kategori_pengeluaran')
    .update({ aktif: false })
    .eq('id', id)
  if (error) throw error
}

// ============================================================
// USERS (admin only)
// ============================================================
export async function getUsers() {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, nama, role, keterangan, aktif, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getUserById(id: string) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, nama, role, keterangan, aktif')
    .eq('id', id)
    .single()
  return data
}

// ============================================================
// ACTIVITY LOG
// ============================================================
export async function logActivity(params: {
  userId?: string
  userName: string
  action: string
  entity?: string
  entityId?: string
  detail?: Record<string, unknown>
}) {
  await supabaseAdmin.from('activity_log').insert({
    user_id: params.userId,
    user_nama: params.userName,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId,
    detail: params.detail,
  })
}

export async function getActivityLog(limit = 50) {
  const { data } = await supabaseAdmin
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
