"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string | null
  company_id: string | null
  is_admin: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // 초기 세션 확인 - 가능한 빠르게 처리
    const getInitialSession = async () => {
      try {
        // 로컬 스토리지에서 즉시 확인 가능한 세션 체크
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user && !error) {
            setUser(session.user)
            setLoading(false) // 사용자가 있으면 즉시 로딩 해제
            setIsInitialized(true)
            // 프로필은 백그라운드에서 로드
            loadProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
            setLoading(false)
            setIsInitialized(true)
          }
        }
      } catch (error) {
        console.error('세션 로딩 오류:', error)
        if (mounted) {
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    // auth 상태 변화 감지 - Supabase 내장 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted && isInitialized) {
          console.log('🔍 Auth state changed:', event)
          
          if (session?.user) {
            setUser(session.user)
            await loadProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
        }
      }
    )

    getInitialSession()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [isInitialized])

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('프로필 로딩 오류:', error)
        return
      }

      setProfile(data as any)
    } catch (error) {
      console.error('프로필 로딩 중 오류:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  return {
    user,
    profile,
    loading,
    refreshProfile
  }
} 