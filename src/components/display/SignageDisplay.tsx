'use client'

import { useEffect, useRef } from 'react'
import Swiper from 'swiper'
import { Autoplay, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import type { Division, Team, Employee } from '@/types'
import { OrgSlide } from './slides/OrgSlide'
import { SafeInsightSlide } from './slides/SafeInsightSlide'
import { InGuideSlide } from './slides/InGuideSlide'

interface SignageDisplayProps {
  divisions: Division[]
  teams: Team[]
  employees: Employee[]
  showSafeInsight: boolean
  showInGuide: boolean
}

export function SignageDisplay({
  divisions,
  teams,
  employees,
  showSafeInsight,
  showInGuide,
}: SignageDisplayProps) {
  const swiperRef = useRef<Swiper | null>(null)

  useEffect(() => {
    const swiper = new Swiper('.swiper', {
      modules: [Autoplay, EffectFade],
      loop: true,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 800,
      keyboard: { enabled: true },
      mousewheel: { enabled: true },
      autoplay: {
        delay: 10000,
        disableOnInteraction: false,
      },
    })

    swiperRef.current = swiper

    const colorBubbles = document.querySelectorAll<HTMLElement>('.color-bubble')

    const updateColorBubbles = () => {
      const activeSlide = swiper.slides[swiper.activeIndex]
      const isActive = activeSlide?.classList.contains('bubble_st') ?? false
      colorBubbles.forEach((el) => el.classList.toggle('on', isActive))
    }

    swiper.on('slideChange', updateColorBubbles)
    updateColorBubbles()

    return () => {
      swiper.destroy(true, true)
      swiperRef.current = null
    }
  }, [])

  return (
    <div className="signage-wrapper">
      {/* 배경 버블 레이어 */}
      <div className="deco-bubble-wrapper">
        <div className="deco-bubble blur-blue" />
        <div className="deco-bubble blur-green" />
        <div className="deco-bubble blur-blue-lg" />
        <div className="color-bubble color-blue" />
        <div className="color-bubble color-blue-lg" />
        <div className="color-bubble color-green" />
        <div className="color-bubble color-yellow" />
        <div className="color-bubble color-ring-white" />
        <div className="color-bubble color-ring-white2" />
        <div className="color-bubble color-ring-green" />
      </div>

      {/* Swiper */}
      <div className="swiper">
        <div className="swiper-wrapper">
          {/* 슬라이드 1: 조직도 */}
          <div className="swiper-slide">
            <OrgSlide divisions={divisions} teams={teams} employees={employees} />
          </div>

          {/* 슬라이드 2: SafeInsight (활성화된 경우) */}
          {showSafeInsight && (
            <div className="swiper-slide">
              <SafeInsightSlide />
            </div>
          )}

          {/* 슬라이드 3: In-Guide (활성화된 경우) */}
          {showInGuide && (
            <div className="swiper-slide">
              <InGuideSlide />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
