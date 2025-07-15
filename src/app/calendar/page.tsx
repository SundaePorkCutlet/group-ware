"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import Calendar from '@/components/calendar/Calendar'
import EventModal from '@/components/calendar/EventModal'
import { CalendarDays, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

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
  event_type: 'meeting' | 'deadline' | 'holiday' | 'personal' | 'company' | 'other'
  visibility: 'personal' | 'company'
  created_at: string
  updated_at: string
}

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [showPersonalCalendar, setShowPersonalCalendar] = useState(true)
  const [showCompanyCalendar, setShowCompanyCalendar] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchEvents()
  }, [supabase.auth])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      // 사용자 프로필 정보 가져오기
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profile)
    }
  }

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:created_by(full_name, email),
          departments:department_id(name)
        `)
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error)
      } else {
        setEvents(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventSave = () => {
    fetchEvents()
    setShowEventModal(false)
    setEditingEvent(null)
    setSelectedDate(null)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowEventModal(true)
  }

  const handleEventClick = (event: Event) => {
    setEditingEvent(event)
    setShowEventModal(true)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">캘린더를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <Calendar 
            events={events}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            showPersonalCalendar={showPersonalCalendar}
            showCompanyCalendar={showCompanyCalendar}
            onTogglePersonalCalendar={() => setShowPersonalCalendar(!showPersonalCalendar)}
            onToggleCompanyCalendar={() => setShowCompanyCalendar(!showCompanyCalendar)}
            userHasCompany={userProfile?.company_id !== null}
          />
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
          currentUser={user}
        />
      )}
    </div>
  )
} 