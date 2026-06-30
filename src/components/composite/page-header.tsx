import type React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: React.ReactNode;
	description?: string;
	children?: React.ReactNode;
	className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
	return (
		<div className={cn("sticky top-0 z-10 flex flex-col gap-3 bg-background pb-3 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4 border-b border-border/50 mb-2", className)}>
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
				{description && <p className="text-sm text-muted-foreground">{description}</p>}
			</div>
			{children && <div className="flex shrink-0 items-center gap-2 ml-auto">{children}</div>}
		</div>
	);
}
