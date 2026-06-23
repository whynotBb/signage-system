import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/composite/loading-spinner'
import type { ComponentProps } from 'react'

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  isPending?: boolean
  pendingText?: string
}

export function LoadingButton({
  isPending = false,
  pendingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={isPending || disabled} {...props}>
      {isPending && <LoadingSpinner size="sm" className="mr-2" />}
      {isPending && pendingText ? pendingText : children}
    </Button>
  )
}
