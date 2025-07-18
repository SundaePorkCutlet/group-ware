"use client"

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Event } from '@/app/calendar/page'

interface CalendarProps {
  events: Event[]
  transactions: any[]
  onDateClick: (date: Date) => void
  onEventClick: (event: Event) => void
  showPersonalCalendar: boolean
  showCompanyCalendar: boolean
  onTogglePersonalCalendar: () => void
  onToggleCompanyCalendar: () => void
  userHasCompany: boolean
  onShowAllEventsForDate?: (date: Date, events: Event[]) => void
  onTransactionClick?: (tx: any, date: Date) => void
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

const EVENT_TYPE_COLORS = {
  meeting: 'bg-blue-500',
  holiday: 'bg-green-500',
  personal: 'bg-purple-500',
  company: 'bg-orange-500',
  attendance: 'bg-indigo-500',
  other: 'bg-gray-500'
}

export default function Calendar({ 
  events, 
  transactions,
  onDateClick, 
  onEventClick, 
  showPersonalCalendar, 
  showCompanyCalendar, 
  onTogglePersonalCalendar, 
  onToggleCompanyCalendar,
  userHasCompany,
  onShowAllEventsForDate,
  onTransactionClick
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(startOfMonth)
  startDate.setDate(startDate.getDate() - startOfMonth.getDay())

  const endDate = new Date(endOfMonth)
  endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()))

  const days = []
  const date = new Date(startDate)
  while (date <= endDate) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      // 캘린더 토글 상태에 따라 필터링
      if (event.visibility === 'personal' && !showPersonalCalendar) return false
      if (event.visibility === 'company' && !showCompanyCalendar) return false
      
