const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

console.log("🔧 환경 변수 확인:");
console.log(
  "NEXT_PUBLIC_SUPABASE_URL:",
  process.env.NEXT_PUBLIC_SUPABASE_URL ? "설정됨" : "설정되지 않음"
);
console.log(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "설정됨" : "설정되지 않음"
);

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
  console.log("💡 .env.local 파일을 확인하거나 환경 변수를 설정해주세요.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTransactions() {
  console.log("🔍 데이터베이스 연결 확인 중...");

  try {
    // 모든 거래 내역 조회
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error("❌ 데이터 조회 오류:", error);
      return;
    }

    console.log(`✅ 총 ${data.length}개의 거래 내역을 찾았습니다.`);

    if (data.length === 0) {
      console.log("📝 거래 내역이 없습니다.");
      return;
    }

    // 1월 1일 데이터 특별 확인
    const jan1Data = data.filter((tx) => {
      const date = new Date(tx.date);
      return date.getMonth() === 0 && date.getDate() === 1;
    });

    console.log(`\n📅 1월 1일 거래 내역: ${jan1Data.length}개`);
    jan1Data.forEach((tx) => {
      console.log(
        `  - ${tx.date}: ${tx.type} ${tx.amount}원 (${
          tx.category || "카테고리 없음"
        }) - ${tx.memo || "메모 없음"}`
      );
    });

    // 최근 10개 거래 내역
    console.log("\n📊 최근 10개 거래 내역:");
    data.slice(-10).forEach((tx) => {
      console.log(
        `  - ${tx.date}: ${tx.type} ${tx.amount}원 (${
          tx.category || "카테고리 없음"
        }) - ${tx.memo || "메모 없음"}`
      );
    });

    // 사용자별 통계
    const userStats = {};
    data.forEach((tx) => {
      if (!userStats[tx.user_id]) {
        userStats[tx.user_id] = { count: 0, total: 0 };
      }
      userStats[tx.user_id].count++;
      userStats[tx.user_id].total += Number(tx.amount) || 0;
    });

    console.log("\n👥 사용자별 통계:");
    Object.entries(userStats).forEach(([userId, stats]) => {
      console.log(
        `  - 사용자 ${userId}: ${
          stats.count
        }개 거래, 총 ${stats.total.toLocaleString()}원`
      );
    });
  } catch (err) {
    console.error("❌ 스크립트 실행 오류:", err);
  }
}

checkTransactions();
