'use client'

// TODO: MobileNav 등 반응형 분기가 필요한 컴포넌트에서 useMobile() 을 사용하세요
// 현재 MobileNav 는 CSS md:hidden 으로 가시성을 처리하고 있습니다
import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export function useMobile() {
  // SSR과 초기 클라이언트 렌더링 일치를 위해 false로 고정 (hydration mismatch 방지)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    setIsMobile(mql.matches)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

// shadcn/ui sidebar 컴포넌트 호환용 alias
export const useIsMobile = useMobile
