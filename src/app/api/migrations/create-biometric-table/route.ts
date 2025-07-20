import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 생체 인식 자격 증명 테이블 생성
    const { error: createTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS biometric_credentials (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          credential_id TEXT NOT NULL UNIQUE,
          public_key TEXT NOT NULL,
          sign_count BIGINT NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);
        CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id ON biometric_credentials(credential_id);

        -- RLS 정책 설정
        ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

        -- 사용자는 자신의 생체 인식 자격 증명만 볼 수 있음
        CREATE POLICY "Users can view own biometric credentials" ON biometric_credentials
          FOR SELECT USING (auth.uid() = user_id);

        -- 사용자는 자신의 생체 인식 자격 증명만 삽입할 수 있음
        CREATE POLICY "Users can insert own biometric credentials" ON biometric_credentials
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- 사용자는 자신의 생체 인식 자격 증명만 삭제할 수 있음
        CREATE POLICY "Users can delete own biometric credentials" ON biometric_credentials
          FOR DELETE USING (auth.uid() = user_id);

        -- 업데이트 트리거 함수
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        -- 업데이트 트리거
        CREATE TRIGGER update_biometric_credentials_updated_at
          BEFORE UPDATE ON biometric_credentials
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `,
    });

    if (createTableError) {
      console.error("생체 인식 테이블 생성 오류:", createTableError);
      return NextResponse.json(
        { error: "테이블 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "생체 인식 테이블이 생성되었습니다",
    });
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
