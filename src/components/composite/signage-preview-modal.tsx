"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "@/app/signage.css";

interface SignagePreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	/** true: 70vw (뉴스/방문자), false(기본): 90vw (조직도) */
	compact?: boolean;
	children: React.ReactNode;
}

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

export function SignagePreviewModal({ open, onOpenChange, title = "미리보기", compact = false, children }: SignagePreviewModalProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	const updateScale = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const scaleX = rect.width / DESIGN_WIDTH;
		const scaleY = rect.height / DESIGN_HEIGHT;
		setScale(Math.min(scaleX, scaleY));
	}, []);

	useEffect(() => {
		if (!open) return;
		const id = requestAnimationFrame(() => updateScale());
		return () => cancelAnimationFrame(id);
	}, [open, updateScale]);

	useEffect(() => {
		if (!open) return;
		const observer = new ResizeObserver(updateScale);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [open, updateScale]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={cn(
					"w-full p-0 gap-0 overflow-hidden",
					compact
						? "sm:!max-w-[min(70vw,1050px)]"
						: "sm:!max-w-[min(90vw,1200px)]"
				)}
				style={{ maxHeight: "90vh" }}
				showCloseButton={false}
				closeOnInteractOutside={true}
			>
				{/* 접근성용 숨김 제목 */}
				<DialogTitle className="sr-only">{title}</DialogTitle>

				{/* 헤더 */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
					<span className="text-sm font-medium text-foreground">{title}</span>
					<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)} aria-label="닫기">
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* 16:9 비율 유지 컨테이너 */}
				<div
					ref={containerRef}
					className="relative w-full bg-black overflow-hidden"
					style={{ aspectRatio: `${DESIGN_WIDTH} / ${DESIGN_HEIGHT}` }}
				>
					{/* 1920×1080 기준 실제 렌더링 영역 */}
					<div
						className="signage-root"
						style={{
							width: DESIGN_WIDTH,
							height: DESIGN_HEIGHT,
							transform: `scale(${scale})`,
							transformOrigin: "top left",
							position: "absolute",
							top: 0,
							left: 0,
						}}
					>
						{children}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
