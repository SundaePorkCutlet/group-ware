"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  useEffect(() => {
    // 초기 인증 설정
    initializeAuth();

    // 주기적으로 세션 갱신 (1시간마다)
    const sessionRefreshInterval = setInterval(() => {
      refreshSession();
    }, 60 * 60 * 1000); // 1시간

    // 페이지 포커스 시 세션 확인
    const handleFocus = () => {
      refreshSession();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(sessionRefreshInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initializeAuth, refreshSession]);

  return <>{children}</>;
}
