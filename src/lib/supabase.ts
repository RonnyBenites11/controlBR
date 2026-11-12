import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const hasPublicApiKey = Boolean(
  key &&
    (key.startsWith('sb_publishable_') ||
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)),
)
export const configured = Boolean(
  url &&
  /^https?:\/\//.test(url) &&
  !url.includes('YOUR_PROJECT') &&
  hasPublicApiKey,
)
export const supabase = configured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null

export function client() {
  if (!supabase)
    throw new Error(
      'Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env para continuar.',
    )
  if (typeof navigator !== 'undefined' && !navigator.onLine)
    throw new Error('No tienes conexión. Conéctate antes de consultar o registrar cambios.')
  return supabase
}
export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client().rpc(name, args)
  if (error) throw error
  return data as T
}
export async function allRows<T>(table: string): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client()
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data as T[]))
    if (data.length < 1000) return rows
  }
}
