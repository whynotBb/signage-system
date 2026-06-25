'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { toast } from 'sonner'
import { LoadingButton } from '@/components/composite/loading-button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface DeleteVisitorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitorId: string
  title: string
}

export function DeleteVisitorDialog({
  open,
  onOpenChange,
  visitorId,
  title,
}: DeleteVisitorDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.from('visitor_contents').delete().eq('id', visitorId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() })
      toast.success('방문자 공지가 삭제되었습니다.')
      onOpenChange(false)
    },
    onError: () => toast.error('방문자 공지 삭제에 실패했습니다.'),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>방문자 공지 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 아래 방문자 공지를 영구적으로 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
          {title}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <LoadingButton
            isPending={deleteMutation.isPending}
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
          >
            삭제
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
