import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 생체 인식 등록 준비 시작");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Authorization 헤더에서 토큰 확인
    const authHeader = request.headers.get("authorization");
    console.log("🔍 Authorization 헤더:", authHeader ? "존재" : "없음");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ 인증 헤더 오류");
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔍 토큰 길이:", token.length);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError) {
      console.error("❌ 인증 오류:", authError);
      return NextResponse.json(
        {
          error: "인증이 필요합니다",
          details: authError.message,
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("❌ 사용자 정보 없음");
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다" },
        { status: 401 }
      );
    }

    console.log("✅ 인증 성공:", user.email);

    const body = await request.json();
    const { userId, email } = body;

    console.log("🔍 요청 데이터:", { userId, email });

    if (!userId || !email) {
      console.error("❌ 필수 데이터 누락");
      return NextResponse.json(
        {
          error: "필수 데이터가 누락되었습니다",
          received: { userId, email },
        },
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
        id: "localhost", // 고정값으로 변경
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

    console.log("✅ 생체 인식 등록 옵션 생성 완료:", { userId, email });
    return NextResponse.json(options);
  } catch (error) {
    console.error("❌ 생체 인식 등록 준비 오류:", error);
    return NextResponse.json(
      {
        error: "서버 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("🔍 생체 인식 등록 완료 시작");

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
      console.error("인증 오류:", authError);
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "생체 인식 자격 증명이 누락되었습니다" },
        { status: 400 }
      );
    }

    // 인증된 사용자의 ID를 사용 (클라이언트에서 보낸 userId 대신)
    const authenticatedUserId = user.id;

    console.log("🔍 생체 인식 자격 증명 저장 시작:", {
      originalUserId: userId,
      authenticatedUserId: authenticatedUserId,
      credentialId: credential.id,
    });

    // 생체 인식 자격 증명을 데이터베이스에 저장
    const { error: insertError } = await supabase
      .from("biometric_credentials")
      .insert({
        user_id: authenticatedUserId, // 인증된 사용자 ID 사용
        credential_id: credential.id,
        public_key: Buffer.from(credential.response.publicKey).toString(
          "base64"
        ),
        sign_count: credential.response.signCount,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("❌ 생체 인식 자격 증명 저장 오류:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      // 테이블이 없는 경우 - 클라이언트에서 로컬 스토리지 사용하도록 안내
      if (
        insertError.message.includes(
          'relation "biometric_credentials" does not exist'
        )
      ) {
        console.log("⚠️ 테이블이 없으므로 클라이언트에서 로컬 스토리지 사용");

        return NextResponse.json({
          success: true,
          message: "생체 인식이 등록되었습니다 (로컬 모드)",
          mode: "local",
          credentialData: {
            userId: authenticatedUserId, // 인증된 사용자 ID 사용
            credentialId: credential.id,
            publicKey: Buffer.from(credential.response.publicKey).toString(
              "base64"
            ),
            signCount: credential.response.signCount,
            createdAt: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json(
        {
          error: "생체 인식 등록에 실패했습니다",
          details: insertError.message,
          code: insertError.code,
        },
        { status: 500 }
      );
    }

    console.log("생체 인식 자격 증명 저장 완료");
    return NextResponse.json({
      success: true,
      message: "생체 인식이 등록되었습니다",
    });
  } catch (error) {
    console.error("❌ 생체 인식 등록 완료 오류:", {
      message: error instanceof Error ? error.message : "알 수 없는 오류",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return NextResponse.json(
      {
        error: "서버 오류가 발생했습니다",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
