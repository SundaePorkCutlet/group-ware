import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./utils";

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  // 이미 인스턴스가 있으면 재사용
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // 새 인스턴스 생성 (최초 1회만)
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "groupware-auth", // 커스텀 스토리지 키
        storage: {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
            } catch {
              // 스토리지 오류 무시
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
            } catch {
              // 스토리지 오류 무시
            }
          },
        },
      },
      global: {
        fetch: fetchWithTimeout,
      },
    }
  );

  // 토큰 자동 갱신 설정
  supabaseInstance.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") {
      console.log("🔄 토큰이 자동으로 갱신되었습니다");
    }
  });

  return supabaseInstance;
}
