import { create } from 'zustand'
import { createClient } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  full_name: string | null
  company_id: string | null
  is_admin: boolean
}

interface AuthState {
  user: any
  profile: Profile | null
  setUser: (user: any) => void
  setProfile: (profile: Profile | null) => void
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set: any) => ({
  user: null,
  profile: null,
  setUser: (user: any) => set({ user }),
  setProfile: (profile: any) => set({ profile }),
  fetchProfile: async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) {
      set({ profile: data as unknown as Profile })
    }
  },
})) 