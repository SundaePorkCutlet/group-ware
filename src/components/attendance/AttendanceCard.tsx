"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Clock, LogIn, LogOut, Coffee, Home, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

interface TodayAttendance {
  clockIn?: string;
  clockOut?: string;
}

interface Company {
  id: string;
  name: string;
}

export default function AttendanceCard() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [company, setCompany] = useState<Company | null>(null);
  const supabase = createClient();

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 오늘 출근 기록 조회 (events 테이블에서)
  useEffect(() => {
    if (user) {
      loadTodayAttendance();
    }
  }, [user]);

  // profile이 로드되면 회사 정보 조회
  useEffect(() => {
    if (profile) {
      loadCompanyInfo();
    }
  }, [profile]);

  const loadTodayAttendance = async () => {
    if (!user) return;

    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", user.id)
      .in("title", ["🌅 출근", "🌆 퇴근"])
      .gte("start_date", todayStart.toISOString())
      .lt("start_date", todayEnd.toISOString());

    if (error) {
      console.error("출근 기록 조회 오류:", error);
      return;
    }

    const attendance: TodayAttendance = {};

    data?.forEach((event: any) => {
      if (event.title === "🌅 출근") {
        attendance.clockIn = event.start_date;
      } else if (event.title === "🌆 퇴근") {
        attendance.clockOut = event.start_date;
      }
    });

    setTodayAttendance(attendance);
  };

  const loadCompanyInfo = async () => {
    if (!profile?.company_id) return;

    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single();

    if (!error && data) {
      setCompany(data as Company);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;

    setIsLoading(true);
    const now = new Date();

    try {
      // 출근 이벤트 생성
      const { error } = await supabase.from("events").insert({
        title: "🌅 출근",
        description: "출근 기록 - 자동 생성",
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        event_type: "personal",
        visibility: "personal",
        is_all_day: false,
        created_by: user.id,
      });

      if (error) throw error;

      // 상태 업데이트
      setTodayAttendance((prev) => ({ ...prev, clockIn: now.toISOString() }));

      alert("출근이 완료되었습니다! 개인 캘린더에도 기록되었어요 ✨");
    } catch (error) {
      console.error("출근 처리 오류:", error);
      alert("출근 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !todayAttendance.clockIn) return;

    setIsLoading(true);
    const now = new Date();

    try {
      // 퇴근 이벤트 생성
      const { error } = await supabase.from("events").insert({
        title: "🌆 퇴근",
        description: "퇴근 기록 - 자동 생성",
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        event_type: "personal",
        visibility: "personal",
        is_all_day: false,
        created_by: user.id,
      });

      if (error) throw error;

      // 상태 업데이트
      setTodayAttendance((prev) => ({ ...prev, clockOut: now.toISOString() }));

      alert(
        "퇴근이 완료되었습니다! 수고하셨어요 🎉 개인 캘린더에도 기록되었어요"
      );
    } catch (error) {
      console.error("퇴근 처리 오류:", error);
      alert("퇴근 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // 회사에 소속되지 않은 사용자인 경우
  if (!profile?.company_id) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">출퇴근 관리</h2>
        </div>

        <div className="text-center py-8">
          <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">회사에 가입하시면</p>
          <p className="text-gray-600 mb-4">출퇴근 기록을 관리할 수 있어요</p>
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            회사 가입하기
          </Button>
        </div>
      </div>
    );
  }

  const hasWorkedToday = todayAttendance.clockIn || todayAttendance.clockOut;
  const isWorking = todayAttendance.clockIn && !todayAttendance.clockOut;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border-2 border-blue-200 p-8 col-span-full md:col-span-2 lg:col-span-1">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">출퇴근 관리</h2>
            {company && <p className="text-sm text-gray-600">{company.name}</p>}
          </div>
        </div>
        <div className="text-lg font-mono text-blue-600 bg-white px-3 py-1 rounded-lg shadow-sm">
          {currentTime.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      </div>

      {/* 오늘의 출퇴근 현황 */}
      {hasWorkedToday && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-6 border border-blue-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            오늘의 기록
          </h3>
          <div className="space-y-3">
            {todayAttendance.clockIn && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <LogIn className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-gray-600">출근:</span>
                </div>
                <span className="font-mono font-semibold text-gray-900">
                  {formatTime(todayAttendance.clockIn)}
                </span>
              </div>
            )}
            {todayAttendance.clockOut && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <LogOut className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-gray-600">퇴근:</span>
                </div>
                <span className="font-mono font-semibold text-gray-900">
                  {formatTime(todayAttendance.clockOut)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 출퇴근 버튼 */}
      <div className="space-y-4">
        {!todayAttendance.clockIn ? (
          <Button
            onClick={handleClockIn}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-semibold py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            size="lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
            ) : (
              <LogIn className="w-6 h-6 mr-3" />
            )}
            🌅 출근하기
          </Button>
        ) : !todayAttendance.clockOut ? (
          <Button
            onClick={handleClockOut}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-semibold py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
            size="lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
            ) : (
              <LogOut className="w-6 h-6 mr-3" />
            )}
            🌆 퇴근하기
          </Button>
        ) : (
          <div className="text-center py-6 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200">
            <Home className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-800 font-semibold mb-1">오늘 업무 완료!</p>
            <p className="text-gray-600 text-sm">수고하셨어요! 🎉</p>
          </div>
        )}
      </div>

      {/* 현재 상태 표시 */}
      {isWorking && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse" />
            근무 중
          </div>
        </div>
      )}
    </div>
  );
}
