import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null
let adminClient: SupabaseClient | null = null

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} wajib diisi di environment variables`)
  }
  return value
}

function getBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )
  }
  return browserClient
}

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return adminClient
}

function lazyClient(getClient: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, property) {
      const client = getClient()
      const value = client[property as keyof SupabaseClient]
      return typeof value === 'function' ? value.bind(client) : value
    },
  })
}

// Client untuk browser (anon key)
export const supabase = lazyClient(getBrowserClient)

// Admin client untuk server-side (service role - full access)
export const supabaseAdmin = lazyClient(getAdminClient)
