// Supabase Auth 연동 시 useAuthStore를 레이아웃 및 라우트 보호 로직에 연결하세요
// proxy.ts 또는 레이아웃에서 isAuthenticated를 확인해 미인증 사용자를 /admin/login으로 리다이렉트합니다
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
