"use client";

import { useEffect, useRef } from "react";
import Swiper from "swiper";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import type { Division, Team, Employee, NewsContent, VisitorContent, VideoContent, ImageContent } from "@/types";
import { OrgSlide } from "./slides/OrgSlide";
import { SafeInsightSlide } from "./slides/SafeInsightSlide";
import { InGuideSlide } from "./slides/InGuideSlide";
import { NewsSlide } from "./slides/NewsSlide";
import { VisitorSlide } from "./slides/VisitorSlide";
import { VideoSlide } from "./slides/VideoSlide";
import { ImageSlide } from "./slides/ImageSlide";
import { RealtimeSync } from "./RealtimeSync";

interface SignageDisplayProps {
	divisions: Division[];
	teams: Team[];
	employees: Employee[];
	showSafeInsight: boolean;
	showInGuide: boolean;
	newsItems: NewsContent[];
	visitorItems: VisitorContent[];
	videoItems: VideoContent[];
	imageItems: ImageContent[];
	autoplayDelayMs: number;
}

export function SignageDisplay({ divisions, teams, employees, showSafeInsight, showInGuide, newsItems, visitorItems, videoItems, imageItems, autoplayDelayMs }: SignageDisplayProps) {
	const swiperRef = useRef<Swiper | null>(null);

	useEffect(() => {
		const SwiperClass = (Swiper as unknown as { default?: typeof Swiper }).default || Swiper;
		const colorBubbles = document.querySelectorAll<HTMLElement>(".color-bubble");

		const updateColorBubbles = (s: Swiper) => {
			if (!s || !s.slides) return;
			const activeSlide = s.slides[s.activeIndex];
			const isActive = activeSlide?.classList.contains("bubble_st") ?? false;
			colorBubbles.forEach((el) => el.classList.toggle("on", isActive));
		};

		const syncActiveVideo = (s: Swiper) => {
			if (!s || !s.slides) return;
			const activeSlide = s.slides[s.activeIndex];
			document.querySelectorAll<HTMLVideoElement>(".swiper-slide video").forEach((videoEl) => {
				if (videoEl === activeSlide?.querySelector("video")) {
					videoEl.currentTime = 0;
					videoEl.play().catch(() => {});
				} else {
					videoEl.pause();
				}
			});
		};

		const swiper = new SwiperClass(".swiper", {
			modules: [Autoplay, EffectFade],
			loop: true,
			effect: "fade",
			fadeEffect: { crossFade: true },
			speed: 800,
			keyboard: { enabled: true },
			mousewheel: { enabled: true },
			autoplay: {
				delay: autoplayDelayMs,
				disableOnInteraction: false,
			},
			observer: true,
			observeParents: true,
			observeSlideChildren: true,
			on: {
				init: function (s: Swiper) {
					updateColorBubbles(s);
					syncActiveVideo(s);
				},
				slideChange: function (s: Swiper) {
					updateColorBubbles(s);
					syncActiveVideo(s);
				},
			},
		});

		swiperRef.current = swiper;

		return () => {
			if (swiper && typeof swiper.destroy === "function") {
				swiper.destroy(true, true);
			}
			swiperRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- Swiper 인스턴스는 마운트 시 1회만 생성. 속도 변경은 아래 별도 effect에서 imperatively 반영한다
	}, []);

	// autoplayDelayMs가 바뀌면(예: 관리자 대시보드에서 속도 변경 → Realtime → router.refresh) 기존 Swiper 인스턴스를 파괴하지 않고 delay만 갱신
	useEffect(() => {
		const swiper = swiperRef.current;
		if (!swiper || typeof swiper.params.autoplay !== "object") return;
		swiper.params.autoplay.delay = autoplayDelayMs;
		swiper.autoplay.stop();
		swiper.autoplay.start();
	}, [autoplayDelayMs]);

	return (
		<div className="signage-root" style={{ width: "100vw", height: "100vh" }}>
			<div className="signage-wrapper">
				<RealtimeSync />
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

					{/* SafeInsight (활성화된 경우) */}
					{showSafeInsight && (
						<div className="swiper-slide">
							<SafeInsightSlide />
						</div>
					)}

					{/* In-Guide (활성화된 경우) */}
					{showInGuide && (
						<div className="swiper-slide">
							<InGuideSlide />
						</div>
					)}

					{/* 뉴스 슬라이드 (활성 콘텐츠 순환) */}
					{newsItems.map((news) => (
						<div key={news.id} className="swiper-slide bubble_st">
							<NewsSlide news={news} />
						</div>
					))}

					{/* 방문자 슬라이드 (활성 콘텐츠 순환) */}
					{visitorItems.map((visitor) => (
						<div key={visitor.id} className="swiper-slide bubble_st">
							<VisitorSlide visitor={visitor} />
						</div>
					))}

					{/* 동영상 슬라이드 (활성 콘텐츠 순환) */}
					{videoItems.map((video) => (
						<div key={video.id} className="swiper-slide">
							<VideoSlide video={video} />
						</div>
					))}

					{/* 이미지 슬라이드 (활성 콘텐츠 순환) */}
					{imageItems.map((image) => (
						<div key={image.id} className="swiper-slide">
							<ImageSlide image={image} />
						</div>
					))}
				</div>
			</div>
		</div>
		</div>
	);
}
