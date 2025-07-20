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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-gray-600 mr-2" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">출퇴근 관리</h2>
            {company && <p className="text-sm text-gray-500">{company.name}</p>}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {currentTime.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </div>
      </div>

      {/* 오늘의 출퇴근 현황 */}
      {hasWorkedToday && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            오늘의 기록
          </h3>
          <div className="space-y-2">
            {todayAttendance.clockIn && (
              <div className="flex items-center text-sm">
                <LogIn className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-gray-600 mr-2">출근:</span>
                <span className="font-mono text-gray-900">
                  {formatTime(todayAttendance.clockIn)}
                </span>
              </div>
            )}
            {todayAttendance.clockOut && (
              <div className="flex items-center text-sm">
                <LogOut className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-gray-600 mr-2">퇴근:</span>
                <span className="font-mono text-gray-900">
                  {formatTime(todayAttendance.clockOut)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 출퇴근 버튼 */}
      <div className="space-y-3">
        {!todayAttendance.clockIn ? (
          <Button
            onClick={handleClockIn}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            출근하기
          </Button>
        ) : !todayAttendance.clockOut ? (
          <Button
            onClick={handleClockOut}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            퇴근하기
          </Button>
        ) : (
          <div className="text-center py-4">
            <Home className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">오늘 업무가 완료되었습니다</p>
            <p className="text-gray-500 text-xs mt-1">수고하셨어요!</p>
          </div>
        )}
      </div>

      {/* 현재 상태 표시 */}
      {isWorking && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
            근무 중
          </div>
        </div>
      )}
    </div>
  );
}
