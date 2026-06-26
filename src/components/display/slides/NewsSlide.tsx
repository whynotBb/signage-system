/* eslint-disable @next/next/no-img-element */
import type { NewsContent } from '@/types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return dateStr.replace(/-/g, '.')
}

interface NewsSlideProps {
  news: NewsContent
}

export function NewsSlide({ news }: NewsSlideProps) {
  const hasImage = !!news.image_url

  return (
    <div className="contents-wrapper">
      <div className="news-wrapper">
        <div className="news-header">
          <h2 className="text-gradient">News</h2>
        </div>
        <div className={`news-content${hasImage ? ' img-news' : ''}`}>
          {hasImage && (
            <div className="image-wrapper">
              <img src={news.image_url!} alt={news.title} />
            </div>
          )}
          <div className="news-info">
            <p className="news-title">{news.title}</p>
            {news.subtitle && <p className="news-description">{news.subtitle}</p>}
            {news.news_date && <p className="news-date">{formatDate(news.news_date)}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
