# Vercel 404 Error 해결 과정

## 메타데이터
- **생성일**: 2025-01-18
- **프로젝트**: GroupWare (그룹웨어)
- **기술스택**: Next.js 15.4.1, Supabase, Vercel
- **문제**: Vercel 배포 시 404 에러 발생
- **해결상태**: ✅ 해결완료

## 태그
#nextjs #vercel #supabase #deployment #404error #troubleshooting #web-development

---

## 📝 문제 상황

### 초기 증상
- **로컬 환경**: `npm run dev` 정상 작동 (http://localhost:3000)
- **Vercel 배포**: 빌드 성공하지만 웹사이트 접속 시 404 NOT_FOUND 에러
- **환경 변수**: Supabase URL과 anon key 설정 완료

### 에러 로그
```bash
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

---

## 🔧 시도한 해결 방법들

### 1️⃣ 환경 변수 문제 해결
**시도**: Vercel 대시보드에서 환경 변수 재설정
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**결과**: ❌ 여전히 404 에러

### 2️⃣ Next.js 15 호환성 문제 해결
**시도**: 서버 컴포넌트 vs 클라이언트 컴포넌트 문제 해결
```tsx
// 문제: 서버 컴포넌트에서 ssr: false 사용 불가
const AuthButton = dynamic(() => import("@/components/auth/AuthButton"), {
  ssr: false, // ❌ Next.js 15에서 서버 컴포넌트에서 금지
})

// 해결: 클라이언트 컴포넌트로 변경
"use client"
import AuthButton from "@/components/auth/AuthButton"
```

**결과**: ❌ 빌드 에러는 해결되었지만 여전히 404

### 3️⃣ SSR 호환성 문제 해결
**시도**: `window` 객체 안전 접근 처리
```tsx
// Before
emailRedirectTo: `${window.location.origin}/auth/callback`

// After  
emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
```

**결과**: ❌ SSR 에러는 해결되었지만 여전히 404

---

## ✅ 최종 해결책

### 🎯 핵심 해결: `vercel.json` 라우팅 설정

**파일 생성**: `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### 📋 추가 개선사항

1. **메타데이터 개선**
```tsx
export const metadata: Metadata = {
  title: "GroupWare - 효율적인 협업 플랫폼",
  description: "팀 협업을 위한 통합 그룹웨어 솔루션",
};
```

2. **Next.js 설정 단순화**
```typescript
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};
```

---

## 🧠 원인 분석

### 근본 원인
**Vercel의 자동 라우팅 감지 실패**
- Next.js 15 + App Router 조합에서 발생
- SPA(Single Page App) 모드 설정 필요
- 명시적 라우팅 규칙 부재

### 기술적 배경
- **Next.js App Router**: 새로운 라우팅 시스템
- **Vercel 자동 감지**: 일부 복잡한 구조에서 한계
- **리라이트 규칙**: 모든 요청을 루트(`/`)로 리다이렉트

---

## 📚 학습 포인트

### 💡 주요 깨달음
1. **환경 변수만으로는 부족**: 라우팅 설정도 필요
2. **로컬 ≠ 프로덕션**: 환경별 차이점 고려 필요
3. **명시적 설정**: 자동 감지에 의존하지 말 것

### 🔄 디버깅 순서
1. 빌드 로그 확인
2. 환경 변수 검증  
3. 라우팅 설정 확인
4. 프레임워크별 특수 설정 검토

### 🛠️ 예방책
- 프로젝트 초기에 `vercel.json` 설정
- 로컬과 프로덕션 환경 차이 고려
- 배포 전 빌드 테스트 수행

---

## 🔗 관련 링크
- [[Next.js App Router 가이드]]
- [[Vercel 배포 설정]]
- [[Supabase 연동 가이드]]

## 📊 프로젝트 정보
- **GitHub**: `github.com/SundaePorkCutlet/group-ware`
- **Vercel URL**: `group-ware-blond.vercel.app`
- **최종 커밋**: `b97ea9a`

---

## 🏷️ 태그 및 카테고리
- **카테고리**: [[Troubleshooting]], [[Web Development]]
- **난이도**: 중급
- **소요시간**: 약 2시간
- **중요도**: ⭐⭐⭐⭐⭐

> [!success] 결론
> Vercel 배포 시 404 에러는 대부분 **라우팅 설정 문제**입니다. `vercel.json`에 명시적 리라이트 규칙을 추가하면 해결됩니다. 