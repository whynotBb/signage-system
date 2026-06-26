import type { VisitorContent } from '@/types'

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch {
    return [value]
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.replace(/-/g, '.')
}

interface VisitorSlideProps {
  visitor: VisitorContent
}

export function VisitorSlide({ visitor }: VisitorSlideProps) {
  const names = parseJsonArray(visitor.visitor_name)
  const titles = parseJsonArray(visitor.visitor_title)
  const isMultiple = names.length > 1

  return (
    <div className="contents-wrapper">
      <div className="welcome-wrapper">
        <div className="welcome-title">
          <h2 className="text-gradient">Welcome!</h2>
          <h3>방문을 환영합니다!</h3>
        </div>
        <div className="welcome-content">
          {isMultiple ? (
            <div className="welcome-info">
              <span className="company">{visitor.visitor_org}</span>
              {names.map((name, i) => (
                <span key={i} className="guest">
                  <b>{name}</b>{titles[i]}
                </span>
              ))}
            </div>
          ) : (
            <p className="welcome-info">
              {visitor.visitor_org}
              <span>
                <b>{names[0]}</b>{titles[0]}
              </span>
            </p>
          )}
          <p className="welcome-date">
            {formatDate(visitor.visit_date)}
            {visitor.location && <span className="location">{visitor.location}</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
