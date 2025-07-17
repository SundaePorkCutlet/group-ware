import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from './utils'

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  // 이미 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    return supabaseInstance
  }

  // 새 인스턴스 생성 (최초 1회만)
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: fetchWithTimeout
      }
    }
  )

  return supabaseInstance
} 