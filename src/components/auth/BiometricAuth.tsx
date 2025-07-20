"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { Fingerprint, Eye, Shield, CheckCircle, XCircle } from "lucide-react";

interface BiometricAuthProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function BiometricAuth({
  onSuccess,
  onCancel,
}: BiometricAuthProps) {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const supabase = createClient();

  useEffect(() => {
    checkBiometricSupport();
    checkBiometricRegistration();
  }, []);

  // 생체 인식 지원 여부 확인
  const checkBiometricSupport = async () => {
    try {
      // WebAuthn API 지원 확인
      if (!window.PublicKeyCredential) {
        setIsSupported(false);
        return;
      }

      // 생체 인식 지원 확인
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setIsSupported(available);
    } catch (error) {
      console.error("생체 인식 지원 확인 실패:", error);
      setIsSupported(false);
    }
  };

  // 생체 인식 등록 여부 확인
  const checkBiometricRegistration = () => {
    const registered = localStorage.getItem("biometric-registered");
    setIsRegistered(!!registered);
  };

  // 생체 인식 등록
  const registerBiometric = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      alert("🔍 생체 인식 등록 시작...\n\n1단계: 서버 연결 확인 중...");

      // 서버에서 등록 옵션 가져오기
      const response = await fetch("/api/biometric/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `서버 오류 (${response.status}): ${
            errorData.error || "알 수 없는 오류"
          }`
        );
      }

      const options = await response.json();
      alert(
        "✅ 1단계 완료: 서버 연결 성공!\n\n2단계: Face ID/지문 인식 등록 시작...\n\n기기에서 생체 인식 등록 창이 나타날 것입니다."
      );

      // 생체 인식 등록
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(options.challenge),
          rp: {
            name: "그룹웨어",
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(options.userId),
            name: user.email!,
            displayName: user.email!,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (!credential) {
        throw new Error("생체 인식 등록이 취소되었습니다");
      }

      alert(
        "✅ 2단계 완료: Face ID/지문 인식 등록 성공!\n\n3단계: 서버에 저장 중..."
      );

      // 서버에 등록 완료 알림
      const registerResponse = await fetch("/api/biometric/register", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          userId: user.id,
          credential: credential,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(
          `저장 오류 (${registerResponse.status}): ${
            errorData.error || "알 수 없는 오류"
          }`
        );
      }

      const result = await registerResponse.json();
      alert(
        "✅ 3단계 완료: 서버 저장 성공!\n\n🎉 Face ID/지문 인식 등록이 완료되었습니다!\n\n이제 생체 인식으로 로그인할 수 있습니다."
      );

      localStorage.setItem("biometric-registered", "true");
      setIsRegistered(true);
      onSuccess?.();
    } catch (error) {
      console.error("생체 인식 등록 실패:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "생체 인식 등록에 실패했습니다";
      setError(errorMessage);

      // 모바일에서 바로 확인할 수 있도록 alert
      alert(
        `❌ 생체 인식 등록 실패!\n\n오류 내용:\n${errorMessage}\n\n이 정보를 개발자에게 전달해주세요.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 테스트용 등록 (실제 생체 인식 없이)
  const testRegister = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("테스트 등록 시작...");

      // 서버에서 등록 옵션 가져오기
      const response = await fetch("/api/biometric/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "생체 인식 등록 준비 실패");
      }

      const options = await response.json();
      console.log("등록 옵션 받음:", options);

      // 테스트용 가짜 자격 증명
      const testCredential = {
        id: "test-credential-id-" + Date.now(),
        type: "public-key",
        response: {
          publicKey: new ArrayBuffer(32),
          signCount: 0,
        },
      };

      console.log("테스트 자격 증명 생성:", testCredential);

      // 서버에 등록 완료 알림
      const registerResponse = await fetch("/api/biometric/register", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          userId: user.id,
          credential: testCredential,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || "생체 인식 등록 완료 실패");
      }

      const result = await registerResponse.json();
      console.log("테스트 등록 완료:", result);

      localStorage.setItem("biometric-registered", "true");
      setIsRegistered(true);
      onSuccess?.();
    } catch (error) {
      console.error("테스트 등록 실패:", error);
      setError(
        error instanceof Error ? error.message : "테스트 등록에 실패했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 생체 인식 로그인
  const authenticateBiometric = async () => {
    setIsLoading(true);
    setError(null);

    try {
      alert(
        "🔍 Face ID/지문 인식 로그인 시작...\n\n기기에서 생체 인식 인증 창이 나타날 것입니다."
      );

      // 서버에서 인증 옵션 가져오기
      const response = await fetch("/api/biometric/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("생체 인식 인증 준비 실패");
      }

      const options = await response.json();

      // 생체 인식 인증
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(options.challenge),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) {
        throw new Error("생체 인식 인증이 취소되었습니다");
      }

      alert("✅ Face ID/지문 인식 인증 성공!\n\n서버에 인증 정보를 전송 중...");

      // 서버에 인증 완료 알림
      const authResponse = await fetch("/api/biometric/authenticate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assertion: assertion,
        }),
      });

      if (!authResponse.ok) {
        throw new Error("생체 인식 인증 실패");
      }

      const { session } = await authResponse.json();

      // Supabase 세션 설정
      await supabase.auth.setSession(session);

      alert("🎉 생체 인식 로그인 완료!");
      onSuccess?.();
    } catch (error) {
      console.error("생체 인식 인증 실패:", error);
      setError(
        error instanceof Error ? error.message : "생체 인식 인증에 실패했습니다"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 생체 인식 등록 해제
  const unregisterBiometric = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetch("/api/biometric/unregister", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
      });

      localStorage.removeItem("biometric-registered");
      localStorage.removeItem("biometric-credential"); // 간단 모드 데이터도 제거
      setIsRegistered(false);
    } catch (error) {
      console.error("생체 인식 등록 해제 실패:", error);
      setError("생체 인식 등록 해제에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // 간단한 API 테스트
  const testAPI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1단계: 등록 준비 API 테스트
      const response = await fetch("/api/biometric/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (
              await supabase.auth.getSession()
            ).data.session?.access_token
          }`,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${responseText}`);
      }

      const options = JSON.parse(responseText);

      // 성공 메시지 표시
      alert(
        `✅ API 테스트 성공!\n\n응답 내용:\n${JSON.stringify(options, null, 2)}`
      );
    } catch (error) {
      console.error("API 테스트 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setError(errorMessage);

      // 모바일에서 바로 확인할 수 있도록 alert
      alert(`❌ API 테스트 실패!\n\n오류 내용:\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSupported === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="text-center p-6">
        <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          생체 인식을 지원하지 않습니다
        </h3>
        <p className="text-gray-600 text-sm">
          이 기기에서는 Face ID, 지문 인식, 또는 PIN을 사용할 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Fingerprint className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          생체 인식 로그인
        </h3>
        <p className="text-gray-600 text-sm">
          Face ID, 지문 인식, 또는 PIN으로 빠르게 로그인하세요
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <XCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-red-700 text-sm font-medium">
                오류 발생
              </span>
              <p className="text-red-600 text-xs mt-1 break-words">{error}</p>
              <button
                onClick={() => {
                  alert(
                    `상세 오류 정보:\n\n${error}\n\n이 정보를 개발자에게 전달해주세요.`
                  );
                }}
                className="text-red-500 text-xs underline mt-2"
              >
                상세 정보 보기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!isRegistered ? (
          <>
            <Button
              onClick={registerBiometric}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              생체 인식 등록하기
            </Button>

            <Button
              onClick={testRegister}
              disabled={isLoading}
              variant="outline"
              className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2" />
              ) : (
                <span className="mr-2">🧪</span>
              )}
              테스트 등록 (디버깅용)
            </Button>

            <Button
              onClick={testAPI}
              disabled={isLoading}
              variant="outline"
              className="w-full text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2" />
              ) : (
                <span className="mr-2">🔍</span>
              )}
              API 연결 테스트
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={authenticateBiometric}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Fingerprint className="w-4 h-4 mr-2" />
              )}
              생체 인식으로 로그인
            </Button>

            <Button
              onClick={unregisterBiometric}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <XCircle className="w-4 h-4 mr-2" />
              생체 인식 등록 해제
            </Button>
          </>
        )}

        {onCancel && (
          <Button onClick={onCancel} variant="ghost" className="w-full">
            취소
          </Button>
        )}
      </div>

      <div className="text-xs text-gray-500 text-center">
        <p>• Face ID, 지문 인식, 또는 PIN을 사용합니다</p>
        <p>• 기기에서만 저장되며 서버로 전송되지 않습니다</p>
      </div>
    </div>
  );
}
