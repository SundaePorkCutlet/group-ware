"use client"

import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, Mail, Lock } from "lucide-react"
import { useState, useEffect } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function AuthButton() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // 현재 사용자 확인
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

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
      setShowEmailForm(false)
    }
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSignUp) {
      // 회원가입
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
        }
      })
      if (error) {
        alert('회원가입 오류: ' + error.message)
      } else {
        alert('회원가입 완료! 이메일을 확인해주세요.')
        setShowPasswordForm(false)
      }
    } else {
      // 로그인
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        alert('로그인 오류: ' + error.message)
      }
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error.message)
    }
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
          안녕하세요, {user.email}님!
        </span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    )
  }

  if (showEmailForm) {
    return (
      <form onSubmit={handleEmailSignIn} className="flex items-center gap-2 p-4 bg-white border rounded-lg shadow-sm">
        <input
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <Button type="submit" size="sm">
          로그인 링크 전송
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setShowEmailForm(false)}
        >
          취소
        </Button>
      </form>
    )
  }

  if (showPasswordForm) {
    return (
      <form onSubmit={handlePasswordAuth} className="flex flex-col gap-3 p-6 border-2 border-gray-200 rounded-lg bg-white shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {isSignUp ? '회원가입' : '로그인'}
        </h3>
        <input
          type="email"
          placeholder="이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="password"
          placeholder="패스워드 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-lg text-sm bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
          minLength={6}
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
            {isSignUp ? '회원가입' : '로그인'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => setIsSignUp(!isSignUp)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {isSignUp ? '로그인으로 변경' : '회원가입으로 변경'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPasswordForm(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            취소
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => setShowPasswordForm(true)}>
        <Lock className="w-4 h-4 mr-2" />
        로그인
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowEmailForm(true)}>
        <Mail className="w-4 h-4 mr-2" />
        Magic Link
      </Button>
    </div>
  )
} 