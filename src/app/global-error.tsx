'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 font-sans text-center text-foreground antialiased">
        <h2 className="text-2xl font-semibold">치명적인 오류가 발생했습니다</h2>
        <p className="text-muted-foreground">{error.message || '애플리케이션을 불러오는 데 실패했습니다.'}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          다시 시도
        </button>
      </body>
    </html>
  )
}
