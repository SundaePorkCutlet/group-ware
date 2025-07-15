"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Profile {
  id: string
  email: string
  full_name: string | null
  company_id: string | null
  is_admin: boolean
}

interface Company {
  id: string
  name: string
  description: string | null
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
}

export default function TeamPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [companyCode, setCompanyCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/')
      return
    }

    // 프로필 정보 가져오기
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      router.push('/')
      return
    }

    setUser(user)
    setProfile(profileData)

    // 회사 정보가 있다면 회사와 팀원 정보 가져오기
    if (profileData.company_id) {
      await loadCompanyInfo(profileData.company_id)
      await loadTeamMembers(profileData.company_id)
    }

    setLoading(false)
  }

  const loadCompanyInfo = async (companyId: string) => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (data) {
      setCompany(data)
    }
  }

  const loadTeamMembers = async (companyId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('company_id', companyId)
      .order('email')

    if (data) {
      setTeamMembers(data)
    }
  }

  const joinCompany = async () => {
    if (!companyCode.trim()) {
      alert('회사 코드를 입력해주세요.')
      return
    }

    setJoinLoading(true)

    try {
      // 회사 코드로 회사 찾기
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('accept_code', companyCode.trim())
        .single()

      if (companyError || !companyData) {
        alert('유효하지 않은 회사 코드입니다.')
        setJoinLoading(false)
        return
      }

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_id: companyData.id })
        .eq('id', user.id)

      if (updateError) {
        alert('회사 가입 중 오류가 발생했습니다.')
        setJoinLoading(false)
        return
      }

      alert(`${companyData.name}에 성공적으로 가입했습니다!`)
      setIsJoinModalOpen(false)
      setCompanyCode('')
      
      // 페이지 새로고침
      window.location.reload()

    } catch (error) {
      alert('회사 가입 중 오류가 발생했습니다.')
    } finally {
      setJoinLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!profile?.company_id) {
    // 회사가 없는 경우 - 회사 가입 UI
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">팀 관리</h1>
            
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                아직 회사에 소속되어 있지 않습니다
              </h3>
              <p className="text-gray-600 mb-6">
                회사 코드를 입력하여 팀에 참여하세요
              </p>
              <Button 
                onClick={() => setIsJoinModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                회사 가입하기
              </Button>
            </div>
          </div>
        </div>

        {/* 회사 가입 모달 */}
        {isJoinModalOpen && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
            onClick={() => {
              setIsJoinModalOpen(false)
              setCompanyCode('')
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">회사 가입</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  회사 코드
                </label>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  placeholder="6자리 회사 코드를 입력하세요"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  회사 관리자로부터 받은 6자리 코드를 입력하세요
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setIsJoinModalOpen(false)
                    setCompanyCode('')
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={joinLoading}
                >
                  취소
                </Button>
                <Button
                  onClick={joinCompany}
                  disabled={joinLoading || !companyCode.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {joinLoading ? '가입 중...' : '가입하기'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 회사가 있는 경우 - 팀원 목록 UI
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">팀 관리</h1>
              <p className="text-gray-600">
                {company?.name} ({teamMembers.length}명)
              </p>
            </div>
          </div>

          {company?.description && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-1">회사 소개</h3>
              <p className="text-blue-700">{company.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">팀원 목록</h3>
            
            {teamMembers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                아직 팀원이 없습니다.
              </p>
            ) : (
              <div className="grid gap-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.full_name || '이름 없음'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {member.email}
                      </div>
                    </div>
                    {member.id === user.id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        나
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 