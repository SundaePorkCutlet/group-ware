"use client"

import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import Modal from "@/components/ui/modal"
import { LogOut, Mail, Lock } from "lucide-react"
import { useState } from "react"
import { useAuthStore } from "@/store/authStore"

export default function AuthButton() {
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  // loading 상태는 zustand에 별도 구현 필요(간단히 false로 대체)
  const loading = false;
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [acceptCode, setAcceptCode] = useState("")
  const supabase = createClient()



  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
      }
    })
    if (error) {
      alert('로그인 오류: ' + error.message)
    } else {
      alert('이메일로 로그인 링크를 보냈습니다!')
      setShowEmailModal(false)
      setEmail("")
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSignUp) {
      let companyId = null

      // 회사 코드가 입력된 경우에만 검증
      if (acceptCode.trim()) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('accept_code', acceptCode.toUpperCase())
          .single()

        if (companyError || !company) {
          alert('유효하지 않은 회사 코드입니다.')
          return
        }
        companyId = company.id
      }

      // 회원가입
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
          data: {
            company_id: companyId
          }
        }
      })
      if (error) {
        alert('회원가입 오류: ' + error.message)
      } else {
        const message = companyId ? 
          '회사 직원으로 회원가입 완료! 이메일을 확인해주세요.' : 
          '개인 사용자로 회원가입 완료! 이메일을 확인해주세요.'
        alert(message)
        setShowPasswordModal(false)
        setEmail("")
        setPassword("")
        setAcceptCode("")
      }
    } else {
      // 로그인
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        alert('로그인 오류: ' + error.message)
      } else {
        setShowPasswordModal(false)
        setEmail("")
        setPassword("")
      }
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
  }

  const closeAllModals = () => {
    setShowEmailModal(false)
    setShowPasswordModal(false)
    setEmail("")
    setPassword("")
    setAcceptCode("")
    setIsSignUp(false)
  }

  if (loading) {
    return (
      <Button disabled size="sm">
        로딩 중...
      </Button>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          안녕하세요, {profile?.full_name ? `${profile.full_name}님` : `${user.email}님`}!
        </span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setShowPasswordModal(true)}>
          <Lock className="w-4 h-4 mr-2" />
          로그인
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowEmailModal(true)}>
          <Mail className="w-4 h-4 mr-2" />
          Magic Link
        </Button>
      </div>

      {/* 이메일 Magic Link 모달 */}
      <Modal 
        isOpen={showEmailModal} 
        onClose={closeAllModals}
        title="Magic Link 로그인"
      >
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              placeholder="이메일 주소를 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              로그인 링크 전송
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={closeAllModals}
            >
              취소
            </Button>
          </div>
        </form>
      </Modal>

      {/* 패스워드 로그인/회원가입 모달 */}
      <Modal 
        isOpen={showPasswordModal} 
        onClose={closeAllModals}
        title={isSignUp ? '회원가입' : '로그인'}
      >
        <form onSubmit={handlePasswordAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              placeholder="이메일 주소를 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              패스워드
            </label>
            <input
              type="password"
              placeholder="패스워드를 입력하세요 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={6}
            />
          </div>
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                회사 코드 (선택사항)
              </label>
              <input
                type="text"
                placeholder="회사 코드를 입력하세요 (선택사항)"
                value={acceptCode}
                onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                회사 직원이시라면 관리자로부터 받은 6자리 코드를 입력하세요. <br/>
                개인 사용자는 비워두시면 됩니다.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Button type="submit" className="w-full">
              {isSignUp ? '회원가입' : '로그인'}
            </Button>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="flex-1"
              >
                {isSignUp ? '로그인으로 변경' : '회원가입으로 변경'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeAllModals}
              >
                취소
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
} 