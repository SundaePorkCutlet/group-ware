import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 챌린지 생성
    const challenge = randomBytes(32);

    const options = {
      challenge: Array.from(challenge),
      rpId: process.env.NEXT_PUBLIC_SITE_URL || "localhost",
      userVerification: "required",
      timeout: 60000,
    };

    return NextResponse.json(options);
  } catch (error) {
    console.error("생체 인식 인증 준비 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await request.json();
    const { assertion } = body;

    if (!assertion) {
      return NextResponse.json(
        { error: "인증 데이터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 생체 인식 자격 증명 검증
    const { data: credential, error: credentialError } = await supabase
      .from("biometric_credentials")
      .select("*")
      .eq("credential_id", assertion.id)
      .single();

    if (credentialError || !credential) {
      return NextResponse.json(
        { error: "등록되지 않은 생체 인식입니다" },
        { status: 401 }
      );
    }

    // 사용자 정보 가져오기
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", credential.user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Supabase 세션 생성 (실제로는 더 복잡한 검증이 필요)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: "biometric-auth", // 실제로는 다른 방식 사용
    });

    if (sessionError) {
      // 생체 인식으로 로그인하는 경우 별도 처리
      // 실제 구현에서는 더 안전한 방법 사용
      return NextResponse.json(
        { error: "로그인에 실패했습니다" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "생체 인식 인증이 완료되었습니다",
      session,
    });
  } catch (error) {
    console.error("생체 인식 인증 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
