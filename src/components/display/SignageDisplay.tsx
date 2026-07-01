"use client";

import { useEffect, useMemo, useRef } from "react";
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

	// 실제 렌더링되는 슬라이드 "구성"을 나타내는 안정적인 서명(signature).
	// 단순 개수(length)가 아니라 어떤 옵션 슬라이드가 켜져 있는지 + 각 콘텐츠 목록의 순서/ID까지 포함해야
	// "내용은 바뀌었지만 개수는 같은" 경우도 놓치지 않는다(우선순위는 낮지만 향후 확장을 고려해 미리 포함).
	// 이 값이 바뀔 때만 Swiper를 destroy 후 재생성한다 — Swiper의 observer 기반 증분 업데이트는
	// loop:true + effect:'fade' 조합에서 슬라이드 개수가 바뀌는 상황을 신뢰성 있게 처리하지 못하기 때문.
	const slideCompositionSignature = useMemo(() => {
		const parts = [
			showSafeInsight ? "safeinsight" : "",
			showInGuide ? "inguide" : "",
			`news:${newsItems.map((n) => n.id).join(",")}`,
			`visitor:${visitorItems.map((v) => v.id).join(",")}`,
			`video:${videoItems.map((v) => v.id).join(",")}`,
			`image:${imageItems.map((i) => i.id).join(",")}`,
		];
		return parts.join("|");
	}, [showSafeInsight, showInGuide, newsItems, visitorItems, videoItems, imageItems]);

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
			// observer 계열 옵션은 의도적으로 사용하지 않는다.
			// 슬라이드 구성이 바뀌면 아래 effect가 slideCompositionSignature 변화를 감지해
			// Swiper를 명시적으로 destroy 후 재생성한다. observer의 MutationObserver 기반
			// 증분 업데이트를 동시에 켜두면 두 갱신 경로가 경쟁(race)하면서 loop clone과
			// active 클래스 부기가 불일치할 수 있어(실제 프로덕션에서 슬라이드 중첩 렌더링 +
			// autoplay 정지로 재현됨), 완전 재생성 한 가지 경로만 신뢰한다.
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
		// slideCompositionSignature가 바뀔 때만 Swiper를 destroy 후 재생성한다(마운트 시 최초 1회 포함).
		// - autoplayDelayMs는 의도적으로 deps에서 제외: 속도 변경은 슬라이드 구성과 무관하며
		//   아래의 별도 effect가 기존 인스턴스를 파괴하지 않고 delay만 imperatively 갱신한다.
		//   (여기서 재생성되는 시점의 autoplayDelayMs는 항상 최신 prop 값을 클로저로 캡처한다.)
		// - 이 배열은 항상 길이 1(신호 문자열 하나)로 고정된 최종 형태이며, 이후 다시 바뀌지 않는다.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- autoplayDelayMs는 별도 effect에서 처리하므로 의도적으로 제외
	}, [slideCompositionSignature]);

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
