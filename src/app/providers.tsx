'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase'

export default function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore(state => state.setUser)
  const fetchProfile = useAuthStore(state => state.fetchProfile)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })
  }, [setUser, fetchProfile])

  return <>{children}</>
} 