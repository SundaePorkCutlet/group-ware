import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

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
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 챌린지 생성
    const challenge = randomBytes(32);

    // 사용자 ID를 바이트 배열로 변환
    const userIdBytes = new TextEncoder().encode(userId);

    const options = {
      challenge: Array.from(challenge),
      userId: Array.from(userIdBytes),
      rp: {
        name: "그룹웨어",
        id: process.env.NEXT_PUBLIC_SITE_URL || "localhost",
      },
      user: {
        id: Array.from(userIdBytes),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60000,
    };

    return NextResponse.json(options);
  } catch (error) {
    console.error("생체 인식 등록 준비 오류:", error);
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
    const { userId, credential } = body;

    if (!userId || !credential) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 생체 인식 자격 증명을 데이터베이스에 저장
    const { error: insertError } = await supabase
      .from("biometric_credentials")
      .insert({
        user_id: userId,
        credential_id: credential.id,
        public_key: Buffer.from(credential.response.publicKey).toString(
          "base64"
        ),
        sign_count: credential.response.signCount,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("생체 인식 자격 증명 저장 오류:", insertError);
      return NextResponse.json(
        { error: "생체 인식 등록에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "생체 인식이 등록되었습니다",
    });
  } catch (error) {
    console.error("생체 인식 등록 완료 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
