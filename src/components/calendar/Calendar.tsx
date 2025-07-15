"use client"

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Event } from '@/app/calendar/page'

interface AttendanceRecord {
  id: string
  user_id: string
  company_id: string
  date: string
  clock_in_time: string | null
  clock_out_time: string | null
  created_at: string
  updated_at: string
}

interface CalendarProps {
  events: Event[]
  attendance: AttendanceRecord[]
  onDateClick: (date: Date) => void
  onEventClick: (event: Event) => void
  showPersonalCalendar: boolean
  showCompanyCalendar: boolean
  onTogglePersonalCalendar: () => void
  onToggleCompanyCalendar: () => void
  userHasCompany: boolean
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
]

const EVENT_TYPE_COLORS = {
  meeting: 'bg-blue-500',
  deadline: 'bg-red-500',
  holiday: 'bg-green-500',
  personal: 'bg-purple-500',
  company: 'bg-orange-500',
  other: 'bg-gray-500'
}

export default function Calendar({ 
  events, 
  attendance,
  onDateClick, 
  onEventClick, 
  showPersonalCalendar, 
  showCompanyCalendar, 
  onTogglePersonalCalendar, 
  onToggleCompanyCalendar,
  userHasCompany 
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

  const getAttendanceForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return attendance.find(record => record.date === dateStr)
  }

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
            const dayAttendance = getAttendanceForDate(date)
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
                
                {/* Attendance for this day */}
                {dayAttendance && isCurrentMonthDate && (
                  <div className="mb-1">
                    <div className="text-xs bg-indigo-100 text-indigo-800 px-1 py-0.5 rounded flex items-center justify-between">
                      <span>🏢</span>
                      <span>
                        {dayAttendance.clock_in_time && (
                          <span className="font-mono">
                            {new Date(dayAttendance.clock_in_time).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                        {dayAttendance.clock_in_time && dayAttendance.clock_out_time && ' - '}
                        {dayAttendance.clock_out_time && (
                          <span className="font-mono">
                            {new Date(dayAttendance.clock_out_time).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, dayAttendance && isCurrentMonthDate ? 2 : 3).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                        EVENT_TYPE_COLORS[event.event_type]
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
                  ))}
                  
                  {dayEvents.length > (dayAttendance && isCurrentMonthDate ? 2 : 3) && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - (dayAttendance && isCurrentMonthDate ? 2 : 3)}개 더
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>회의</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>마감일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>휴일</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>개인</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span>기타</span>
          </div>
        </div>
      </div>
    </div>
  )
} 