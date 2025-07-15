"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import { ArrowLeft, Home } from 'lucide-react'

interface Company {
  id: string
  name: string
  accept_code: string
  admin_id: string | null
  description: string | null
  created_at: string
}

interface Profile {
  id: string
  email: string
  full_name: string
  is_admin: boolean
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: '',
    description: ''
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('사용자가 로그인되어 있지 않습니다.')
      router.push('/')
      return
    }

    console.log('현재 사용자:', user.email, user.id)

    // 프로필 정보 가져오기
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('프로필 데이터:', profileData)
    console.log('프로필 조회 오류:', error)

    if (!profileData || !profileData.is_admin) {
      alert('관리자 권한이 필요합니다.')
      router.push('/')
      return
    }

    setUser(user)
    setProfile(profileData)
    await loadCompanies()
    setLoading(false)
  }

  const loadCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setCompanies(data)
    }
  }

  const createCompany = async () => {
    if (!newCompany.name.trim()) {
      alert('회사명을 입력해주세요.')
      return
    }

    // accept_code 생성
    const { data: codeData } = await supabase
      .rpc('generate_accept_code')

    if (!codeData) {
      alert('회사 코드 생성에 실패했습니다.')
      return
    }

    const { error } = await supabase
      .from('companies')
      .insert({
        name: newCompany.name,
        description: newCompany.description,
        accept_code: codeData,
        admin_id: profile?.id
      })

    if (error) {
      alert('회사 생성에 실패했습니다: ' + error.message)
    } else {
      alert('회사가 성공적으로 생성되었습니다!')
      setNewCompany({ name: '', description: '' })
      setIsCreateModalOpen(false)
      await loadCompanies()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
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

        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">시스템 관리자</h1>
              <p className="text-gray-600">환영합니다, {profile?.email}님!</p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              새 회사 생성
            </Button>
          </div>
        </div>

        {/* 회사 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">회사 목록</h2>
            <p className="text-gray-600">총 {companies.length}개의 회사가 등록되어 있습니다.</p>
          </div>
          
          <div className="p-6">
            {companies.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">등록된 회사가 없습니다.</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  첫 번째 회사 생성하기
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {companies.map((company) => (
                  <div key={company.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        {company.accept_code}
                      </span>
                    </div>
                    
                    {company.description && (
                      <p className="text-gray-600 text-sm mb-3">{company.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      생성일: {new Date(company.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 회사 생성 모달 */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="새 회사 생성"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사명 *
              </label>
              <input
                type="text"
                value={newCompany.name}
                onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="회사명을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={newCompany.description}
                onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="회사 설명을 입력하세요 (선택사항)"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={createCompany}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                생성
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700"
              >
                취소
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
} 