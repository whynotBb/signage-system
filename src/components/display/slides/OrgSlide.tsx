/* eslint-disable @next/next/no-img-element */
import type { Division, Team, Employee } from "@/types";

interface OrgSlideProps {
	divisions: Division[];
	teams: Team[];
	employees: Employee[];
}

type OrgTeam = Team & { isVirtual?: boolean; members?: Employee[] };

// 신규입사자 기준: 입사일로부터 3개월 이내
function isNewEmployee(hiredAt: string): boolean {
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	return new Date(hiredAt) > threeMonthsAgo;
}

// 아바타 이미지 URL (폴백: undefined로 설정하여 src="" 방지)
function getAvatarUrl(url: string | null | undefined): string | undefined {
	return url || undefined;
}

interface AvatarImageOrFallbackProps {
	profileImageUrl: string | null | undefined;
	name: string;
	className?: string;
}

function AvatarImageOrFallback({ profileImageUrl, name, className = "org-member-avatar" }: AvatarImageOrFallbackProps) {
	const url = getAvatarUrl(profileImageUrl);
	if (url) {
		return <img className={className} src={url} alt={name} />;
	}
	const lastName = name.charAt(0);
	return <div className={`${className} org-member-avatar-fallback`}>{lastName}</div>;
}

interface MemberCardProps {
	employee: Employee;
	extraClass?: string;
}

function MemberCard({ employee, extraClass }: MemberCardProps) {
	const isNew = isNewEmployee(employee.hired_at);
	const className = ["org-member", employee.org_role === "ai" ? "org-member-ai" : "", employee.is_dispatched ? "org-member-dispatched" : "", isNew ? "org-member-new" : "", extraClass ?? ""].filter(Boolean).join(" ");

	return (
		<li className={className}>
			<AvatarImageOrFallback profileImageUrl={employee.profile_image_url} name={employee.name} />
			<div className="org-member-info">
				<span className="org-member-title">{employee.title && employee.position ? employee.title : employee.position || employee.title || ""}</span>
				<span className="org-member-name">{employee.name}</span>
			</div>
		</li>
	);
}

