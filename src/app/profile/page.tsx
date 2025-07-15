"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User, Mail, Building2, Shield, ArrowLeft, Home } from 'lucide-react'

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

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
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
    setFullName(profileData.full_name || '')

    // 회사 정보가 있다면 가져오기
    if (profileData.company_id) {
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileData.company_id)
        .single()

      if (companyData) {
        setCompany(companyData)
      }
    }

    setLoading(false)
  }

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', profile.id)

      if (error) {
        alert('프로필 업데이트 중 오류가 발생했습니다.')
        setSaving(false)
        return
      }

      // 프로필 상태 업데이트
      setProfile({ ...profile, full_name: fullName.trim() || null })
      alert('프로필이 성공적으로 업데이트되었습니다!')

    } catch (error) {
      alert('프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 상단 네비게이션 */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Button>
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            메인페이지
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-6">
            <User className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">개인 프로필</h1>
          </div>

          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
              
              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  이메일
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
              </div>

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  이름
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  다른 사용자들에게 표시될 이름입니다
                </p>
              </div>
            </div>

            {/* 회사 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">회사 정보</h3>
              
              {company ? (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Building2 className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">{company.name}</span>
                  </div>
                  {company.description && (
                    <p className="text-blue-700 text-sm">{company.description}</p>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    아직 회사에 소속되어 있지 않습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 권한 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">계정 정보</h3>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-gray-900">계정 권한: </span>
                  {profile?.is_admin ? (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      시스템 관리자
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      일반 사용자
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={saveProfile}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 