"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Calendar from "@/components/calendar/Calendar";
import EventModal from "@/components/calendar/EventModal";
import AttendanceModal from "@/components/calendar/AttendanceModal";
import AttendanceListModal from "@/components/calendar/AttendanceListModal";
import { CalendarDays, Plus, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useEventStore } from "@/store/eventStore";
import dynamic from "next/dynamic";
import TransactionModal from "@/components/ui/transaction-modal";
const WorkSummarySidebar = dynamic(
  () => import("@/components/work/WorkSummarySidebar"),
  { ssr: false }
);

export interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  created_by: string;
  department_id?: string;
  is_all_day: boolean;
  event_type: "meeting" | "holiday" | "attendance" | "other";
  visibility: "personal" | "company";
  created_at: string;
  updated_at: string;
  exclude_lunch_time?: boolean;
  leave_type?: string; // 추가
}

export default function CalendarPage() {
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.profile);
  const {
    myEvents,
    companyEvents,
    loading,
    fetchEvents: fetchEventsFromStore,
  } = useEventStore();

  // fetchEventsFromStore를 메모이제이션
  const memoizedFetchEvents = useCallback(
    (userId: string, companyId?: string | null) => {
      fetchEventsFromStore(userId, companyId);
    },
    [fetchEventsFromStore]
  );

  // 컴포넌트 마운트 시 한 번만 실행
  React.useEffect(() => {
    if (user && userProfile !== undefined) {
      memoizedFetchEvents(user.id, userProfile?.company_id);
    }
  }, [user?.id, userProfile?.company_id, memoizedFetchEvents]);

  const [showPersonalCalendar, setShowPersonalCalendar] = useState(true);
  const [showCompanyCalendar, setShowCompanyCalendar] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAttendanceListModal, setShowAttendanceListModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [attendanceEvents, setAttendanceEvents] = useState<Event[]>([]);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const supabase = createClient();

  // 1. 상태 추가
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionDate, setTransactionDate] = useState<Date | null>(null);
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [allEventsForDate, setAllEventsForDate] = useState<Event[]>([]);
  const [allEventsDate, setAllEventsDate] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  // 1. 탭 상태 추가
  const [activeTab, setActiveTab] = useState<"calendar" | "ledger">("calendar");
  // 상태 추가
  const [ledgerYear, setLedgerYear] = useState(2025);
  const [ledgerMonth, setLedgerMonth] = useState<string | number>("전체");
  const [ledgerCategory, setLedgerCategory] = useState("");

  // 거래 내역 가져오기
  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: true });

        if (error) {
          console.error("거래 내역 가져오기 오류:", error);
        } else {
          setTransactions(data ?? []);
        }
      } catch (error) {
        console.error("거래 내역 가져오기 실패:", error);
      }
    };

    fetchTransactions();
  }, [user, refreshTrigger]);

  // 렌더링용 events
  const events = [
    ...(showPersonalCalendar ? myEvents : []),
    ...(showCompanyCalendar ? companyEvents : []),
  ];
  console.log(
    "events:",
    events.map((e) => ({
      id: e.id,
      title: e.title,
      created_by: e.created_by,
      visibility: e.visibility,
    }))
  );

  const handleEventSave = () => {
    setShowEventModal(false);
    setEditingEvent(null);
    setSelectedDate(null);
    // 이벤트 새로고침
    if (user) {
      memoizedFetchEvents(user.id, userProfile?.company_id);
    }
    // WorkSummarySidebar 새로고침 트리거
    setRefreshTrigger((prev) => prev + 1);
  };

  // 날짜 클릭 핸들러 수정
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
    setTransactionDate(date);
  };

  const handleEventClick = (event: Event | any) => {
    // 통합된 출퇴근 이벤트인지 확인
    if (event.isAttendanceCombined && event.originalEvents) {
      setAttendanceEvents(event.originalEvents);
      setAttendanceDate(event.start_date);
      setShowAttendanceListModal(true);
      return;
    }

    // 개별 출퇴근 이벤트인지 확인
    const isAttendanceEvent =
      event.title === "🌅 출근" || event.title === "🌆 퇴근";

    setEditingEvent(event);

    if (isAttendanceEvent) {
      setShowAttendanceModal(true);
    } else {
      setShowEventModal(true);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            캘린더에 접근하려면 로그인이 필요합니다
          </h1>
          <p className="text-gray-600 mb-4">
            일정을 관리하고 팀원들과 공유하세요
          </p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  // 1. 드롭다운 값 추출 (빈 데이터 처리 개선)
  const years =
    transactions.length > 0
      ? Array.from(
          new Set(transactions.map((tx) => new Date(tx.date).getFullYear()))
        ).sort((a, b) => b - a)
      : [new Date().getFullYear()];

  const months = ["전체", ...Array.from({ length: 12 }, (_, i) => i + 1)];

  const categories = Array.from(
    new Set(transactions.map((tx) => tx.category).filter(Boolean))
  );

  // 2. 필터링 (간단한 날짜 비교)
  console.log("필터링 설정:", { ledgerYear, ledgerMonth, ledgerCategory });
  console.log("전체 거래 내역:", transactions);

  const filteredTransactions = transactions.filter((tx) => {
    try {
      // 날짜 문자열을 직접 비교 (YYYY-MM-DD 형식)
      const txYear = parseInt(tx.date.split("-")[0]);
      const txMonth = parseInt(tx.date.split("-")[1]);

      const matchYear = txYear === ledgerYear;
      const matchMonth = ledgerMonth === "전체" || txMonth === ledgerMonth;
      const matchCategory = ledgerCategory
        ? tx.category === ledgerCategory
        : true;

      console.log(
        `필터링: ${
          tx.date
        } (${txYear}-${txMonth}) vs ${ledgerYear}-${ledgerMonth} = ${
          matchYear && matchMonth
        }`
      );

      return matchYear && matchMonth && matchCategory;
    } catch (error) {
      console.error("날짜 파싱 오류:", tx.date, error);
      return false;
    }
  });

  console.log("필터링된 거래 내역:", filteredTransactions);

  // 3. 합계 계산 (데이터 타입 안전성 개선)
  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => {
      const amount = Number(tx.amount) || 0;
      return sum + amount;
    }, 0);

  const totalExpense = filteredTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => {
      const amount = Number(tx.amount) || 0;
      return sum + amount;
    }, 0);

  const categorySums: Record<string, { income: number; expense: number }> = {};
  filteredTransactions.forEach((tx) => {
    const category = tx.category || "기타";
    const amount = Number(tx.amount) || 0;

    if (!categorySums[category]) {
      categorySums[category] = { income: 0, expense: 0 };
    }
    if (tx.type === "income") {
      categorySums[category].income += amount;
    } else if (tx.type === "expense") {
      categorySums[category].expense += amount;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                뒤로가기
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  홈으로
                </Button>
              </Link>
              <div className="flex items-center">
                <CalendarDays className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
              </div>
            </div>
            <Button onClick={() => setShowEventModal(true)}>
              <Plus className="w-4 h-4 mr-2" />새 일정
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상단 탭 UI */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "calendar"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
            onClick={() => setActiveTab("calendar")}
          >
            <span className="text-lg">📅</span>
            캘린더
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "ledger"
                ? "bg-white text-blue-600 shadow-md"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
            }`}
            onClick={() => setActiveTab("ledger")}
          >
            <span className="text-lg">💰</span>
            가계부
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">캘린더를 불러오는 중...</p>
            </div>
          </div>
        ) : userProfile === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "calendar" && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Calendar
                    events={events}
                    transactions={[]}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                    showPersonalCalendar={showPersonalCalendar}
                    showCompanyCalendar={showCompanyCalendar}
                    onTogglePersonalCalendar={() =>
                      setShowPersonalCalendar(!showPersonalCalendar)
                    }
                    onToggleCompanyCalendar={() =>
                      setShowCompanyCalendar(!showCompanyCalendar)
                    }
                    userHasCompany={userProfile?.company_id !== null}
                    onShowAllEventsForDate={(date: Date, events: Event[]) => {
                      setAllEventsDate(date);
                      setAllEventsForDate(events);
                      setShowAllEventsModal(true);
                    }}
                  />
                </div>
                <WorkSummarySidebar refreshTrigger={refreshTrigger} />
              </div>
            )}
            {activeTab === "ledger" && (
              <div className="flex gap-6">
                <div className="flex-1">
                  <Calendar
                    events={[]}
                    transactions={filteredTransactions}
                    onDateClick={(date) => {
                      setTransactionDate(date);
                      setEditTransaction(null);
                      setShowTransactionModal(true);
                    }}
                    onEventClick={() => {}}
                    showPersonalCalendar={false}
                    showCompanyCalendar={false}
                    onTogglePersonalCalendar={() => {}}
                    onToggleCompanyCalendar={() => {}}
                    userHasCompany={false}
                    onShowAllEventsForDate={() => {}}
                    onTransactionClick={(tx, date) => {
                      setEditTransaction(tx);
                      setTransactionDate(new Date(tx.date));
                      setShowTransactionModal(true);
                    }}
                    isLedgerMode={true}
                  />
                </div>
                <aside className="w-80 bg-white rounded-xl shadow p-6 flex flex-col gap-6 border">
                  {/* 연도/월 선택 */}
                  <div>
                    <h4 className="font-bold mb-3">기간 선택</h4>
                    <div className="flex gap-2 mb-3">
                      <select
                        value={ledgerYear}
                        onChange={(e) => setLedgerYear(Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}년
                          </option>
                        ))}
                      </select>
                      <select
                        value={ledgerMonth}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLedgerMonth(
                            value === "전체" ? "전체" : Number(value)
                          );
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {months.map((month) => (
                          <option key={month} value={month}>
                            {month === "전체" ? "전체" : `${month}월`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={ledgerCategory}
                      onChange={(e) => setLedgerCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">전체 카테고리</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 합계 정보 */}
                  <div>
                    <h4 className="font-bold mb-3">합계</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700 font-medium">수입</span>
                        <span className="text-green-700 font-bold">
                          {totalIncome.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-red-700 font-medium">지출</span>
                        <span className="text-red-700 font-bold">
                          {totalExpense.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-t">
                        <span className="text-blue-700 font-medium">
                          순수익
                        </span>
                        <span
                          className={`font-bold ${
                            totalIncome - totalExpense >= 0
                              ? "text-blue-700"
                              : "text-red-700"
                          }`}
                        >
                          {(totalIncome - totalExpense).toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 카테고리별 합계 */}
                  <div>
                    <h4 className="font-bold mb-2">카테고리별 합계</h4>
                    {Object.keys(categorySums).length > 0 ? (
                      <table className="w-full text-xs border">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="p-1 border">카테고리</th>
                            <th className="p-1 border text-green-700">수입</th>
                            <th className="p-1 border text-red-700">지출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(categorySums).map(([cat, sum]) => (
                            <tr key={cat}>
                              <td className="p-1 border font-bold">{cat}</td>
                              <td className="p-1 border text-green-700">
                                +{sum.income.toLocaleString()}원
                              </td>
                              <td className="p-1 border text-red-700">
                                -{sum.expense.toLocaleString()}원
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        {filteredTransactions.length === 0
                          ? "이번 달 거래 내역이 없습니다."
                          : "카테고리가 있는 거래가 없습니다."}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </main>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
            setSelectedDate(null);
          }}
          onSave={handleEventSave}
          selectedDate={selectedDate}
          editingEvent={editingEvent}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && editingEvent && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setEditingEvent(null);
          }}
          onDelete={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger((prev) => prev + 1);
          }}
          onSave={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger((prev) => prev + 1);
          }}
          event={editingEvent}
        />
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
            setSelectedDate(null);
          }}
          onSave={handleEventSave}
          selectedDate={selectedDate}
          editingEvent={editingEvent}
        />
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && editingEvent && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setEditingEvent(null);
          }}
          onDelete={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger((prev) => prev + 1);
          }}
          onSave={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger((prev) => prev + 1);
          }}
          event={editingEvent}
        />
      )}

      {/* Attendance List Modal */}
      {showAttendanceListModal && (
        <AttendanceListModal
          isOpen={showAttendanceListModal}
          onClose={() => {
            setShowAttendanceListModal(false);
            setAttendanceEvents([]);
            setAttendanceDate("");
          }}
          onRefresh={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger((prev) => prev + 1);
          }}
          events={attendanceEvents}
          date={attendanceDate}
        />
      )}

      {/* 모달 렌더링 */}
      {showAllEventsModal && allEventsDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {allEventsDate.getFullYear()}년 {allEventsDate.getMonth() + 1}월{" "}
                {allEventsDate.getDate()}일 전체 일정
              </h3>
              <button
                onClick={() => setShowAllEventsModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <ul className="space-y-2">
              {allEventsForDate.map((ev) => (
                <li
                  key={ev.id}
                  className="p-2 rounded bg-gray-50 border flex flex-col"
                >
                  <span className="font-semibold">{ev.title}</span>
                  <span className="text-xs text-gray-500">
                    {ev.start_date.slice(11, 16)} ~ {ev.end_date.slice(11, 16)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {ev.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* '수입/지출 추가' 버튼 및 모달 렌더링 */}
      {selectedDate && (
        <button
          className="mt-2 px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
          onClick={() => {
            setEditTransaction(null);
            setShowTransactionModal(true);
          }}
        >
          수입/지출 추가
        </button>
      )}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        date={transactionDate!}
        transaction={editTransaction}
        onSave={async (transactionData) => {
          const dateStr = transactionDate!.toISOString().slice(0, 10);
          if (editTransaction) {
            const { error } = await supabase
              .from("transactions")
              .update({
                ...transactionData,
                date: dateStr,
              })
              .eq("id", editTransaction.id);
            if (error) throw new Error("수정 실패: " + error.message);
          } else {
            const { error } = await supabase.from("transactions").insert({
              user_id: user.id,
              date: dateStr,
              ...transactionData,
            });
            if (error) throw new Error("저장 실패: " + error.message);
          }
          // 거래 내역 새로고침
          const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: true });
          setTransactions(data ?? []);
        }}
        onDelete={
          editTransaction
            ? async (id) => {
                const { error } = await supabase
                  .from("transactions")
                  .delete()
                  .eq("id", id);
                if (error) throw new Error("삭제 실패: " + error.message);
                // 거래 내역 새로고침
                const { data } = await supabase
                  .from("transactions")
                  .select("*")
                  .eq("user_id", user.id)
                  .order("date", { ascending: true });
                setTransactions(data ?? []);
              }
            : undefined
        }
      />
    </div>
  );
}
