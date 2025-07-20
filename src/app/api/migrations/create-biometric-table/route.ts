import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 생체 인식 자격 증명 테이블 생성
    const { error: createTableError } = await supabase
      .from("biometric_credentials")
      .select("*")
      .limit(1);

    // 테이블이 없으면 생성 (간단한 방법)
    if (
      createTableError &&
      createTableError.message.includes(
        'relation "biometric_credentials" does not exist'
      )
    ) {
      console.log("생체 인식 테이블이 없습니다. 수동으로 생성해주세요.");
      return NextResponse.json(
        {
          error: "테이블이 없습니다",
          message: "Supabase 대시보드에서 수동으로 테이블을 생성해주세요.",
          sql: `
          CREATE TABLE biometric_credentials (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            credential_id TEXT NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            sign_count BIGINT NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "생체 인식 테이블이 이미 존재합니다",
    });
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
