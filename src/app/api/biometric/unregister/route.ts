import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
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

    // 사용자의 생체 인식 자격 증명 삭제
    const { error: deleteError } = await supabase
      .from("biometric_credentials")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("생체 인식 자격 증명 삭제 오류:", deleteError);
      return NextResponse.json(
        { error: "생체 인식 등록 해제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "생체 인식 등록이 해제되었습니다",
    });
  } catch (error) {
    console.error("생체 인식 등록 해제 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
