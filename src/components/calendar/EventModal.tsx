"use client";

import { useState, useEffect } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { X, Clock, MapPin, Users, Save, Trash2 } from "lucide-react";
import type { Event } from "@/app/calendar/page";
import { useAuthStore } from "@/store/authStore";

// 휴가 종류 타입은 meta_codes에서 동적으로 불러옴

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedDate: Date | null;
  editingEvent: Event | null;
}

export default function EventModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  editingEvent,
}: EventModalProps) {
  const user = useAuthStore((state) => state.user);
  const userProfile = useAuthStore((state) => state.profile);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<
    "meeting" | "holiday" | "attendance" | "other"
  >("meeting");
  const [visibility, setVisibility] = useState<"personal" | "company">(
    "personal"
  );
  const [isAllDay, setIsAllDay] = useState(false);
  const [loading, setSaving] = useState(false);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  // userProfile은 zustand에서 전역 관리
  const [holidayTypes, setHolidayTypes] = useState<
    { code: string; label: string; value: number }[]
  >([]);
  const [holidayType, setHolidayType] = useState("annual");
  const supabase = createSupabaseClient();
  const [isEditing, setIsEditing] = useState(false);
  const [attendanceType, setAttendanceType] = useState<
    "🌅 출근" | "🌆 퇴근" | ""
  >("");

  // attendanceType 상태 변화 추적
  useEffect(() => {
    console.log("attendanceType 변경됨:", attendanceType);
  }, [attendanceType]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 사용자 프로필 정보 가져오기
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        } else {
          // setUserProfile(profile) // 이 부분은 zustand에서 관리
        }

        // 부서 정보 가져오기
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .order("name");

        if (error) {
          console.error("Error fetching departments:", error);
        } else {
          setDepartments((data || []) as { id: string; name: string }[]);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    if (isOpen) {
      if (editingEvent && editingEvent.event_type === "holiday") {
        setHolidayType((editingEvent as any).leave_type || "annual");
      } else if (!editingEvent) {
        setHolidayType("annual");
      }
      // 새 일정 모달이 열릴 때 selectedDate가 있으면 자동으로 날짜 세팅
      if (!editingEvent && selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;
        setStartDate(dateStr);
        setEndDate(dateStr);
        setStartTime("09:00");
        setEndTime("10:00");
      }
      // 새 일정이면 편집 모드로, 기존 일정이면 읽기 전용으로 시작
      setIsEditing(!editingEvent);
    }
  }, [isOpen, editingEvent, selectedDate]);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || "");
      setDescription(editingEvent.description || "");
      setStartDate(
        editingEvent.start_date ? editingEvent.start_date.slice(0, 10) : ""
      );
      setEndDate(
        editingEvent.end_date ? editingEvent.end_date.slice(0, 10) : ""
      );
      setStartTime(
        editingEvent.start_date ? editingEvent.start_date.slice(11, 16) : ""
      );
      setEndTime(
        editingEvent.end_date ? editingEvent.end_date.slice(11, 16) : ""
      );
      setLocation(editingEvent.location || "");
      setEventType(editingEvent.event_type || "meeting");
      setVisibility(editingEvent.visibility || "personal");
      setSelectedDepartment(editingEvent.department_id || "");
      setHolidayType(editingEvent.leave_type || "1");
    }
  }, [editingEvent]);

  // 휴가 타입(meta_codes) 동적 로딩
  useEffect(() => {
    if (eventType === "holiday") {
      const supabase = createSupabaseClient();
      supabase
        .from("meta_codes")
        .select("code, label, value")
        .eq("code_type", "leave_type")
        .eq("is_active", true)
        .order("value", { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            // code값을 1,2,3으로 매핑
            const types = data.map((d: any) => ({
              code: d.value?.toString() || d.code, // value가 있으면 숫자코드로, 없으면 기존 code
              label: String(d.label),
              value: Number(d.value),
            }));
            setHolidayTypes(types);
            // 편집 모드면 editingEvent.leave_type, 아니면 첫 번째 값
            if (
              editingEvent &&
              editingEvent.event_type === "holiday" &&
              (editingEvent as any).leave_type
            ) {
              setHolidayType((editingEvent as any).leave_type);
            } else {
              setHolidayType(types[0].code);
            }
          }
        });
    }
  }, [eventType, editingEvent]);

  useEffect(() => {
    if (eventType === "attendance") {
      setVisibility("personal");
      setIsAllDay(false);
    }
  }, [eventType]);

  const handleSave = async () => {
    if (
      !title.trim() &&
      eventType !== "holiday" &&
      eventType !== "attendance"
    ) {
      alert("제목을 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      let startDateTime: string;
      let endDateTime: string;

      if (eventType === "attendance") {
        // 출퇴근: 시작/종료 시간을 같게 설정
        const start = new Date(`${startDate}T${startTime}:00`);
        startDateTime = start.toISOString();
        endDateTime = start.toISOString();
      } else if (isAllDay) {
        // 종일 일정: 로컬 기준으로 00:00 ~ 23:59:59
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T23:59:59`);
        startDateTime = start.toISOString();
        endDateTime = end.toISOString();
      } else {
        // 시간 일정: 로컬 기준으로 입력값을 Date 객체로 만든 뒤 toISOString()
        const start = new Date(`${startDate}T${startTime}:00`);
        const end = new Date(`${endDate}T${endTime}:00`);
        startDateTime = start.toISOString();
        endDateTime = end.toISOString();
      }

      // 휴가일 경우 title/description은 label, leave_type은 code로 저장
      let finalTitle = title.trim();
      let finalDescription = description.trim() || null;
      let leaveType = null;
      if (eventType === "holiday") {
        // 휴가 종류를 1,2,3 숫자코드로 저장
        leaveType = holidayType;
        const selected = holidayTypes.find((t) => t.code === holidayType);
        finalTitle = selected ? selected.label : holidayType;
        finalDescription = selected ? selected.label : holidayType;
      }

      const eventData = {
        title: finalTitle,
        description: finalDescription,
        start_date: startDateTime,
        end_date: endDateTime,
        location: location.trim() || null,
        event_type: eventType,
        leave_type: leaveType,
        visibility: visibility,
        is_all_day: isAllDay,
        department_id: selectedDepartment || null,
        created_by: user?.id,
        // 출퇴근 이벤트인 경우 기본값으로 점심시간 제외
        ...(eventType === "attendance" && { exclude_lunch_time: true }),
      };

      let error;

      if (editingEvent) {
        // 기존 이벤트 업데이트
        const { error: updateError } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);
        error = updateError;
      } else {
        // 새 이벤트 생성
        const { error: insertError } = await supabase
          .from("events")
          .insert(eventData);
        error = insertError;
      }

      if (error) {
        console.error("Error saving event:", error);
        alert(`일정 저장 중 오류가 발생했습니다: ${error.message}`);
      } else {
        resetForm();
        onSave();
        // 일정 저장 후 페이지 새로고침
        window.location.reload();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("일정 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;

    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) return;

    setSaving(true);

    try {
      // 이벤트 삭제
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", editingEvent.id);

      if (error) {
        console.error("Error deleting event:", error);
        alert(`일정 삭제 중 오류가 발생했습니다: ${error.message}`);
      } else {
        resetForm();
        onSave();
        // 일정 삭제 후 페이지 새로고침
        window.location.reload();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("일정 삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setLocation("");
    setEventType("meeting");
    setVisibility("personal");
    setIsAllDay(false);
    setSelectedDepartment("");
    setHolidayType("annual");
    setAttendanceType("");
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200 hover:scale-110"
          >
            ×
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1 text-white">
              {editingEvent ? "일정 상세" : "새 일정"}
            </div>
            <div className="text-white font-medium">
              {editingEvent
                ? "기존 일정을 수정합니다"
                : "새로운 일정을 추가합니다"}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Event Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              일정 종류
            </label>
            <select
              value={eventType}
              onChange={(e) =>
                isEditing &&
                setEventType(
                  e.target.value as
                    | "meeting"
                    | "holiday"
                    | "attendance"
                    | "other"
                )
              }
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!isEditing}
            >
              <option value="meeting">회의</option>
              <option value="holiday">휴가</option>
              <option value="attendance">출퇴근</option>
              <option value="other">기타</option>
            </select>
          </div>

          {/* 휴가(holiday) 타입일 때 휴가 종류 선택 */}
          {eventType === "holiday" && holidayTypes.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                휴가 종류
              </label>
              <select
                value={holidayType}
                onChange={(e) => isEditing && setHolidayType(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!isEditing}
              >
                {holidayTypes.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 출퇴근 타입일 때만 출퇴근 종류 선택 */}
          {eventType === "attendance" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                출퇴근 종류
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    console.log("출근 버튼 클릭됨, isEditing:", isEditing);
                    if (isEditing) {
                      console.log("출근 타입 설정 중...");
                      setAttendanceType("🌅 출근");
                      setTitle("🌅 출근");
                      console.log("출근 타입 설정 완료");
                    }
                  }}
                  className={`relative flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-center transition-all duration-200 font-medium ${
                    attendanceType === "🌅 출근"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                  disabled={!isEditing}
                >
                  <span className="text-lg">🌅</span>
                  <span>출근</span>
                  {attendanceType === "🌅 출근" && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    console.log("퇴근 버튼 클릭됨, isEditing:", isEditing);
                    if (isEditing) {
                      console.log("퇴근 타입 설정 중...");
                      setAttendanceType("🌆 퇴근");
                      setTitle("🌆 퇴근");
                      console.log("퇴근 타입 설정 완료");
                    }
                  }}
                  className={`relative flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl text-center transition-all duration-200 font-medium ${
                    attendanceType === "🌆 퇴근"
                      ? "border-orange-500 bg-orange-50 text-orange-700 shadow-md"
                      : "border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-gray-50"
                  }`}
                  disabled={!isEditing}
                >
                  <span className="text-lg">🌆</span>
                  <span>퇴근</span>
                  {attendanceType === "🌆 퇴근" && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 휴가가 아닐 때만 제목, 설명, 장소, 부서 입력란 표시 */}
          {eventType !== "holiday" && eventType !== "attendance" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => isEditing && setTitle(e.target.value)}
                  placeholder="일정 제목을 입력하세요"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                  readOnly={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={description}
                  onChange={(e) => isEditing && setDescription(e.target.value)}
                  placeholder="일정에 대한 추가 정보를 입력하세요"
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  readOnly={!isEditing}
                />
              </div>
            </>
          )}

          {/* Date and Time */}
          {eventType === "attendance" ? (
            // 출퇴근일 때는 날짜와 시간만
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => isEditing && setStartDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  시간
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => isEditing && setStartTime(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
            </div>
          ) : (
            // 일반 일정일 때는 시작/종료 날짜/시간
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => isEditing && setStartDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    readOnly={!isEditing}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => isEditing && setEndDate(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    readOnly={!isEditing}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => isEditing && setStartTime(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    readOnly={!isEditing}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => isEditing && setEndTime(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    readOnly={!isEditing}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </>
          )}

          {/* 출퇴근이 아닐 때만 장소, 부서 입력란 표시 */}
          {eventType !== "attendance" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  장소
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => isEditing && setLocation(e.target.value)}
                  placeholder="회의실, 주소 등"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                  readOnly={!isEditing}
                  disabled={!isEditing}
                />
              </div>
              {userProfile?.company_id && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    유형 부서
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) =>
                      isEditing && setSelectedDepartment(e.target.value)
                    }
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={!isEditing}
                  >
                    <option value="">부서 선택 (선택사항)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* Visibility - 항상 표시하되 출퇴근은 개인으로 고정 */}
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            캘린더 유형
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-200 ${
                eventType === "attendance"
                  ? "opacity-50"
                  : "hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value="personal"
                checked={visibility === "personal"}
                onChange={(e) =>
                  isEditing &&
                  eventType !== "attendance" &&
                  setVisibility(e.target.value as "personal" | "company")
                }
                disabled={eventType === "attendance" || !isEditing}
                className="mr-3"
              />
              <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
              개인 캘린더
            </label>
            {userProfile && userProfile.company_id && (
              <label
                className={`flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer transition-all duration-200 ${
                  eventType === "attendance"
                    ? "opacity-50"
                    : "hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="company"
                  checked={visibility === "company"}
                  onChange={(e) =>
                    isEditing &&
                    eventType !== "attendance" &&
                    setVisibility(e.target.value as "personal" | "company")
                  }
                  disabled={eventType === "attendance" || !isEditing}
                  className="mr-3"
                />
                <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                회사 캘린더
              </label>
            )}
          </div>

          {/* All Day Toggle - 출퇴근이 아닐 때만 표시 */}
          {eventType !== "attendance" && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="mr-3 rounded border-gray-300"
              />
              <label
                htmlFor="allDay"
                className="text-sm font-medium text-gray-700"
              >
                종일 일정
              </label>
            </div>
          )}
        </div>

        {/* 버튼 영역 - 고정 */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-end gap-3">
            {!isEditing ? (
              <div className="flex gap-3">
                <button
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none transition-all duration-200"
                  onClick={() => setIsEditing(true)}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  편집
                </button>
                {editingEvent && (
                  <button
                    className="inline-flex items-center px-6 py-3 text-sm font-medium text-red-700 bg-red-100 border-2 border-red-200 rounded-xl hover:bg-red-200 focus:outline-none transition-all duration-200"
                    onClick={handleDelete}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    삭제
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none transition-all duration-200"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  취소
                </button>
                <button
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-purple-500 border border-transparent rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  저장
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