export function OrgSlide({ divisions, teams, employees }: OrgSlideProps) {
	// 임원진 추출
	const ceo = employees.find((e) => e.org_role === "representative") ?? null;
	const vp = employees.find((e) => e.org_role === "vice_representative") ?? null;

	const ceoTitle = ceo ? ceo.title || (ceo.position === "대표" || ceo.position === "대표이사" ? "대표이사" : ceo.position || "대표이사") : "";
	const vpTitle = vp ? vp.title || (vp.position === "부대표" || vp.position === "부사장" ? "부사장" : vp.position || "부사장") : "";

	// 단독팀 (소속 실 없음)
	const standaloneTeams = teams.filter((t) => !t.division_id);

	// 부서별 데이터 구성
	const deptData = divisions.map((div) => {
		const divTeams = teams.filter((t) => t.division_id === div.id);
		const directEmps = employees.filter((e) => e.division_id === div.id && !e.team_id && (e.org_role === "member" || e.org_role === "ai"));

		// 실장: 직속 직원 중 title이 실장/소장인 첫 번째
		const headTitles = ["실장", "소장", "연구소장"];
		const head = directEmps.find((e) => headTitles.includes(e.title)) ?? null;
		const directMembers = directEmps.filter((e) => e !== head);

		// 실장 이외 실직속 직원이 있는 경우 가상의 '실직속' 팀 블록을 첫 번째에 배치
		const virtualDirectTeam =
			directMembers.length > 0
				? {
						id: `virtual-direct:${div.id}`,
						name: "실직속",
						division_id: div.id,
						color: div.color,
						isVirtual: true,
						members: directMembers,
					}
				: null;

		const allTeams = virtualDirectTeam ? [virtualDirectTeam, ...divTeams] : divTeams;
		const hasRealTeams = divTeams.length > 0;
		const hasTeams = allTeams.length > 0;
		const hasHead = head !== null;

		return {
			type: "division" as const,
			id: div.id,
			display_order: div.display_order ?? 0,
			data: { div, allTeams, head, hasTeams, hasRealTeams, hasHead },
		};
	});

	// 단독팀 데이터 구성
	const standaloneData = standaloneTeams.map((team) => {
		return {
			type: "team" as const,
			id: team.id,
			display_order: team.display_order ?? 0,
			data: team,
		};
	});

	// 병합 및 정렬
	const mixedBlocks = [...deptData, ...standaloneData].sort((a, b) => a.display_order - b.display_order);

	// 총 열 수 계산 (한 화면에 다 들어가도록 스타일 조절하기 위함)
	const totalColumns = mixedBlocks.reduce((acc, block) => {
		if (block.type === "division") {
			const { allTeams, hasTeams } = block.data as {
				div: Division;
				allTeams: OrgTeam[];
				head: Employee | null;
				hasTeams: boolean;
				hasHead: boolean;
			};
			if (hasTeams) {
				// 팀 개당 열 개수 합산
				const divTeamsCols = allTeams.reduce((tAcc: number, team: OrgTeam) => {
					const teamMembers = team.isVirtual ? (team.members ?? []) : employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
					return tAcc + (teamMembers.length >= 10 ? 2 : 1);
				}, 0);
				return acc + divTeamsCols;
			} else {
				return acc + 1; // 멤버도 없고 팀도 없는 경우 실 카드를 위한 1열 확보
			}
		} else {
			// 독립팀: 1열 (10명 이상인 경우 2열)
			const team = block.data as Team;
			const teamMembers = employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
			return acc + (teamMembers.length >= 10 ? 2 : 1);
		}
	}, 0);

	// 마지막 열의 팀원 수 계산
	const lastColumnMemberCount = (() => {
		if (mixedBlocks.length === 0) return 0;
		const lastBlock = mixedBlocks[mixedBlocks.length - 1];
		if (lastBlock.type === "division") {
			const { allTeams, hasRealTeams } = lastBlock.data as {
				allTeams: (Team & { isVirtual?: boolean; members?: Employee[] })[];
				hasRealTeams: boolean;
			};
			if (hasRealTeams && allTeams.length > 0) {
				const lastTeam = allTeams[allTeams.length - 1];
				const teamMembers = lastTeam.isVirtual ? (lastTeam.members ?? []) : employees.filter((e) => e.team_id === lastTeam.id && (e.org_role === "member" || e.org_role === "ai"));
				return teamMembers.length;
			} else {
				const directEmps = employees.filter((e) => e.division_id === lastBlock.id && !e.team_id && (e.org_role === "member" || e.org_role === "ai"));
				const headTitles = ["실장", "소장", "연구소장"];
				const head = directEmps.find((e) => headTitles.includes(e.title)) ?? null;
				const directMembers = directEmps.filter((e) => e !== head);
				return directMembers.length;
			}
		} else {
			const team = lastBlock.data as Team;
			const teamMembers = employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
			return teamMembers.length;
		}
	})();

	// 열 수에 따른 CSS 클래스 매핑
	const colsClass = `col-${totalColumns}`;

	return (
		<div className="contents-wrapper">
			<div className={`org-wrapper ${colsClass}`}>
				{/* 상단 헤더: 로고 + 임원 */}
				<div className="org-header">
					<div className="org-logo">
						<img src="/signage/images/hubilon_logo_w.svg" alt="Hubilon Logo" />
					</div>
					<ul className="org-executive-list">
						{ceo && (
							<li className="org-member org-member-ceo">
								<div className="org-member-avatar-wrapper">
									<AvatarImageOrFallback profileImageUrl={ceo.profile_image_url} name={ceo.name} className="" />
								</div>
								<div className="org-member-info">
									<span className="org-member-title">{ceoTitle}</span>
									<span className="org-member-name">{ceo.name}</span>
								</div>
							</li>
						)}
						{vp && (
							<li className="org-member org-member-vp">
								<AvatarImageOrFallback profileImageUrl={vp.profile_image_url} name={vp.name} />
								<div className="org-member-info">
									<span className="org-member-title">{vpTitle}</span>
									<span className="org-member-name">{vp.name}</span>
								</div>
							</li>
						)}
					</ul>
				</div>

				{/* 실별 목록 */}
				<div className="org-dept-list">
					{mixedBlocks.map((block) => {
						if (block.type === "division") {
							const { div, allTeams, head, hasTeams, hasRealTeams, hasHead } = block.data as {
								div: Division;
								allTeams: OrgTeam[];
								head: Employee | null;
								hasTeams: boolean;
								hasRealTeams: boolean;
								hasHead: boolean;
							};
							const deptClass = ["org-dept", !hasRealTeams ? "org-dept-no-teams" : "", !hasHead && hasRealTeams ? "org-dept-team-only" : ""].filter(Boolean).join(" ");

							return (
								<section key={div.id} className={deptClass} style={{ "--dept-color": div.color } as React.CSSProperties}>
									{/* 실 이름 (실제 팀이 없거나 실장이 있을 때 표시) */}
									{(!hasRealTeams || hasHead) && <h2 className="org-dept-name">{div.name}</h2>}

									{/* 실장 카드 */}
									{hasHead && head && (
										<div className="org-dept-head">
											<div className="org-member">
												<AvatarImageOrFallback profileImageUrl={head.profile_image_url} name={head.name} />
												<div className="org-member-info">
													<span className="org-member-title">{head.title}</span>
													<span className="org-member-name">{head.name}</span>
												</div>
											</div>
										</div>
									)}

									{/* 팀 목록 */}
									{hasTeams && (
										<div className="org-team-list">
											{allTeams.map((team) => {
												const teamMembers = team.isVirtual ? (team.members ?? []) : employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
												const isWide = teamMembers.length >= 10;
												const teamClass = ["org-team", isWide ? "org-team-wide" : ""].filter(Boolean).join(" ");

												// 팀명 분리 (e.g. "서비스개발 1팀" → ["서비스개발", "1팀"])
												const parts = team.name.split(" ");

												return (
													<div key={team.id} className={teamClass}>
														{team.isVirtual ? (
															<div className="org-team-name-spacer" style={{ height: "2.083vw" }} />
														) : (
															<h3 className="org-team-name">
																{parts.length > 1 ? (
																	<>
																		{parts.slice(0, -1).join(" ")} <em>{parts[parts.length - 1]}</em>
																	</>
																) : (
																	team.name
																)}
															</h3>
														)}
														<ul className="org-member-list">
															{teamMembers.map((emp: Employee) => (
																<MemberCard key={emp.id} employee={emp} />
															))}
														</ul>
													</div>
												);
											})}
										</div>
									)}
								</section>
							);
						} else {
							const team = block.data as Team;
							const teamMembers = employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
							return (
								<section key={team.id} className="org-dept org-dept-team-only" style={{ "--dept-color": team.color ?? "#888888" } as React.CSSProperties}>
									<div className="org-team-list">
										<div className="org-team">
											<h3 className="org-team-name">{team.name}</h3>
											<ul className="org-member-list">
												{teamMembers.map((emp) => (
													<MemberCard key={emp.id} employee={emp} />
												))}
											</ul>
										</div>
									</div>
								</section>
							);
						}
					})}
				</div>

				{/* 범례 */}
				<ul className={`org-legend-list ${lastColumnMemberCount > 6 ? "legend-top-right" : ""}`}>
					<li className="org-legend-item">
						<span className="org-legend-item-icon">
							<img src="/signage/images/icon_new.svg" alt="신규입사자" />
						</span>
						<span className="org-legend-item-text">신규입사자</span>
					</li>
					<li className="org-legend-item">
						<span className="org-legend-item-icon" />
						<span className="org-legend-item-text">파견자</span>
					</li>
					<li className="org-legend-item org-legend-item-ai">
						<span className="org-legend-item-icon" />
						<span className="org-legend-item-text">에이전트</span>
					</li>
				</ul>
			</div>
		</div>
	);
}
