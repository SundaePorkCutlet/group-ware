# 캘린더 페이지 무한로딩 및 프로필데이터 문제 해결과정

## 문제 상황

### 1. 무한로딩 문제

- **현상**: 다른 탭 갔다가 홈으로 버튼 눌렀다가 다시 캘린더로 올 때 무한로딩 발생
- **패턴**:
  - 다른 탭 갔다 왔을 때 → OK
  - 홈으로 버튼 눌렀다 다시 캘린더 왔을 때 → OK
  - 다른 탭 갔다가 홈으로 버튼 눌렀다가 다시 캘린더 왔을 때 → 무한로딩

### 2. 프로필데이터 문제

- **현상**: 사이드바의 근무시간과 연차 데이터가 제대로 계산되지 않음
- **특징**: 다른 탭 갔다가 홈으로 갔다가 캘린더로 올 때만 발생

## 원인 분석

### 무한로딩 원인

1. **useEffect 의존성 배열 문제**

   - `fetchEventsFromStore` 함수가 매번 새로운 참조를 가져서 무한 루프 발생
   - `useCallback`으로 메모이제이션했지만 의존성 배열에 포함되어 문제 지속

2. **eventStore 중복 로딩**
   - 컴포넌트가 마운트될 때마다 이벤트 데이터를 새로 가져옴
   - 이미 로드된 데이터가 있어도 중복 실행

### 프로필데이터 문제 원인

1. **authStore 프로필 데이터 손실**

   - 다른 탭에서 홈으로 이동하는 과정에서 `authStore`의 프로필 데이터가 초기화됨
   - 인증 상태 변화 감지 시 불필요한 프로필 재로드

2. **WorkSummarySidebar 데이터 소스 분리**
   - 사이드바가 `eventStore`의 데이터를 사용하지 않고 별도로 Supabase 쿼리 실행
   - `eventStore`에서 데이터 캐싱해도 사이드바는 새로운 데이터를 가져오지 못함

## 해결방법

### 1. 무한로딩 해결

#### A. useEffect 의존성 최적화

```typescript
// 이전 (문제)
useEffect(() => {
  if (!user || userProfile === undefined) return;
  fetchEventsFromStore(user.id, userProfile?.company_id);
}, [user?.id, userProfile?.company_id, fetchEventsFromStore]); // fetchEventsFromStore가 매번 변경됨

// 수정 후
useEffect(() => {
  if (!user || userProfile === undefined) return;
  fetchEventsFromStore(user.id, userProfile?.company_id);
}, [user?.id, userProfile?.company_id]); // fetchEventsFromStore 제거
```

#### B. eventStore 중복 로딩 방지

```typescript
// eventStore.ts
fetchEvents: async (userId: string, companyId?: string | null) => {
  // 이미 데이터가 있고 로딩 중이 아니면 중복 실행 방지
  const currentState = get();
  if (
    (currentState.myEvents.length > 0 ||
      currentState.companyEvents.length > 0) &&
    !currentState.loading
  ) {
    console.log("⚠️ 이미 데이터가 있으므로 중복 실행 방지");
    return;
  }
  // ... 로딩 로직
};
```

### 2. 프로필데이터 문제 해결

#### A. authStore Profile 타입 확장

```typescript
// authStore.ts
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  is_admin: boolean;
  weekly_work_hours?: number; // 추가
  weekly_work_start?: string; // 추가
  weekly_work_end?: string; // 추가
  annual_leave?: number; // 추가
}
```

#### B. authStore 프로필 데이터 안정화

```typescript
// 인증 상태 변화 시 기존 프로필 유지
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    set({ user: session.user });
    // 기존 프로필이 있으면 유지
    const currentProfile = get().profile;
    if (!currentProfile || currentProfile.id !== session.user.id) {
      // 새로 로드
    }
  }
});
```

#### C. WorkSummarySidebar 데이터 소스 통합

```typescript
// eventStore의 데이터 사용
const { myEvents } = useEventStore();

// myEvents에서 출퇴근/휴가 이벤트 필터링
const attendanceData = myEvents.filter(
  (event) =>
    ["🌅 출근", "🌆 퇴근"].includes(event.title) &&
    new Date(event.start_date) >= start &&
    new Date(event.start_date) <= end
);
```

## 적용된 변경사항

### 1. src/app/calendar/page.tsx

- `useEffect` 의존성 배열에서 `fetchEventsFromStore` 제거
- `useCallback` 메모이제이션 최적화

### 2. src/store/eventStore.ts

- 중복 로딩 방지 로직 추가
- 이미 데이터가 있으면 새로 로드하지 않음

### 3. src/store/authStore.ts

- `Profile` 타입에 근무시간 관련 필드 추가
- 인증 상태 변화 시 프로필 데이터 안정화

### 4. src/components/work/WorkSummarySidebar.tsx

- `eventStore`의 `myEvents` 데이터 사용
- 별도 Supabase 쿼리 제거
- 프로필 데이터 처리 로직 개선

## 디버깅 방법

### 콘솔 로그 확인

```javascript
// WorkSummarySidebar 디버깅 로그
🔍 WorkSummarySidebar - 프로필 데이터 처리 시작
🔍 WorkSummarySidebar - authStore 프로필 사용
🔍 WorkSummarySidebar - myEvents: [개수]
🔍 WorkSummarySidebar - 출퇴근 이벤트: [개수]
🔍 WorkSummarySidebar - 휴가 이벤트: [개수]
🔍 WorkSummarySidebar - 근무시간 계산 시작
🔍 WorkSummarySidebar - 최종 근무시간: [시간]
🔍 WorkSummarySidebar - 최종 사용 연차: [일수]
```

### 문제 진단

1. **무한로딩**: 콘솔에서 `fetchEvents` 호출이 반복되는지 확인
2. **프로필데이터**: `authStore` 프로필 데이터가 있는지 확인
3. **이벤트데이터**: `myEvents`에 데이터가 제대로 들어오는지 확인

## 예방 방법

### 1. 상태 관리 최적화

- Zustand store에서 불필요한 상태 변경 방지
- `useEffect` 의존성 배열을 최소화
- 함수 메모이제이션 적극 활용

### 2. 데이터 캐싱 전략

- 이미 로드된 데이터는 재사용
- 컴포넌트 마운트/언마운트 시 데이터 보존
- 페이지 전환 시에도 상태 유지

### 3. 에러 처리

- 네트워크 오류 시 재시도 로직
- 데이터 로드 실패 시 기본값 사용
- 사용자에게 적절한 피드백 제공

## 추가 개선사항

### 1. 성능 최적화

- React.memo로 불필요한 리렌더링 방지
- 가상화(virtualization) 적용 고려
- 이미지/데이터 지연 로딩

### 2. 사용자 경험

- 로딩 상태 표시 개선
- 에러 메시지 한글화
- 데이터 새로고침 버튼 추가

### 3. 코드 품질

- TypeScript 타입 안정성 강화
- 단위 테스트 추가
- 코드 리팩토링 및 모듈화
