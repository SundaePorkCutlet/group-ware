"use client"

import { Button } from "@/components/ui/button"
import AuthButton from "@/components/auth/AuthButton"
import { CalendarDays, MessageSquare, Users, FileText, Settings, BarChart3, UserPlus } from "lucide-react"
import Link from "next/link"
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">GroupWare</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </Button>
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {loading ? (
              <>
                안녕하세요! <span className="emoji">👋</span>
              </>
            ) : user && profile ? (
              <>
                {profile.full_name ? `${profile.full_name}님` : `${profile.email}님`} 안녕하세요! <span className="emoji">👋</span>
              </>
            ) : (
              <>
                안녕하세요! <span className="emoji">👋</span>
              </>
            )}
          </h2>
          <p className="text-lg text-gray-600">
            오늘도 효율적인 업무를 위해 함께해요
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 메시징 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">메시징</h3>
            </div>
            <p className="text-gray-600 mb-4">팀원들과 실시간으로 소통하세요</p>
            <Button className="w-full">채팅 시작하기</Button>
          </div>

          {/* 캘린더 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <CalendarDays className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">캘린더</h3>
            </div>
            <p className="text-gray-600 mb-4">일정과 회의를 관리하세요</p>
            <Link href="/calendar">
              <Button className="w-full" variant="outline">일정 보기</Button>
            </Link>
          </div>

          {/* 파일 공유 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">파일 공유</h3>
            </div>
            <p className="text-gray-600 mb-4">문서와 파일을 안전하게 공유하세요</p>
            <Button className="w-full" variant="outline">파일 업로드</Button>
          </div>

          {/* 팀 관리 / 회사 가입 - 인증 상태에 따라 다르게 표시 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {!user ? (
              // 로그인하지 않은 경우 - 기본 팀 관리 카드
              <>
                <div className="flex items-center mb-4">
                  <Users className="w-8 h-8 text-gray-400 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">팀 관리</h3>
                </div>
                <p className="text-gray-600 mb-4">로그인 후 팀에 참여하세요</p>
                <Button className="w-full" variant="outline" disabled>
                  로그인 필요
                </Button>
              </>
            ) : user && profile && !profile.company_id ? (
              // 회사가 없는 경우 - 회사 가입하기 카드
              <>
                <div className="flex items-center mb-4">
                  <UserPlus className="w-8 h-8 text-blue-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">회사 가입하기</h3>
                </div>
                <p className="text-gray-600 mb-4">회사 코드를 입력하여 팀에 참여하세요</p>
                <Link href="/team">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    가입 코드 입력
                  </Button>
                </Link>
              </>
            ) : user && profile && profile.company_id ? (
              // 회사가 있는 경우 - 팀 관리 카드
              <>
                <div className="flex items-center mb-4">
                  <Users className="w-8 h-8 text-orange-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">팀 관리</h3>
                </div>
                <p className="text-gray-600 mb-4">조직과 팀원을 관리하세요</p>
                <Link href="/team">
                  <Button className="w-full" variant="outline">팀 보기</Button>
                </Link>
              </>
            ) : (
              // 로딩 중인 경우 - 스켈레톤
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            )}
          </div>

          {/* 대시보드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-8 h-8 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">분석</h3>
            </div>
            <p className="text-gray-600 mb-4">업무 현황을 한눈에 확인하세요</p>
            <Button className="w-full" variant="outline">분석 보기</Button>
          </div>

          {/* 새 기능 추가 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-dashed border-blue-300 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-2xl">+</span>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">새 기능</h3>
              <p className="text-blue-700 text-sm">곧 추가될 예정입니다</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <p>아직 활동 내역이 없습니다.</p>
              <p className="text-sm mt-1">로그인하시면 최근 활동을 확인할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
