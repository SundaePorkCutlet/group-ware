import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 모든 거래 내역 조회
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error("데이터 조회 오류:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 1월 1일 데이터 특별 확인
    const jan1Data =
      data?.filter((tx) => {
        const date = new Date(tx.date);
        return date.getMonth() === 0 && date.getDate() === 1;
      }) || [];

    // 사용자별 통계
    const userStats: Record<string, { count: number; total: number }> = {};
    data?.forEach((tx) => {
      if (!userStats[tx.user_id]) {
        userStats[tx.user_id] = { count: 0, total: 0 };
      }
      userStats[tx.user_id].count++;
      userStats[tx.user_id].total += Number(tx.amount) || 0;
    });

    return NextResponse.json({
      totalCount: data?.length || 0,
      jan1Count: jan1Data.length,
      jan1Data: jan1Data,
      recentData: data?.slice(-10) || [],
      userStats: userStats,
      allData: data || [],
    });
  } catch (err) {
    console.error("API 오류:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
