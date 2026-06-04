import { getSession } from '@/lib/auth'
import LaporanClient from '../laporan/LaporanClient'

export const dynamic = 'force-dynamic'

export default async function ExportPage() {
  const session = await getSession()

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-950 uppercase">Export Data</h1>
        <p className="text-sm text-gray-700 mt-1 font-semibold">
          Unduh PDF/CSV atau kirim ringkasan laporan ke WhatsApp.
        </p>
      </div>
      <LaporanClient userRole={session!.role} />
    </div>
  )
}
