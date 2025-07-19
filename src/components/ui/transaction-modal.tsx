"use client";

import { useState, useEffect } from "react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  memo: string;
  date: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  transaction?: Transaction | null;
  onSave: (transaction: Omit<Transaction, "id" | "date">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function TransactionModal({
  isOpen,
  onClose,
  date,
  transaction,
  onSave,
  onDelete,
}: TransactionModalProps) {
  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    amount: "",
    category: "",
    memo: "",
  });

  // 금액에 쉼표 추가하는 함수
  const formatAmount = (value: string) => {
    // 숫자가 아닌 문자 제거
    const numericValue = value.replace(/[^\d]/g, "");
    // 쉼표 추가
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // 쉼표 제거하는 함수
  const unformatAmount = (value: string) => {
    return value.replace(/,/g, "");
  };

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: formatAmount(transaction.amount.toString()),
        category: transaction.category || "",
        memo: transaction.memo || "",
      });
    } else {
      setFormData({
        type: "income",
        amount: "",
        category: "",
        memo: "",
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.amount) {
      alert("타입과 금액을 입력하세요!");
      return;
    }

    try {
      await onSave({
        type: formData.type,
        amount: Number(unformatAmount(formData.amount)),
        category: formData.category,
        memo: formData.memo,
      });
      onClose();
    } catch (error) {
      console.error("저장 실패:", error);
    }
  };

  const handleDelete = async () => {
    if (!transaction || !onDelete) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await onDelete(transaction.id);
      onClose();
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-100">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200 hover:scale-110"
          >
            ×
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1 text-white">
              {date.getFullYear()}년 {date.getMonth() + 1}월 {date.getDate()}일
            </div>
            <div className="text-white font-medium">
              {transaction ? "거래 내역 수정" : "새 거래 내역 추가"}
            </div>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 타입 선택 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              거래 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative group">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={formData.type === "income"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "income" | "expense",
                    })
                  }
                  className="sr-only peer"
                />
                <div className="border-2 border-gray-200 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group-hover:border-green-300 peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:shadow-md">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="font-semibold text-green-700 peer-checked:text-green-800">
                    수입
                  </div>
                </div>
              </label>
              <label className="relative group">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={formData.type === "expense"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "income" | "expense",
                    })
                  }
                  className="sr-only peer"
                />
                <div className="border-2 border-gray-200 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group-hover:border-red-300 peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:shadow-md">
                  <div className="text-2xl mb-2">💸</div>
                  <div className="font-semibold text-red-700 peer-checked:text-red-800">
                    지출
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 금액 입력 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              금액
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.amount}
                onChange={(e) => {
                  const formattedValue = formatAmount(e.target.value);
                  setFormData({ ...formData, amount: formattedValue });
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:border-blue-500 focus:outline-none transition-colors"
                required
                placeholder="0"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                원
              </div>
            </div>
          </div>

          {/* 카테고리 입력 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              카테고리
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="예: 식비, 월급, 교통비"
            />
          </div>

          {/* 메모 입력 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              메모
            </label>
            <textarea
              rows={3}
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              placeholder="거래에 대한 간단한 설명을 입력하세요"
            />
          </div>

          {/* 버튼들 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              {transaction ? "수정하기" : "저장하기"}
            </button>
            {transaction && onDelete && (
              <button
                type="button"
                className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors"
                onClick={handleDelete}
              >
                삭제
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
