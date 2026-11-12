import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/domain'
import type { Profile } from '../lib/types'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')
  useEffect(() => {
    if (!supabase) return
    let mounted = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) {
        setSession(next)
        setProfile(null)
        setLoading(Boolean(next))
        if (!next) setLoading(false)
      }
    })
    // INITIAL_SESSION lo emite Supabase al restaurar la sesión.
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
  const reload = useCallback(async () => {
    if (!session || !supabase) return
    setLoading(true)
    setError('')
    const { data, error: failure } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    if (failure) {
      setError(errorMessage(failure))
      setProfile(null)
    } else setProfile(data as Profile)
    setLoading(false)
  }, [session])
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!session || !supabase) return
      const { data, error: failure } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (!cancelled) {
        setProfile(failure ? null : (data as Profile))
        setError(failure ? errorMessage(failure) : '')
        setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [session])
  return (
    <AuthContext.Provider value={{ session, profile, loading, error, reload }}>
      {children}
    </AuthContext.Provider>
  )
}
