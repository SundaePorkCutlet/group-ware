'use client';

import { useEffect, useState } from 'react';
import AttendanceModal from './AttendanceModal';
import type { Event } from '@/app/calendar/page';

interface AttendanceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  events: Event[];
  date: string;
}

export default function AttendanceListModal({ 
  isOpen, 
  onClose, 
  onRefresh,
  events, 
  date
}: AttendanceListModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowAttendanceModal(true);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[date.getDay()];
    
    return `${month}월 ${day}일 ${weekday}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* AttendanceModal이 열려있을 때는 배경을 숨김 */}
      {!showAttendanceModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        >
        <div 
          className={`bg-white rounded-2xl shadow-2xl w-96 max-w-sm mx-4 transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* 헤더 */}
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">출퇴근 기록</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span className="text-gray-600 text-lg">×</span>
            </button>
          </div>

          {/* 날짜 정보 */}
          <div className="px-6 pt-4 pb-2">
            <div className="text-center">
              <div className="text-gray-800 font-semibold text-lg">{formatDate(date)}</div>
              <div className="text-gray-500 text-sm mt-1">출퇴근 기록</div>
            </div>
          </div>

          {/* 출퇴근 카드들 */}
          <div className="px-6 pb-6 space-y-3">
            {events.map((event) => {
              const isClockIn = event.title.includes('출근');
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`
                    relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg
                    ${isClockIn 
                      ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 hover:from-emerald-100 hover:to-green-100' 
                      : 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 hover:from-orange-100 hover:to-amber-100'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-2xl
                        ${isClockIn 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-orange-100 text-orange-600'
                        }
                      `}>
                        {isClockIn ? '🏢' : '🏠'}
                      </div>
                      <div>
                        <div className={`font-semibold text-lg ${isClockIn ? 'text-emerald-800' : 'text-orange-800'}`}>
                          {isClockIn ? '출근' : '퇴근'}
                        </div>
                        <div className="text-gray-600 text-sm">
                          클릭하여 시간 수정
                        </div>
                      </div>
                    </div>
                    <div className={`text-right ${isClockIn ? 'text-emerald-700' : 'text-orange-700'}`}>
                      <div className="text-2xl font-bold">
                        {formatTime(event.start_date)}
                      </div>
                    </div>
                  </div>
                  
                  {/* 데코레이션 도트 */}
                  <div className={`
                    absolute top-2 right-2 w-2 h-2 rounded-full
                    ${isClockIn ? 'bg-emerald-300' : 'bg-orange-300'}
                  `}></div>
                </div>
              );
            })}
          </div>

          {/* 닫기 버튼 */}
          <div className="px-6 pb-6">
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all duration-200"
            >
              닫기
            </button>
          </div>
        </div>
        </div>
      )}

      {/* 실제 Attendance Modal */}
      {showAttendanceModal && selectedEvent && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => {
            setShowAttendanceModal(false);
            setSelectedEvent(null);
          }}
          onDelete={() => {
            onRefresh();
            setShowAttendanceModal(false);
            setSelectedEvent(null);
            handleClose();
          }}
          onSave={() => {
            onRefresh();
            setShowAttendanceModal(false);
            setSelectedEvent(null);
            handleClose();
          }}
          event={selectedEvent}
        />
      )}
    </>
  );
} 