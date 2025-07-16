"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { X, Clock, MapPin, Users, Save, Trash2 } from 'lucide-react'
import type { Event } from '@/app/calendar/page'
import type { User } from '@supabase/supabase-js'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  selectedDate: Date | null
  editingEvent: Event | null
  currentUser: User
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedDate, 
  editingEvent, 
  currentUser 
}: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<'meeting' | 'deadline' | 'holiday' | 'personal' | 'company' | 'other'>('meeting')
  const [visibility, setVisibility] = useState<'personal' | 'company'>('personal')
  const [isAllDay, setIsAllDay] = useState(false)
  const [loading, setSaving] = useState(false)
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [userProfile, setUserProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 사용자 프로필 정보 가져오기
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()
          
        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else {
          setUserProfile(profile)
        }

        // 부서 정보 가져오기
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name')

        if (error) {
          console.error('Error fetching departments:', error)
        } else {
          setDepartments((data || []) as {id: string, name: string}[])
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    if (isOpen) {
      fetchUserData()
      
      if (editingEvent) {
        // 기존 이벤트 편집
        setTitle(editingEvent.title)
        setDescription(editingEvent.description || '')
        setLocation(editingEvent.location || '')
        setEventType(editingEvent.event_type)
        setVisibility(editingEvent.visibility)
        setIsAllDay(editingEvent.is_all_day)
        setSelectedDepartment(editingEvent.department_id || '')
        
        const start = new Date(editingEvent.start_date)
        const end = new Date(editingEvent.end_date)
        
        setStartDate(start.toISOString().split('T')[0])
        setEndDate(end.toISOString().split('T')[0])
        
        if (!editingEvent.is_all_day) {
          setStartTime(start.toTimeString().slice(0, 5))
          setEndTime(end.toTimeString().slice(0, 5))
        }
      } else if (selectedDate) {
        // 새 이벤트 생성
        const dateStr = selectedDate.toISOString().split('T')[0]
        setStartDate(dateStr)
        setEndDate(dateStr)
        setStartTime('09:00')
        setEndTime('10:00')
      }
    }
  }, [isOpen, editingEvent, selectedDate, supabase])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    setSaving(true)

    try {
      let startDateTime: string
      let endDateTime: string

      if (isAllDay) {
        // 종일 일정: 로컬 기준으로 00:00 ~ 23:59:59
        const start = new Date(`${startDate}T00:00:00`)
        const end = new Date(`${endDate}T23:59:59`)
        startDateTime = start.toISOString()
        endDateTime = end.toISOString()
      } else {
        // 시간 일정: 로컬 기준으로 입력값을 Date 객체로 만든 뒤 toISOString()
        const start = new Date(`${startDate}T${startTime}:00`)
        const end = new Date(`${endDate}T${endTime}:00`)
        startDateTime = start.toISOString()
        endDateTime = end.toISOString()
      }

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDateTime,
        end_date: endDateTime,
        location: location.trim() || null,
        event_type: eventType,
        visibility: visibility,
        is_all_day: isAllDay,
        department_id: selectedDepartment || null,
        created_by: currentUser.id
      }

      let error

      if (editingEvent) {
        // 기존 이벤트 업데이트
        const { error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
        error = updateError
      } else {
        // 새 이벤트 생성
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData)
        error = insertError
      }

      if (error) {
        console.error('Error saving event:', error)
        alert(`일정 저장 중 오류가 발생했습니다: ${error.message}`)
      } else {
        resetForm()
        onSave()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('일정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEvent) return

    if (!confirm('정말로 이 일정을 삭제하시겠습니까?')) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', editingEvent.id)

      if (error) {
        console.error('Error deleting event:', error)
        alert(`일정 삭제 중 오류가 발생했습니다: ${error.message}`)
      } else {
        resetForm()
        onSave()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('일정 삭제 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setStartDate('')
    setStartTime('')
    setEndDate('')
    setEndTime('')
    setLocation('')
    setEventType('meeting')
    setVisibility('personal')
    setIsAllDay(false)
    setSelectedDepartment('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingEvent ? '일정 편집' : '새 일정'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="일정 제목을 입력하세요"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              일정 종류
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as 'meeting' | 'deadline' | 'holiday' | 'personal' | 'company' | 'other')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="meeting">회의</option>
              <option value="deadline">마감일</option>
              <option value="holiday">휴일</option>
              <option value="personal">개인</option>
              <option value="company">회사</option>
              <option value="other">기타</option>
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              캘린더 유형
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="personal"
                  checked={visibility === 'personal'}
                  onChange={(e) => setVisibility(e.target.value as 'personal' | 'company')}
                  className="mr-2"
                />
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-sm">개인 캘린더</span>
                </div>
              </label>
              
              {userProfile?.company_id && (
                <label className="flex items-center p-3 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="company"
                    checked={visibility === 'company'}
                    onChange={(e) => setVisibility(e.target.value as 'personal' | 'company')}
                    className="mr-2"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-sm">회사 캘린더</span>
                  </div>
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              개인 캘린더는 본인만, 회사 캘린더는 같은 회사 직원들이 볼 수 있습니다.
            </p>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="allDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              종일 일정
            </label>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                  required
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                  required
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              장소
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="회의실, 주소 등"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              부서
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">부서 선택 (선택사항)</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="일정에 대한 추가 정보를 입력하세요"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {editingEvent && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 