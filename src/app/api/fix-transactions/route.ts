import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. 중복 데이터 중 하나 삭제 (더 늦게 생성된 것)
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", "029cf07b-95a8-42f1-a3dc-fd2ecfbbbb56"); // 더 늦게 생성된 ID

    if (deleteError) {
      console.error("삭제 오류:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. 남은 데이터의 날짜를 2025-01-01로 변경
    const { error: updateError } = await supabase
      .from("transactions")
      .update({ date: "2025-01-01" })
      .eq("id", "bed7e805-498c-4483-b150-3b46320b7abf"); // 남은 데이터의 ID

    if (updateError) {
      console.error("수정 오류:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. 수정된 데이터 확인
    const { data, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true });

    if (fetchError) {
      console.error("데이터 조회 오류:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "데이터 수정 완료",
      totalCount: data?.length || 0,
      updatedData: data || [],
    });
  } catch (err) {
    console.error("API 오류:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
