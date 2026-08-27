import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { hasSupabaseConfig, getSupabase } from '@/lib/supabase'

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabaseConfig()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!configured) return
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      signIn: async (email, password) => {
        const { error } = await getSupabase().auth.signInWithPassword({ email, password })
        if (error) throw error
      },
      signUp: async (email, password) => {
        const { error } = await getSupabase().auth.signUp({ email, password })
        if (error) throw error
      },
      signOut: async () => {
        const { error } = await getSupabase().auth.signOut()
        if (error) throw error
      },
    }),
    [configured, loading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
