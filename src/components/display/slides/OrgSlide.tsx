/* eslint-disable @next/next/no-img-element */
import type { Division, Team, Employee } from '@/types'

interface OrgSlideProps {
  divisions: Division[]
  teams: Team[]
  employees: Employee[]
}

// 신규입사자 기준: 입사일로부터 6개월 이내
function isNewEmployee(hiredAt: string): boolean {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return new Date(hiredAt) > sixMonthsAgo
}

// 아바타 이미지 URL (폴백: 빈 원형)
function getAvatarUrl(url: string | null): string {
  return url ?? ''
}

interface MemberCardProps {
  employee: Employee
  extraClass?: string
}

function MemberCard({ employee, extraClass }: MemberCardProps) {
  const isNew = isNewEmployee(employee.hired_at)
  const className = [
    'org-member',
    employee.is_dispatched ? 'org-member-dispatched' : '',
    isNew ? 'org-member-new' : '',
    extraClass ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li className={className}>
      <img className="org-member-avatar" src={getAvatarUrl(employee.profile_image_url)} alt={employee.name} />
      <div className="org-member-info">
        <span className="org-member-title">{employee.title}</span>
        <span className="org-member-name">{employee.name}</span>
      </div>
    </li>
  )
}

export function OrgSlide({ divisions, teams, employees }: OrgSlideProps) {
  // 임원진 추출
  const ceo = employees.find((e) => e.org_role === 'representative') ?? null
  const vp = employees.find((e) => e.org_role === 'vice_representative') ?? null

  // 부서별 데이터 구성
  const deptData = divisions.map((div) => {
    const divTeams = teams.filter((t) => t.division_id === div.id)
    const directEmps = employees.filter(
      (e) => e.division_id === div.id && !e.team_id && e.org_role === 'member',
    )

    // 실장: 직속 직원 중 title이 실장/소장인 첫 번째
    const headTitles = ['실장', '소장', '연구소장']
    const head = directEmps.find((e) => headTitles.includes(e.title)) ?? null
    const directMembers = directEmps.filter((e) => e !== head)

    const hasTeams = divTeams.length > 0
    const hasHead = head !== null

    return { div, divTeams, head, directMembers, hasTeams, hasHead }
  })

  return (
    <div className="contents-wrapper">
      <div className="org-wrapper">
        {/* 상단 헤더: 로고 + 임원 */}
        <div className="org-header">
          <div className="org-logo">
            <img src="/signage/images/hubilon_logo_w.svg" alt="Hubilon Logo" />
          </div>
          <ul className="org-executive-list">
            {ceo && (
              <li className="org-member org-member-ceo">
                <div className="org-member-avatar-wrapper">
                  <img src={getAvatarUrl(ceo.profile_image_url)} alt={ceo.name} />
                </div>
                <div className="org-member-info">
                  <span className="org-member-title">{ceo.title}</span>
                  <span className="org-member-name">{ceo.name}</span>
                </div>
              </li>
            )}
            {vp && (
              <li className="org-member org-member-vp">
                <img className="org-member-avatar" src={getAvatarUrl(vp.profile_image_url)} alt={vp.name} />
                <div className="org-member-info">
                  <span className="org-member-title">{vp.title}</span>
                  <span className="org-member-name">{vp.name}</span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* 실별 목록 */}
        <div className="org-dept-list">
          {deptData.map(({ div, divTeams, head, directMembers, hasTeams, hasHead }) => {
            const deptClass = [
              'org-dept',
              `org-dept-${div.color}`,
              !hasTeams ? 'org-dept-no-teams' : '',
              !hasHead && hasTeams ? 'org-dept-team-only' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <section key={div.id} className={deptClass}>
                {/* 실 이름 (팀이 없거나 실장이 있을 때 표시) */}
                {(!hasTeams || hasHead) && (
                  <h2 className="org-dept-name">{div.name}</h2>
                )}

                {/* 실장 카드 */}
                {hasHead && head && (
                  <div className="org-dept-head">
                    <div className="org-member">
                      <img className="org-member-avatar" src={getAvatarUrl(head.profile_image_url)} alt={head.name} />
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
                    {divTeams.map((team) => {
                      const teamMembers = employees.filter(
                        (e) => e.team_id === team.id && e.org_role === 'member',
                      )
                      const isWide = teamMembers.length >= 10
                      const teamClass = ['org-team', isWide ? 'org-team-wide' : '']
                        .filter(Boolean)
                        .join(' ')

                      // 팀명 분리 (e.g. "서비스개발 1팀" → ["서비스개발", "1팀"])
                      const parts = team.name.split(' ')

                      return (
                        <div key={team.id} className={teamClass}>
                          <h3 className="org-team-name">
                            {parts.length > 1 ? (
                              <>
                                {parts.slice(0, -1).join(' ')}{' '}
                                <em>{parts[parts.length - 1]}</em>
                              </>
                            ) : (
                              team.name
                            )}
                          </h3>
                          <ul className="org-member-list">
                            {teamMembers.map((emp) => (
                              <MemberCard key={emp.id} employee={emp} />
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 팀이 없고 직속 멤버가 있는 경우 (영업/기획실 등) */}
                {!hasTeams && directMembers.length > 0 && (
                  <ul
                    className={[
                      'org-member-list',
                      directMembers.length >= 10 ? 'org-team-wide' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {directMembers.map((emp) => (
                      <MemberCard key={emp.id} employee={emp} />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>

        {/* 범례 */}
        <ul className="org-legend-list">
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
        </ul>
      </div>
    </div>
  )
}
