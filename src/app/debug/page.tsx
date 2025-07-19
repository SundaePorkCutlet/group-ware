"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // 모든 거래 내역 조회
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("*")
          .order("date", { ascending: true });

        if (error) {
          setError(error.message);
          return;
        }

        // 1월 1일 데이터 특별 확인
        const jan1Data =
          transactions?.filter((tx) => {
            const date = new Date(tx.date);
            return date.getMonth() === 0 && date.getDate() === 1;
          }) || [];

        setData({
          totalCount: transactions?.length || 0,
          jan1Count: jan1Data.length,
          jan1Data: jan1Data,
          recentData: transactions?.slice(-10) || [],
          allData: transactions || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">오류: {error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">데이터베이스 디버그</h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📊 전체 통계</h2>
        <p>총 거래 내역: {data.totalCount}개</p>
        <p>1월 1일 거래: {data.jan1Count}개</p>
      </div>

      {data.jan1Count > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">📅 1월 1일 거래 내역</h2>
          <div className="bg-gray-100 p-4 rounded">
            {data.jan1Data.map((tx: any, index: number) => (
              <div key={index} className="mb-2">
                <strong>{tx.date}</strong>: {tx.type} {tx.amount}원
                {tx.category && ` (${tx.category})`}
                {tx.memo && ` - ${tx.memo}`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">📋 최근 10개 거래</h2>
        <div className="bg-gray-100 p-4 rounded">
          {data.recentData.length > 0 ? (
            data.recentData.map((tx: any, index: number) => (
              <div key={index} className="mb-2">
                <strong>{tx.date}</strong>: {tx.type} {tx.amount}원
                {tx.category && ` (${tx.category})`}
                {tx.memo && ` - ${tx.memo}`}
              </div>
            ))
          ) : (
            <p>거래 내역이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">🔍 전체 데이터 (JSON)</h2>
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
          {JSON.stringify(data.allData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
