import { getSession } from '@/lib/auth'
import ExportClient from './ExportClient'

export const dynamic = 'force-dynamic'

export default async function ExportPage() {
  const session = await getSession()

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-950 uppercase">Export Data</h1>
        <p className="text-sm text-gray-700 mt-1 font-semibold">
          Pilih periode lalu unduh data dalam format Excel atau JSON.
        </p>
      </div>
      <ExportClient userRole={session!.role} />
    </div>
  )
}
