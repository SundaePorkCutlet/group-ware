import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { type, timestamp } = body;

    if (!type || !timestamp) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 사용자 프로필 가져오기
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "프로필을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 출근/퇴근 이벤트 생성
    const eventData = {
      title: type === "clock_in" ? "🌅 출근" : "🌆 퇴근",
      description: type === "clock_in" ? "출근 기록" : "퇴근 기록",
      start_date: timestamp,
      end_date: timestamp,
      location: "",
      created_by: user.id,
      department_id: profile.company_id,
      is_all_day: false,
      event_type: "attendance",
      visibility: "personal",
    };

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert([eventData])
      .select()
      .single();

    if (eventError) {
      console.error("이벤트 생성 오류:", eventError);
      return NextResponse.json(
        { error: "출근/퇴근 기록에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        type === "clock_in" ? "출근이 기록되었습니다" : "퇴근이 기록되었습니다",
      event,
    });
  } catch (error) {
    console.error("출근/퇴근 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