      const eventStart = new Date(event.start_date)
      const eventEnd = new Date(event.end_date)
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      
      return checkDate >= new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()) &&
             checkDate <= new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate())
    })
  }

  const getTransactionsForDate = (date: Date) => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return (
        txDate.getFullYear() === date.getFullYear() &&
        txDate.getMonth() === date.getMonth() &&
        txDate.getDate() === date.getDate()
      );
    });
  };


  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.getFullYear()}년 {MONTHS[currentDate.getMonth()]}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            오늘
          </Button>
        </div>
        
        {/* Calendar Toggle Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPersonalCalendar}
                onChange={onTogglePersonalCalendar}
                className="rounded border-gray-300"
              />
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                개인 캘린더
              </span>
            </label>
            
            {userHasCompany && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCompanyCalendar}
                  onChange={onToggleCompanyCalendar}
                  className="rounded border-gray-300"
                />
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  회사 캘린더
                </span>
              </label>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {DAYS.map((day, index) => (
            <div 
              key={day} 
              className={`p-2 text-center text-sm font-medium ${
                index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date) => {
            const dayEvents = getEventsForDate(date)
            const dayTransactions = getTransactionsForDate(date);

            const isCurrentMonthDate = isCurrentMonth(date)
            const isTodayDate = isToday(date)
            const dayOfWeek = date.getDay() // 0=일요일, 6=토요일
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            return (
              <div
                key={date.toISOString()}
                className={`min-h-32 p-2 border border-gray-100 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                  !isCurrentMonthDate ? 'text-gray-400 bg-gray-50' : ''
                } ${isTodayDate ? 'bg-blue-50 border-blue-200' : ''} ${
                  isWeekend && isCurrentMonthDate ? 'bg-green-50' : ''
                }`}
                onClick={() => onDateClick(date)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isTodayDate ? 'text-blue-600' : isWeekend && isCurrentMonthDate ? 'text-green-600' : ''
                }`}>
                  {date.getDate()}
                </div>
                


                {/* Events for this day */}
                <div className="space-y-1">
                  {(() => {
                    // 출퇴근 이벤트를 따로 분리하고 합치기
                    const attendanceEvents = dayEvents.filter(event => 
                      event.title === '🌅 출근' || event.title === '🌆 퇴근'
                    )
                    const otherEvents = dayEvents.filter(event => 
                      event.title !== '🌅 출근' && event.title !== '🌆 퇴근'
                    )

                    const displayEvents = []
                    
                    // 출퇴근 이벤트가 있으면 하나로 합쳐서 표시
                    if (attendanceEvents.length > 0) {
                      const clockIn = attendanceEvents.find(e => e.title === '🌅 출근')
                      const clockOut = attendanceEvents.find(e => e.title === '🌆 퇴근')
                      
                      // 가짜 출퇴근 통합 이벤트 생성
                      const combinedEvent = {
                        id: 'attendance-combined',
                        title: '',
                        description: '출퇴근 기록',
                        start_date: clockIn?.start_date || clockOut?.start_date || '',
                        end_date: clockOut?.end_date || clockIn?.end_date || '',
                        location: '',
                        created_by: clockIn?.created_by || clockOut?.created_by || '',
                        department_id: '',
                        is_all_day: false,
                        event_type: 'attendance' as const,
                        visibility: 'personal' as const,
                        created_at: clockIn?.created_at || clockOut?.created_at || '',
                        updated_at: clockIn?.updated_at || clockOut?.updated_at || '',
                        isAttendanceCombined: true,
                        originalEvents: attendanceEvents
                      }
                      
                      // 제목 설정 - 더 간단하게
                      if (clockIn && clockOut) {
                        combinedEvent.title = `${formatTime(clockIn.start_date)}-${formatTime(clockOut.start_date)}`
                      } else if (clockIn) {
                        combinedEvent.title = `${formatTime(clockIn.start_date)} 출근`
                      } else if (clockOut) {
                        combinedEvent.title = `${formatTime(clockOut.start_date)} 퇴근`
                      }
                      
                      displayEvents.push(combinedEvent)
                    }
                    
                    // 일반 이벤트들 추가
                    displayEvents.push(...otherEvents)
                    
                    // 표시할 이벤트 개수 제한
                    const maxEvents = 3
                    return displayEvents.slice(0, maxEvents).map(event => {
                      // 출퇴근 이벤트는 특별한 디자인으로 표시
                      if ((event as any).isAttendanceCombined) {
                        return (
                          <div key={event.id} className="mb-1">
                            <div 
                              className="text-xs bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded flex items-center justify-between cursor-pointer hover:bg-indigo-200 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEventClick(event)
                              }}
                              title="출퇴근 기록"
                            >
                              <span>🏢</span>
                              <span className="font-mono">{event.title}</span>
                            </div>
                          </div>
                        )
                      }
                      
                      // 일반 이벤트는 기존 디자인 유지
                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                            EVENT_TYPE_COLORS[event.event_type as keyof typeof EVENT_TYPE_COLORS]
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick(event)
                          }}
                          title={`${event.title}${event.location ? ` @ ${event.location}` : ''}`}
                        >
                          <div className="truncate">
                            {event.is_all_day ? (
                              event.title
                            ) : (
                              `${formatTime(event.start_date)} ${event.title}`
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()}
                  
                  {(() => {
                    const attendanceEvents = dayEvents.filter(event => 
                      event.title === '🌅 출근' || event.title === '🌆 퇴근'
                    )
                    const otherEvents = dayEvents.filter(event => 
                      event.title !== '🌅 출근' && event.title !== '🌆 퇴근'
                    )
                    
                    // 출퇴근이 있으면 1개로 계산, 없으면 0개
                    const displayCount = (attendanceEvents.length > 0 ? 1 : 0) + otherEvents.length
                    const maxEvents = 3
                    
                    if (displayCount > maxEvents) {
                      return (
                        <span
                          className="block text-xs text-gray-500 cursor-pointer hover:underline mt-1"
                          onClick={e => {
                            e.stopPropagation();
                            onShowAllEventsForDate && onShowAllEventsForDate(date, dayEvents);
                          }}
                        >
                          +{displayCount - maxEvents}개 더
                        </span>
                      )
                    }
                    return null
                  })()}
                </div>

                {dayTransactions.map(tx => (
                  <div
                    key={tx.id}
                    className={`text-xs mt-1 px-2 py-1 rounded ${
                      tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    } cursor-pointer`}
                    title={tx.memo}
                    onClick={e => {
                      e.stopPropagation();
                      onTransactionClick && onTransactionClick(tx, date);
                    }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{tx.amount}원 {tx.category && `(${tx.category})`}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 