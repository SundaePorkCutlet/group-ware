import { create } from "zustand";
import { createClient } from "@/lib/supabase";

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  created_by: string;
  department_id?: string;
  is_all_day: boolean;
  event_type: "meeting" | "holiday" | "attendance" | "other";
  visibility: "personal" | "company";
  created_at: string;
  updated_at: string;
  exclude_lunch_time?: boolean;
  leave_type?: string;
}

interface EventState {
  myEvents: Event[];
  companyEvents: Event[];
  loading: boolean;
  setMyEvents: (events: Event[]) => void;
  setCompanyEvents: (events: Event[]) => void;
  setLoading: (loading: boolean) => void;
  fetchEvents: (userId: string, companyId?: string | null) => Promise<void>;
  clearEvents: () => void;
}

export const useEventStore = create<EventState>((set, get) => ({
  myEvents: [],
  companyEvents: [],
  loading: false,
  setMyEvents: (events) => set({ myEvents: events }),
  setCompanyEvents: (events) => set({ companyEvents: events }),
  setLoading: (loading) => set({ loading }),
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

    console.log("📥 fetchEvents 시작:", { userId, companyId });
    const supabase = createClient();
    set({ loading: true });

    try {
      // 개인 이벤트 가져오기
      console.log("🔍 개인 이벤트 가져오기 중...");
      const { data: personalEvents } = await supabase
        .from("events")
        .select("*")
        .eq("created_by", userId)
        .eq("visibility", "personal")
        .order("start_date", { ascending: true });

      console.log("✅ 개인 이벤트 결과:", personalEvents?.length || 0);
      set({ myEvents: (personalEvents ?? []) as unknown as Event[] });

      // 회사 이벤트 가져오기 (companyId가 있으면)
      if (companyId) {
        console.log("🔍 회사 이벤트 가져오기 중...");
        const { data: companyEvents } = await supabase
          .from("events")
          .select("*")
          .eq("visibility", "company")
          .eq("company_id", companyId)
          .order("start_date", { ascending: true });

        console.log("✅ 회사 이벤트 결과:", companyEvents?.length || 0);
        set({ companyEvents: (companyEvents ?? []) as unknown as Event[] });
      } else {
        console.log("🏢 회사 ID 없음, 회사 이벤트 빈 배열로 설정");
        set({ companyEvents: [] });
      }
    } catch (error) {
      console.error("❌ 이벤트 가져오기 오류:", error);
    } finally {
      console.log("🏁 fetchEvents 완료, 로딩 상태 해제");
      set({ loading: false });
    }
  },
  clearEvents: () =>
    set({
      myEvents: [],
      companyEvents: [],
      loading: false,
    }),
}));
