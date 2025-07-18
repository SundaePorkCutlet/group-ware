"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Calendar from '@/components/calendar/Calendar'
import EventModal from '@/components/calendar/EventModal'
import AttendanceModal from '@/components/calendar/AttendanceModal'
import AttendanceListModal from '@/components/calendar/AttendanceListModal'
import { CalendarDays, Plus, ArrowLeft, Home } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic';
const WorkSummarySidebar = dynamic(() => import('@/components/work/WorkSummarySidebar'), { ssr: false });

export interface Event {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  location?: string
  created_by: string
  department_id?: string
  is_all_day: boolean
  event_type: 'meeting' | 'holiday' | 'attendance' | 'other'
  visibility: 'personal' | 'company'
  created_at: string
  updated_at: string
  exclude_lunch_time?: boolean
  leave_type?: string // 추가
}

export default function CalendarPage() {
  const user = useAuthStore(state => state.user)
  const userProfile = useAuthStore(state => state.profile)
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [companyEvents, setCompanyEvents] = useState<Event[]>([]);
  const [showPersonalCalendar, setShowPersonalCalendar] = useState(true)
  const [showCompanyCalendar, setShowCompanyCalendar] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showAttendanceListModal, setShowAttendanceListModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [attendanceEvents, setAttendanceEvents] = useState<Event[]>([])
  const [attendanceDate, setAttendanceDate] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()

  // 1. 상태 추가
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionDate, setTransactionDate] = useState<Date | null>(null);
  const [editTransaction, setEditTransaction] = useState<any>(null);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [allEventsForDate, setAllEventsForDate] = useState<Event[]>([]);
  const [allEventsDate, setAllEventsDate] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  // 1. 탭 상태 추가
  const [activeTab, setActiveTab] = useState<'calendar' | 'ledger'>('calendar');
  // 상태 추가
  const [ledgerYear, setLedgerYear] = useState(new Date().getFullYear());
  const [ledgerMonth, setLedgerMonth] = useState(new Date().getMonth() + 1);
  const [ledgerCategory, setLedgerCategory] = useState('');

  // 기존 fetchEvents 함수와 setEvents 호출 부분 삭제
  // useEffect 내에서 조인 에러가 나면 기본 필드만 받아오도록 처리
  useEffect(() => {
    if (!user) return;
    setLoading(true); // fetch 시작 시 true
    let myDone = false;
    let companyDone = false;
    supabase
      .from('events')
      .select('*')
      .eq('created_by', user.id)
      .eq('visibility', 'personal')
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setMyEvents((data ?? []) as unknown as Event[]);
        myDone = true;
        if (companyDone || !userProfile?.company_id) setLoading(false);
      });
    if (userProfile?.company_id) {
      supabase
        .from('events')
        .select('*')
        .eq('visibility', 'company')
        .eq('company_id', userProfile.company_id)
        .order('start_date', { ascending: true })
        .then(({ data }) => {
          setCompanyEvents((data ?? []) as unknown as Event[]);
          companyDone = true;
          if (myDone) setLoading(false);
        });
    } else {
      companyDone = true;
      if (myDone) setLoading(false);
    }
  }, [user, userProfile]);

  // 2. useEffect에서 fetch
  useEffect(() => {
    if (!user) return;
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => setTransactions(data ?? []));
  }, [user]);

  // 렌더링용 events
  const events = [
    ...(showPersonalCalendar ? myEvents : []),
    ...(showCompanyCalendar ? companyEvents : [])
  ];
  console.log('events:', events.map(e => ({ id: e.id, title: e.title, created_by: e.created_by, visibility: e.visibility })));

  const handleEventSave = () => {
    // fetchEvents() // 삭제됨
    setShowEventModal(false)
    setEditingEvent(null)
    setSelectedDate(null)
    // WorkSummarySidebar 새로고침 트리거
    setRefreshTrigger(prev => prev + 1)
  }

  // 날짜 클릭 핸들러 수정
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
    setTransactionDate(date);
  };

  const handleEventClick = (event: Event | any) => {
    // 통합된 출퇴근 이벤트인지 확인
    if (event.isAttendanceCombined && event.originalEvents) {
      setAttendanceEvents(event.originalEvents)
      setAttendanceDate(event.start_date)
      setShowAttendanceListModal(true)
      return
    }
    
    // 개별 출퇴근 이벤트인지 확인
    const isAttendanceEvent = event.title === '🌅 출근' || event.title === '🌆 퇴근'
    
    setEditingEvent(event)
    
    if (isAttendanceEvent) {
      setShowAttendanceModal(true)
    } else {
      setShowEventModal(true)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">캘린더에 접근하려면 로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-4">일정을 관리하고 팀원들과 공유하세요</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    )
  }

  // 1. 드롭다운 값 추출
  const years = Array.from(new Set(transactions.map(tx => new Date(tx.date).getFullYear()))).sort((a, b) => b - a);
  const months = Array.from(new Set(transactions
    .filter(tx => new Date(tx.date).getFullYear() === ledgerYear)
    .map(tx => new Date(tx.date).getMonth() + 1))).sort((a, b) => a - b);
  const categories = Array.from(new Set(transactions.map(tx => tx.category).filter(Boolean)));
  // 2. 필터링
  const filteredTransactions = transactions.filter(tx => {
    const date = new Date(tx.date);
    const matchYear = date.getFullYear() === ledgerYear;
    const matchMonth = date.getMonth() + 1 === ledgerMonth;
    const matchCategory = ledgerCategory ? tx.category === ledgerCategory : true;
    return matchYear && matchMonth && matchCategory;
  });
  // 3. 합계 계산도 filteredTransactions 기준
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const categorySums: Record<string, { income: number, expense: number }> = {};
  filteredTransactions.forEach(tx => {
    if (!tx.category) return;
    if (!categorySums[tx.category]) categorySums[tx.category] = { income: 0, expense: 0 };
    categorySums[tx.category][tx.type] += Number(tx.amount);
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
              <Plus className="w-4 h-4 mr-2" />
              새 일정
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상단 탭 UI */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'calendar' ? 'bg-white font-bold' : 'bg-gray-100'}`}
            onClick={() => setActiveTab('calendar')}
          >
            캘린더
          </button>
          <button
            className={`px-4 py-2 rounded-t ${activeTab === 'ledger' ? 'bg-white font-bold' : 'bg-gray-100'}`}
            onClick={() => setActiveTab('ledger')}
          >
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
        ) : (
          <>
          {activeTab === 'calendar' && (
            <Calendar
              events={events}
              transactions={[]}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              showPersonalCalendar={showPersonalCalendar}
              showCompanyCalendar={showCompanyCalendar}
              onTogglePersonalCalendar={() => setShowPersonalCalendar(!showPersonalCalendar)}
              onToggleCompanyCalendar={() => setShowCompanyCalendar(!showCompanyCalendar)}
              userHasCompany={userProfile?.company_id !== null}
              onShowAllEventsForDate={(date: Date, events: Event[]) => {
                setAllEventsDate(date);
                setAllEventsForDate(events);
                setShowAllEventsModal(true);
              }}
            />
          )}
          {activeTab === 'ledger' && (
            <div className="flex gap-6">
              <div className="flex-1">
                <Calendar
                  events={[]}
                  transactions={filteredTransactions}
                  onDateClick={date => {
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
                />
              </div>
              <aside className="w-80 bg-white rounded-xl shadow p-6 flex flex-col gap-6 border">
                <div>
                  <h4 className="font-bold mb-2">합계</h4>
                  <div className="flex gap-4 text-base mb-2">
                    <span className="text-green-700">수입: {totalIncome.toLocaleString()}원</span>
                    <span className="text-red-700">지출: {totalExpense.toLocaleString()}원</span>
                  </div>
                  <div className="font-bold mb-4">순이익: {(totalIncome - totalExpense).toLocaleString()}원</div>
                </div>
                <div>
                  <h4 className="font-bold mb-2">카테고리별 합계</h4>
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
                          <td className="p-1 border text-green-700">+{sum.income.toLocaleString()}원</td>
                          <td className="p-1 border text-red-700">-{sum.expense.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 mt-4">
                  <select value={ledgerYear} onChange={e => setLedgerYear(Number(e.target.value))} className="border rounded px-2 py-1">
                    {years.map(y => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <select value={ledgerMonth} onChange={e => setLedgerMonth(Number(e.target.value))} className="border rounded px-2 py-1">
                    {months.map(m => (
                      <option key={m} value={m}>{m}월</option>
                    ))}
                  </select>
                  <select value={ledgerCategory} onChange={e => setLedgerCategory(e.target.value)} className="border rounded px-2 py-1">
                    <option value="">전체 카테고리</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
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
            setShowEventModal(false)
            setEditingEvent(null)
            setSelectedDate(null)
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
            setShowAttendanceModal(false)
            setEditingEvent(null)
          }}
          onDelete={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger(prev => prev + 1)
          }}
          onSave={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger(prev => prev + 1)
          }}
          event={editingEvent}
        />
      )}

      {/* Attendance List Modal */}
      {showAttendanceListModal && (
        <AttendanceListModal
          isOpen={showAttendanceListModal}
          onClose={() => {
            setShowAttendanceListModal(false)
            setAttendanceEvents([])
            setAttendanceDate('')
          }}
          onRefresh={() => {
            // fetchEvents() // 삭제됨
            setRefreshTrigger(prev => prev + 1)
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
              <h3 className="text-lg font-bold">{allEventsDate.getFullYear()}년 {allEventsDate.getMonth()+1}월 {allEventsDate.getDate()}일 전체 일정</h3>
              <button onClick={() => setShowAllEventsModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <ul className="space-y-2">
              {allEventsForDate.map(ev => (
                <li key={ev.id} className="p-2 rounded bg-gray-50 border flex flex-col">
                  <span className="font-semibold">{ev.title}</span>
                  <span className="text-xs text-gray-500">{ev.start_date.slice(11,16)} ~ {ev.end_date.slice(11,16)}</span>
                  <span className="text-xs text-gray-400">{ev.description}</span>
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
      {showTransactionModal && transactionDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 relative">
            <button onClick={() => setShowTransactionModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            <h3 className="text-xl font-bold mb-6 text-center">{transactionDate.getFullYear()}년 {transactionDate.getMonth()+1}월 {transactionDate.getDate()}일 수입/지출</h3>
            <form
              onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const type = form.type.value;
                const amount = Number(form.amount.value);
                const category = form.category.value;
                const memo = form.memo.value;
                if (!type || !amount) return alert('타입과 금액을 입력하세요!');
                const dateStr = transactionDate.toISOString().slice(0,10);
                if (editTransaction) {
                  const { error } = await supabase.from('transactions').update({
                    type, amount, category, memo, date: dateStr
                  }).eq('id', editTransaction.id);
                  if (error) return alert('수정 실패: ' + error.message);
                } else {
                  const { error } = await supabase.from('transactions').insert({
                    user_id: user.id,
                    date: dateStr,
                    type,
                    amount,
                    category,
                    memo
                  });
                  if (error) return alert('저장 실패: ' + error.message);
                }
                setShowTransactionModal(false);
                supabase
                  .from('transactions')
                  .select('*')
                  .eq('user_id', user.id)
                  .order('date', { ascending: true })
                  .then(({ data }) => setTransactions(data ?? []));
              }}
              className="flex flex-col gap-5"
            >
              <div>
                <label className="block text-sm font-bold mb-1">타입</label>
                <select name="type" className="w-full border rounded-lg px-3 py-2" defaultValue={editTransaction?.type || 'income'}>
                  <option value="income">수입</option>
                  <option value="expense">지출</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">금액</label>
                <input name="amount" type="number" min="0" className="w-full border rounded-lg px-3 py-2" required placeholder="예: 10000" defaultValue={editTransaction?.amount || ''} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">카테고리</label>
                <input name="category" type="text" className="w-full border rounded-lg px-3 py-2" placeholder="예: 식비, 월급" defaultValue={editTransaction?.category || ''} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">메모</label>
                <input name="memo" type="text" className="w-full border rounded-lg px-3 py-2" placeholder="간단한 설명" defaultValue={editTransaction?.memo || ''} />
              </div>
              <button type="submit" className="mt-4 py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition">저장</button>
              {editTransaction && (
                <button type="button" className="mt-2 py-2 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200 transition" onClick={async () => {
                  if (!confirm('정말 삭제하시겠습니까?')) return;
                  const { error } = await supabase.from('transactions').delete().eq('id', editTransaction.id);
                  if (error) return alert('삭제 실패: ' + error.message);
                  setShowTransactionModal(false);
                  supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: true })
                    .then(({ data }) => setTransactions(data ?? []));
                }}>삭제</button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 