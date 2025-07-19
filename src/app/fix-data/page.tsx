"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function FixDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFixData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/fix-transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "수정 실패");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">데이터 수정</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">수정할 내용</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>중복된 300만원 수입 데이터 중 하나 삭제</li>
            <li>남은 데이터의 날짜를 2024-12-31 → 2025-01-01로 변경</li>
          </ul>
        </div>

        <Button
          onClick={handleFixData}
          disabled={loading}
          className="w-full mb-6"
        >
          {loading ? "수정 중..." : "데이터 수정 실행"}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">오류 발생</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-green-800 font-semibold mb-2">수정 완료</h3>
            <p className="text-green-700 mb-4">{result.message}</p>
            <p className="text-green-700">
              총 거래 내역: {result.totalCount}개
            </p>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">수정된 데이터:</h4>
              <pre className="bg-white p-3 rounded text-sm overflow-auto">
                {JSON.stringify(result.updatedData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="text-center">
          <a
            href="/calendar"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            캘린더로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
