import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../lib/types'
export interface AuthValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string
  reload: () => Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Falta AuthProvider')
  return context
}
