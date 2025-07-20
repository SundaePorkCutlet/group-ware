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
        throw new Error("생체 인식 등록 준비 실패");
      }

      const options = await response.json();

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
        throw new Error("생체 인식 등록 완료 실패");
      }

      localStorage.setItem("biometric-registered", "true");
      setIsRegistered(true);
      onSuccess?.();
    } catch (error) {
      console.error("생체 인식 등록 실패:", error);
      setError(
        error instanceof Error ? error.message : "생체 인식 등록에 실패했습니다"
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
      setIsRegistered(false);
    } catch (error) {
      console.error("생체 인식 등록 해제 실패:", error);
      setError("생체 인식 등록 해제에 실패했습니다");
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
          <div className="flex items-center">
            <XCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {!isRegistered ? (
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
