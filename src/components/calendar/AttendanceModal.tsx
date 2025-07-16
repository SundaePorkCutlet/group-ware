"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { X, Trash2, Edit2, Save } from 'lucide-react'
import type { Event } from '@/app/calendar/page'

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onSave: () => void
  event: Event
}

export default function AttendanceModal({ 
  isOpen, 
  onClose, 
  onDelete,
  onSave,
  event
}: AttendanceModalProps) {
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTime, setEditTime] = useState('')
  const [excludeLunchTime, setExcludeLunchTime] = useState(true) // 기본값: 점심시간 제외
  const supabase = createClient()

  useEffect(() => {
    if (event) {
      const time = new Date(event.start_date).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      setEditTime(time)
      // exclude_lunch_time 값 설정 (기본값: true)
      setExcludeLunchTime(event.exclude_lunch_time ?? true)
    }
  }, [event])

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)

      if (error) throw error

      onDelete()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTime = async () => {
    setLoading(true)
    try {
      // 현재 이벤트의 날짜를 유지하면서 시간만 변경
      const originalDate = new Date(event.start_date)
      const [hours, minutes] = editTime.split(':')
      
      // 로컬 시간으로 날짜 생성 (타임존 문제 해결)
      const year = originalDate.getFullYear()
      const month = originalDate.getMonth()
      const day = originalDate.getDate()
      
      const newDate = new Date(year, month, day, parseInt(hours), parseInt(minutes), 0, 0)

      const { error } = await supabase
        .from('events')
        .update({
          start_date: newDate.toISOString(),
          end_date: new Date(newDate.getTime() + 60000).toISOString(), // 1분 후
          exclude_lunch_time: excludeLunchTime
        })
        .eq('id', event.id)

      if (error) throw error

      onSave()
      setIsEditing(false)
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('시간 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isClockIn = event.title === '🌅 출근'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            출퇴근 기록
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center py-4">
            <div className="text-4xl mb-3">
              {isClockIn ? '🌅' : '🌆'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isClockIn ? '출근 기록' : '퇴근 기록'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(event.start_date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">시간</span>
              {isEditing ? (
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {new Date(event.start_date).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* 출근 기록인 경우에만 점심시간 제외 설정 표시 */}
            {isClockIn && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">점심시간 제외</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={excludeLunchTime}
                    onChange={(e) => setExcludeLunchTime(e.target.checked)}
                    disabled={!isEditing}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">1시간 제외</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button 
                  onClick={handleSaveTime}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  저장
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  닫기
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 