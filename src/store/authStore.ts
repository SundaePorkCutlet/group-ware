import { create } from "zustand";
import { createClient } from "@/lib/supabase";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  is_admin: boolean;
  weekly_work_hours?: number;
  weekly_work_start?: string;
  weekly_work_end?: string;
  annual_leave?: number;
}

interface AuthState {
  user: any;
  profile: Profile | null;
  isLoading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set: any, get: any) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user: any) => set({ user }),
  setProfile: (profile: any) => set({ profile }),
  fetchProfile: async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!error && data) {
      set({ profile: data as unknown as Profile });
    }
  },
  refreshSession: async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) {
        console.log("🔄 세션이 갱신되었습니다");
        set({ user: data.session.user });
        // 프로필도 함께 갱신
        await get().fetchProfile(data.session.user.id);
      }
    } catch (error) {
      console.error("세션 갱신 실패:", error);
    }
  },
  initializeAuth: async () => {
    const supabase = createClient();

    try {
      // 초기 세션 확인
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("🔍 기존 세션 발견:", session.user.email);
        set({ user: session.user });

        // 프로필도 함께 로드
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData) {
          console.log("🔍 AuthStore - 초기 프로필 로드:", profileData);
          set({ profile: profileData as unknown as Profile });
        }
      } else {
        console.log("🔍 기존 세션이 없습니다");
      }
    } catch (error) {
      console.error("초기 인증 확인 실패:", error);
    } finally {
      set({ isLoading: false });
    }

    // 인증 상태 변화 감지
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔍 Auth state changed:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          set({ user: session.user });
          // 프로필도 함께 로드 (기존 프로필이 있으면 유지)
          const currentProfile = get().profile;
          if (!currentProfile || currentProfile.id !== session.user.id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (profileData) {
              console.log("🔍 AuthStore - 프로필 업데이트:", profileData);
              set({ profile: profileData as unknown as Profile });
            }
          }
        }
      } else if (event === "SIGNED_OUT") {
        set({ user: null, profile: null });
      }
    });
  },
}));
