"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Clock, LogIn, LogOut, Coffee, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

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

export default function AttendanceCard() {
  const { user, profile } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const supabase = createClient()

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 오늘 출근 기록 조회
  useEffect(() => {
    if (user && profile?.company_id) {
      loadTodayAttendance()
    }
  }, [user, profile])

  const loadTodayAttendance = async () => {
    if (!user || !profile?.company_id) return

    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('출근 기록 조회 오류:', error)
      return
    }

    setTodayAttendance(data as unknown as AttendanceRecord)
  }

  const createCalendarEvent = async (type: 'clock_in' | 'clock_out', dateTime: string) => {
    if (!user) return

    // 로컬 시간을 올바르게 처리
    const localDateTime = new Date(dateTime)
    const startDateTime = localDateTime.toISOString()
    const endDateTime = new Date(localDateTime.getTime() + 30 * 60 * 1000).toISOString()
    
    const today = new Date().toISOString().split('T')[0]
    const eventTitle = type === 'clock_in' ? '🌅 출근' : '🌆 퇴근'

    try {
      // 오늘 동일한 타입의 출퇴근 이벤트가 이미 있는지 확인
      const { data: existingEvents, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', user.id)
        .eq('title', eventTitle)
        .gte('start_date', `${today}T00:00:00.000Z`)
        .lt('start_date', `${today}T23:59:59.999Z`)

      if (fetchError) {
        console.error('기존 이벤트 조회 오류:', fetchError)
        return
      }

      const eventData = {
        title: eventTitle,
        description: type === 'clock_in' ? '출근 기록 - 자동 생성' : '퇴근 기록 - 자동 생성',
        start_date: startDateTime,
        end_date: endDateTime,
        event_type: 'company' as const, // 회사 관련 이벤트로 표시
        visibility: 'personal' as const,
        is_all_day: false,
        created_by: user.id
      }

      if (existingEvents && existingEvents.length > 0) {
        // 기존 이벤트 업데이트
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', (existingEvents[0] as any).id)

        if (updateError) {
          console.error('캘린더 이벤트 업데이트 오류:', updateError)
        }
      } else {
        // 새 이벤트 생성
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData)

        if (insertError) {
          console.error('캘린더 이벤트 생성 오류:', insertError)
        }
      }
    } catch (error) {
      console.error('캘린더 이벤트 처리 중 오류:', error)
    }
  }

  const handleClockIn = async () => {
    if (!user || !profile?.company_id) return

    setIsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          user_id: user.id,
          company_id: profile.company_id,
          date: today,
          clock_in_time: now
        })
        .select()
        .single()

      if (error) throw error

      setTodayAttendance(data as unknown as AttendanceRecord)
      
      // 개인 캘린더에 출근 이벤트 생성
      await createCalendarEvent('clock_in', now)
      
      alert('출근이 완료되었습니다! 개인 캘린더에도 기록되었어요 ✨')
    } catch (error) {
      console.error('출근 처리 오류:', error)
      alert('출근 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!user || !profile?.company_id || !todayAttendance) return

    setIsLoading(true)
    const now = new Date().toISOString()

    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({
          clock_out_time: now
        })
        .eq('id', todayAttendance.id)
        .select()
        .single()

      if (error) throw error

      setTodayAttendance(data as unknown as AttendanceRecord)
      
      // 개인 캘린더에 퇴근 이벤트 생성
      await createCalendarEvent('clock_out', now)
      
      alert('퇴근이 완료되었습니다! 수고하셨어요 🎉 개인 캘린더에도 기록되었어요')
    } catch (error) {
      console.error('퇴근 처리 오류:', error)
      alert('퇴근 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  // 회사에 소속되지 않은 사용자인 경우
  if (!profile?.company_id) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Clock className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">출퇴근 관리</h2>
        </div>
        
        <div className="text-center py-8">
          <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">회사에 소속되어야</p>
          <p className="text-gray-500">출퇴근 기록을 사용할 수 있습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">출퇴근 관리</h2>
          <p className="text-sm text-gray-500">현재 시간: {currentTime.toLocaleTimeString('ko-KR')}</p>
        </div>
      </div>

      {/* 오늘 출근 기록 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">오늘 출근 기록</h3>
        
        {todayAttendance ? (
          <div className="space-y-2">
            {todayAttendance.clock_in_time && (
              <div className="flex items-center gap-2 text-sm">
                <LogIn className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">출근:</span>
                <span className="font-mono font-medium text-green-700">
                  {formatTime(todayAttendance.clock_in_time)}
                </span>
              </div>
            )}
            
            {todayAttendance.clock_out_time && (
              <div className="flex items-center gap-2 text-sm">
                <LogOut className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">퇴근:</span>
                <span className="font-mono font-medium text-blue-700">
                  {formatTime(todayAttendance.clock_out_time)}
                </span>
              </div>
            )}
            
            {!todayAttendance.clock_in_time && (
              <p className="text-sm text-gray-500">아직 출근하지 않았습니다</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">오늘 출근 기록이 없습니다</p>
        )}
      </div>

      {/* 출퇴근 버튼 */}
      <div className="space-y-3">
        {!todayAttendance?.clock_in_time ? (
          <Button 
            onClick={handleClockIn}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <LogIn className="w-4 h-4 mr-2" />
            )}
            출근하기
          </Button>
        ) : !todayAttendance?.clock_out_time ? (
          <Button 
            onClick={handleClockOut}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            퇴근하기
          </Button>
        ) : (
          <div className="text-center py-3">
            <Home className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">오늘 업무가 완료되었습니다</p>
            <p className="text-xs text-gray-400">수고하셨습니다!</p>
          </div>
        )}
      </div>
    </div>
  )
} 