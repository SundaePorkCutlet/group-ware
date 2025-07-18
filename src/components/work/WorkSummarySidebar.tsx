import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Settings, CalendarDays, CheckCircle, Clock, MinusCircle } from 'lucide-react';

interface AttendanceEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  exclude_lunch_time?: boolean;
}

interface HolidayEvent {
  id: string;
  start_date: string;
  end_date: string;
  description?: string; // 연차/반차/반반차
  leave_type?: string | null;
}

// ProgressBar 컴포넌트 (간단 버전)
function ProgressBar({ percent, color = 'bg-blue-500', height = 'h-2', bg = 'bg-gray-200' }: { percent: number, color?: string, height?: string, bg?: string }) {
  return (
    <div className={`w-full rounded ${bg} ${height}`} style={{ minWidth: 60 }}>
      <div
        className={`rounded ${color} ${height}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, transition: 'width 0.3s' }}
      />
    </div>
  )
}

interface WorkSummarySidebarProps {
  refreshTrigger?: number;
}

export default function WorkSummarySidebar({ refreshTrigger = 0 }: WorkSummarySidebarProps) {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const supabase = createClient();
  const [weeklyWorkHours, setWeeklyWorkHours] = useState<number>(40);
  const [workStart, setWorkStart] = useState<string>('월');
  const [workEnd, setWorkEnd] = useState<string>('금');

  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([]);
  const [totalWorked, setTotalWorked] = useState<number>(0); // 분 단위
  const [showSetting, setShowSetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [annualLeave, setAnnualLeave] = useState<number>(15); // 기본값 15일
  const [usedAnnualLeave, setUsedAnnualLeave] = useState<number>(0);
  const [savingAnnual, setSavingAnnual] = useState(false);
  const [annualMsg, setAnnualMsg] = useState<string | null>(null);

  // 유저 프로필 정보 fetch
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('weekly_work_hours, weekly_work_start, weekly_work_end, annual_leave')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setWeeklyWorkHours(Number(data.weekly_work_hours ?? 40));
        setWorkStart(String(data.weekly_work_start ?? '월'));
        setWorkEnd(String(data.weekly_work_end ?? '금'));
        setAnnualLeave(Number(data.annual_leave ?? 15));
      }
    })();
  }, [user]);

  // 이번 주 출퇴근 기록 fetch (attendance 테이블 + events 테이블)
  useEffect(() => {
    if (!user) return;
    // 이번 주 시작/끝 날짜 계산 (월~금 등)
    const now = new Date();
    const weekDays = ['일','월','화','수','목','금','토'];
    const startIdx = weekDays.indexOf(workStart);
    const endIdx = weekDays.indexOf(workEnd);
    let start = new Date(now);
    let end = new Date(now);
    // 이번 주 시작일
    start.setDate(now.getDate() - ((now.getDay() + 7 - startIdx) % 7));
    start.setHours(0,0,0,0);
    // 이번 주 종료일
    end.setDate(start.getDate() + ((endIdx - startIdx + 7) % 7));
    end.setHours(23,59,59,999);
    
    (async () => {
      // events 테이블에서 출퇴근 이벤트 가져오기
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_date, event_type, exclude_lunch_time')
        .eq('created_by', user.id)
        .in('title', ['🌅 출근', '🌆 퇴근'])
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString());
      
      if (!eventsError && eventsData) {
        setAttendanceEvents((eventsData as unknown as AttendanceEvent[]) ?? []);
      }

      // 올해 전체 범위로 holidayEvents 조회
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      const { data: holidayData, error: holidayError } = await supabase
        .from('events')
        .select('id, start_date, end_date, description, leave_type')
        .eq('created_by', user.id)
        .eq('event_type', 'holiday')
        .not('leave_type', 'is', null)
        .gte('start_date', yearStart.toISOString())
        .lte('end_date', yearEnd.toISOString());
      if (!holidayError && holidayData) {
        setHolidayEvents((holidayData as unknown as HolidayEvent[]) ?? []);
      }
    })();
  }, [user, workStart, workEnd, refreshTrigger]);

  // 누적 근무시간 계산 (events 테이블만 사용, 각 날짜별 점심시간 제외 설정 적용)
  useEffect(() => {
    let total = 0;
    // 요일 인덱스 계산 (휴가 1일당 근무시간 계산에 필요)
    const weekDays = ['일','월','화','수','목','금','토'];
    const startIdx = weekDays.indexOf(workStart);
    const endIdx = weekDays.indexOf(workEnd);
    const workDays = ((endIdx - startIdx + 7) % 7) + 1;

    // 이번 주 시작/끝 계산
    const now = new Date();
    let weekStart = new Date(now);
    let weekEnd = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 7 - startIdx) % 7));
    weekStart.setHours(0,0,0,0);
    weekEnd.setDate(weekStart.getDate() + ((endIdx - startIdx + 7) % 7));
    weekEnd.setHours(23,59,59,999);

    // events 테이블에서 계산 (날짜별로 출근/퇴근 매칭)
    const eventsByDate: { [date: string]: { 
      clockIn?: Date, 
      clockOut?: Date, 
      excludeLunch?: boolean 
    } } = {};
    
    attendanceEvents.forEach((event) => {
      const eventDate = new Date(event.start_date);
      const dateKey = eventDate.toISOString().slice(0, 10);
      
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = {};
      }
      
      if (event.title === '🌅 출근') {
        eventsByDate[dateKey].clockIn = eventDate;
        // 출근 이벤트에서 점심시간 제외 설정을 가져옴 (기본값: true)
        eventsByDate[dateKey].excludeLunch = event.exclude_lunch_time ?? true;
      } else if (event.title === '🌆 퇴근') {
        eventsByDate[dateKey].clockOut = eventDate;
      }
    });
    
    // 날짜별로 출근/퇴근 시간 계산
    Object.values(eventsByDate).forEach((dayData) => {
      if (dayData.clockIn && dayData.clockOut) {
        const diff = (dayData.clockOut.getTime() - dayData.clockIn.getTime()) / 60000; // 분 단위
        if (diff > 0) {
          // 해당 날짜의 점심시간 제외 설정에 따라 계산
          const workTime = dayData.excludeLunch ? Math.max(diff - 60, 0) : diff;
          total += workTime;
        }
      }
    });

    // 이번 주 휴가(holiday) 일정만 근무시간에 더하기
    let holidayTotalMin = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    const weeklyHolidays = holidayEvents.filter(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return end >= weekStart && start <= weekEnd && ['1','2','3'].includes(String(event.leave_type));
    });
    weeklyHolidays.forEach((event) => {
      // 휴가 일정이 며칠짜리인지 계산 (종료일-시작일+1, 단 이번 주 내로 제한)
      const start = new Date(event.start_date) < weekStart ? weekStart : new Date(event.start_date);
      const end = new Date(event.end_date) > weekEnd ? weekEnd : new Date(event.end_date);
      const days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
      let dayValue = 1;
      if (String(event.leave_type) === '2') dayValue = 0.5;
      else if (String(event.leave_type) === '3') dayValue = 0.25;
      holidayTotalMin += days * dayValue * (weeklyWorkHours * 60 / workDays);
    });
    total += holidayTotalMin;
    setTotalWorked(total);
  }, [attendanceEvents, holidayEvents, weeklyWorkHours, workStart, workEnd]);

  // 올해 사용한 연차 계산
  useEffect(() => {
    // 올해 1월 1일 ~ 12월 31일 범위
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    let used = 0;
    
    holidayEvents
      .filter(event => {
        // leave_type이 문자열이든 숫자든 모두 처리
        const leaveType = String(event.leave_type);
        return leaveType === '1' || leaveType === '2' || leaveType === '3';
      })
      .forEach((event) => {
        // 올해 내 휴가만 계산
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        if (end < yearStart || start > yearEnd) return;
        const realStart = start < yearStart ? yearStart : start;
        const realEnd = end > yearEnd ? yearEnd : end;
        const dayMs = 24 * 60 * 60 * 1000;
        // 날짜 차이 계산 (시간은 무시하고 날짜만)
        const startDate = new Date(realStart.getFullYear(), realStart.getMonth(), realStart.getDate());
        const endDate = new Date(realEnd.getFullYear(), realEnd.getMonth(), realEnd.getDate());
        const days = Math.round((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
        let dayValue = 1;
        const leaveType = String(event.leave_type);
        if (leaveType === '2') dayValue = 0.5;
        else if (leaveType === '3') dayValue = 0.25;
        const eventUsed = days * dayValue;
        used += eventUsed;
        
        console.log('연차 계산:', {
          title: event.description,
          start: start.toISOString(),
          end: end.toISOString(),
          days,
          leaveType,
          dayValue,
          eventUsed,
          totalUsed: used
        });
      });
    setUsedAnnualLeave(used);
  }, [holidayEvents]);

  // 시간 포맷터
  const formatHourMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}시간 ${m}분`;
  };

  // 남은 근무시간(분)
  const remainMin = Math.max(weeklyWorkHours * 60 - totalWorked, 0);

  // 오늘 퇴근 가능 시간 계산
  const calculateTodayLeaveTime = () => {
    const now = new Date();
    const today = now.getDay(); // 0: 일요일, 1: 월요일, ..., 5: 금요일
    const weekDays = ['일','월','화','수','목','금','토'];
    const todayName = weekDays[today];
    
    // 오늘이 근무일인지 확인
    const startIdx = weekDays.indexOf(workStart);
    const endIdx = weekDays.indexOf(workEnd);
    const isWorkDay = today >= startIdx && today <= endIdx;
    
    if (!isWorkDay) return null;
    
    // 오늘 출근 기록 찾기
    const todayClockIn = attendanceEvents.find(event => {
      const eventDate = new Date(event.start_date);
      return event.title === '🌅 출근' && 
             eventDate.toDateString() === now.toDateString();
    });
    
    if (!todayClockIn) return null;
    
    // 오늘 이미 퇴근했는지 확인
    const todayClockOut = attendanceEvents.find(event => {
      const eventDate = new Date(event.start_date);
      return event.title === '🌆 퇴근' && 
             eventDate.toDateString() === now.toDateString();
    });
    
    if (todayClockOut) return null; // 이미 퇴근함
    
    // 오늘 근무한 시간 계산
    const clockInTime = new Date(todayClockIn.start_date);
    const workedToday = (now.getTime() - clockInTime.getTime()) / 60000; // 분 단위
    
    // 점심시간 제외 여부 확인
    const excludeLunch = todayClockIn.exclude_lunch_time ?? true;
    const actualWorkedToday = excludeLunch ? Math.max(workedToday - 60, 0) : workedToday;
    
    // 이번 주 남은 근무시간 계산 (오늘 제외)
    const weekDaysWorked = ['일','월','화','수','목','금','토'];
    const startIdx2 = weekDaysWorked.indexOf(workStart);
    const endIdx2 = weekDaysWorked.indexOf(workEnd);
    const workDays = ((endIdx2 - startIdx2 + 7) % 7) + 1;
    
    // 이번 주 시작/끝 계산
    let weekStart = new Date(now);
    let weekEnd = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 7 - startIdx2) % 7));
    weekStart.setHours(0,0,0,0);
    weekEnd.setDate(weekStart.getDate() + ((endIdx2 - startIdx2 + 7) % 7));
    weekEnd.setHours(23,59,59,999);
    
    // 이번 주 다른 날들 근무시간 계산
    let otherDaysWorked = 0;
    attendanceEvents.forEach(event => {
      const eventDate = new Date(event.start_date);
      if (eventDate.toDateString() === now.toDateString()) return; // 오늘 제외
      if (eventDate < weekStart || eventDate > weekEnd) return; // 이번 주가 아니면 제외
      
      if (event.title === '🌅 출근') {
        const clockIn = eventDate;
        const clockOut = attendanceEvents.find(e => 
          e.title === '🌆 퇴근' && 
          new Date(e.start_date).toDateString() === eventDate.toDateString()
        );
        
        if (clockOut) {
          const diff = (new Date(clockOut.start_date).getTime() - clockIn.getTime()) / 60000;
          const excludeLunch = event.exclude_lunch_time ?? true;
          otherDaysWorked += excludeLunch ? Math.max(diff - 60, 0) : diff;
        }
      }
    });
    
    // 이번 주 휴가로 인한 근무시간 추가
    const weeklyHolidays = holidayEvents.filter(event => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return end >= weekStart && start <= weekEnd && ['1','2','3'].includes(String(event.leave_type));
    });
    
    let holidayWorkTime = 0;
    weeklyHolidays.forEach(event => {
      const start = new Date(event.start_date) < weekStart ? weekStart : new Date(event.start_date);
      const end = new Date(event.end_date) > weekEnd ? weekEnd : new Date(event.end_date);
      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
      let dayValue = 1;
      if (String(event.leave_type) === '2') dayValue = 0.5;
      else if (String(event.leave_type) === '3') dayValue = 0.25;
      holidayWorkTime += days * dayValue * (weeklyWorkHours * 60 / workDays);
    });
    
    otherDaysWorked += holidayWorkTime;
    
    // 이번 주 목표 근무시간에서 다른 날들 근무시간을 뺀 값이 오늘 남은 근무시간
    const todayRemaining = Math.max(weeklyWorkHours * 60 - otherDaysWorked - actualWorkedToday, 0);
    
    // 퇴근 가능 시간 계산
    const leaveTime = new Date(now);
    leaveTime.setMinutes(leaveTime.getMinutes() + todayRemaining);
    
    return {
      time: leaveTime,
      remaining: todayRemaining
    };
  };
  
  const todayLeaveInfo = calculateTodayLeaveTime();

  // 저장 함수
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        weekly_work_hours: weeklyWorkHours,
        weekly_work_start: workStart,
        weekly_work_end: workEnd,
        annual_leave: annualLeave,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setMessage('저장 실패! 다시 시도해주세요.');
    } else {
      setMessage('저장 완료!');
      setShowSetting(false);
      // 저장 후 재조회
      setTimeout(() => setMessage(null), 1500);
      // 프로필 정보 재조회
      (async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('weekly_work_hours, weekly_work_start, weekly_work_end, annual_leave')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setWeeklyWorkHours(Number(data.weekly_work_hours ?? 40));
          setWorkStart(String(data.weekly_work_start ?? '월'));
          setWorkEnd(String(data.weekly_work_end ?? '금'));
          setAnnualLeave(Number(data.annual_leave ?? 15));
        }
      })();
    }
  };

  // 연차만 단독 저장 함수
  const handleSaveAnnual = async () => {
    if (!user) return;
    setSavingAnnual(true);
    setAnnualMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ annual_leave: annualLeave })
      .eq('id', user.id);
    setSavingAnnual(false);
    if (error) {
      setAnnualMsg('저장 실패! 다시 시도해주세요.');
    } else {
      setAnnualMsg('저장 완료!');
      // 저장 후 재조회
      setTimeout(() => setAnnualMsg(null), 1500);
      (async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('annual_leave')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setAnnualLeave(Number(data.annual_leave ?? 15));
        }
      })();
    }
  };

  return (
    <aside className="w-full max-w-xs bg-white rounded-xl shadow p-6 flex flex-col gap-6 border">
      {/* 상단: 주 근무시간 & 남은 연차 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="text-base font-bold text-gray-900">주 근무시간</span>
          <span className="text-base font-bold text-blue-700 ml-1">{weeklyWorkHours}시간</span>
          <span className="text-sm text-gray-500 ml-1">({workStart}~{workEnd})</span>
          <button onClick={() => setShowSetting(true)} className="ml-auto p-1 rounded hover:bg-gray-100">
            <Settings size={20} className="text-blue-600" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-base font-bold text-gray-900">남은 연차</span>
          <span className="text-base font-bold text-blue-700 ml-1">{(annualLeave - usedAnnualLeave).toFixed(2)}일</span>
          <span className="text-sm text-gray-500 ml-1">/ {annualLeave}일</span>
        </div>
      </div>
      <div className="border-t my-2" />
      {/* 근무시간 ProgressBar */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-gray-900">이번 주 근무</span>
            <span className="font-semibold text-indigo-700 ml-1">{formatHourMin(totalWorked)}</span>
          </div>
          {/* 근무시간 ProgressBar */}
          <ProgressBar percent={Math.round((totalWorked / (weeklyWorkHours * 60)) * 100)} color="bg-indigo-500" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MinusCircle className="w-4 h-4 text-rose-600" />
            <span className="font-semibold text-gray-900">남은 근무</span>
            <span className="font-semibold text-rose-700 ml-1">{formatHourMin(remainMin)}</span>
          </div>
          {/* 남은 근무 ProgressBar (반대 방향) */}
          <ProgressBar percent={Math.round((remainMin / (weeklyWorkHours * 60)) * 100)} color="bg-rose-500" />
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        * 점심시간 제외 설정은 출퇴근 이벤트 수정에서 변경 가능
      </div>
      
      {/* 오늘 퇴근 가능 시간 표시 */}
      {todayLeaveInfo && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span className="font-bold text-green-800">오늘 퇴근 가능 시간</span>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700 mb-1">
              {todayLeaveInfo.time.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
            <div className="text-sm text-green-600">
              남은 근무시간: {formatHourMin(todayLeaveInfo.remaining)}
            </div>
          </div>
        </div>
      )}
      <div className="border-t my-4" />
      {/* 연차 사용 내역 리스트 */}
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <h3 className="text-base font-bold text-blue-700">연차 사용 내역</h3>
        </div>
        {holidayEvents.length === 0 ? (
          <div className="text-sm text-gray-400 flex items-center gap-2 py-4">
            <span className="text-2xl">🌱</span>
            <span>아직 연차를 사용하지 않았어요!</span>
          </div>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 text-sm">
            {holidayEvents
              .filter(event => {
                // leave_type이 문자열이든 숫자든 모두 처리
                const leaveType = String(event.leave_type);
                return leaveType === '1' || leaveType === '2' || leaveType === '3';
              })
              .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
              .map((event) => {
                const start = new Date(event.start_date)
                const end = new Date(event.end_date)
                const isSameDay = start.toDateString() === end.toDateString()
                const dateStr = isSameDay
                  ? `${start.getFullYear()}-${(start.getMonth()+1).toString().padStart(2,'0')}-${start.getDate().toString().padStart(2,'0')}`
                  : `${start.getFullYear()}-${(start.getMonth()+1).toString().padStart(2,'0')}-${start.getDate().toString().padStart(2,'0')} ~ ${end.getFullYear()}-${(end.getMonth()+1).toString().padStart(2,'0')}-${end.getDate().toString().padStart(2,'0')}`
                // leave_type 숫자 → 한글 변환
                let typeLabel = '연차';
                if (event.leave_type === '2') typeLabel = '반차';
                else if (event.leave_type === '3') typeLabel = '반반차';
                return (
                  <li key={event.id} className="flex items-center gap-2 text-sm border-b last:border-b-0 py-1">
                    <span className="text-gray-700 font-mono min-w-[110px]">{dateStr}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">{typeLabel}</span>
                  </li>
                )
              })}
          </ul>
        )}
      </div>
      {showSetting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-lg mb-2">주 근무시간 설정</h3>
            <label className="flex flex-col gap-1">
              <span>연차(일)</span>
              <input type="number" min={1} max={50} value={annualLeave} onChange={e => setAnnualLeave(Number(e.target.value))} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span>주 근무시간(시간)</span>
              <input type="number" min={1} max={100} value={weeklyWorkHours} onChange={e => setWeeklyWorkHours(Number(e.target.value))} className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col gap-1">
              <span>근무 시작 요일</span>
              <select value={workStart} onChange={e => setWorkStart(e.target.value)} className="border rounded px-2 py-1">
                {['월','화','수','목','금','토','일'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>근무 종료 요일</span>
              <select value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="border rounded px-2 py-1">
                {['월','화','수','목','금','토','일'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            {message && <div className="text-center text-sm text-blue-600 mt-2">{message}</div>}
            <div className="flex gap-2 mt-2">
              <button className="flex-1 py-2 rounded bg-gray-200 hover:bg-gray-300" onClick={() => setShowSetting(false)} disabled={saving}>취소</button>
              <button className="flex-1 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" onClick={handleSave} disabled={saving}>{saving ? '저장중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
} 