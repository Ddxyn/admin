import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { adminExists } from '@/lib/auth'

export default async function RootPage() {
  const exists = await adminExists()
  if (!exists) redirect('/register-admin')

  const session = await getSession()
  if (session) redirect('/dashboard')

  redirect('/login')
}
