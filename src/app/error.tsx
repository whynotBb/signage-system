'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">오류가 발생했습니다</h2>
        <p className="text-muted-foreground">
          {error.message || '예상치 못한 문제가 발생했습니다. 다시 시도해주세요.'}
        </p>
      </div>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  )
}
