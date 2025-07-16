import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Settings } from 'lucide-react';

interface AttendanceEvent {
  id: string;
  title: string;
  start_date: string;
  event_type: string;
  exclude_lunch_time?: boolean;
}

export default function WorkSummarySidebar() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [weeklyWorkHours, setWeeklyWorkHours] = useState<number>(40);
  const [workStart, setWorkStart] = useState<string>('월');
  const [workEnd, setWorkEnd] = useState<string>('금');

  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [totalWorked, setTotalWorked] = useState<number>(0); // 분 단위
  const [showSetting, setShowSetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 유저 프로필 정보 fetch
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('weekly_work_hours, weekly_work_start, weekly_work_end')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setWeeklyWorkHours(Number(data.weekly_work_hours ?? 40));
        setWorkStart(String(data.weekly_work_start ?? '월'));
        setWorkEnd(String(data.weekly_work_end ?? '금'));
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
    })();
  }, [user, workStart, workEnd]);

  // 누적 근무시간 계산 (events 테이블만 사용, 각 날짜별 점심시간 제외 설정 적용)
  useEffect(() => {
    let total = 0;
    
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
    
    setTotalWorked(total);
  }, [attendanceEvents]);

  // 시간 포맷터
  const formatHourMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}시간 ${m}분`;
  };

  // 남은 근무시간(분)
  const remainMin = Math.max(weeklyWorkHours * 60 - totalWorked, 0);

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
          .select('weekly_work_hours, weekly_work_start, weekly_work_end')
          .eq('id', user.id)
          .single();
        if (!error && data) {
          setWeeklyWorkHours(Number(data.weekly_work_hours ?? 40));
          setWorkStart(String(data.weekly_work_start ?? '월'));
          setWorkEnd(String(data.weekly_work_end ?? '금'));
        }
      })();
    }
  };

  return (
    <aside className="w-full max-w-xs bg-white rounded-xl shadow p-5 flex flex-col gap-4 border">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-lg">주 근무시간</h2>
        <button onClick={() => setShowSetting(true)} className="p-1 rounded hover:bg-gray-100">
          <Settings size={20} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-500">설정: <b>{weeklyWorkHours}시간</b> ({workStart}~{workEnd})</div>
        <div className="text-base">이번 주 누적 근무: <b>{formatHourMin(totalWorked)}</b></div>
        <div className="text-base">남은 근무: <b>{formatHourMin(remainMin)}</b></div>
        <div className="text-xs text-gray-400 mt-1">
          * 점심시간 제외 설정은 출퇴근 이벤트 수정에서 변경 가능
        </div>
      </div>
      {showSetting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-lg mb-2">주 근무시간 설정</h3>
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