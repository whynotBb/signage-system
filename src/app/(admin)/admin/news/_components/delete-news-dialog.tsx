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

function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/news-images/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

interface DeleteNewsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newsId: string
  title: string
  imageUrl: string | null
}

export function DeleteNewsDialog({
  open,
  onOpenChange,
  newsId,
  title,
  imageUrl,
}: DeleteNewsDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()

      if (imageUrl) {
        const path = extractStoragePath(imageUrl)
        if (path) {
          await supabase.storage.from('news-images').remove([path])
        }
      }

      const { error } = await supabase.from('news_contents').delete().eq('id', newsId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.news.activeCount() })
      toast.success('뉴스가 삭제되었습니다.')
      onOpenChange(false)
    },
    onError: () => toast.error('뉴스 삭제에 실패했습니다.'),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>뉴스 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 아래 뉴스를 영구적으로 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
          {title}
        </div>

        {imageUrl && (
          <p className="text-xs text-muted-foreground">
            등록된 이미지가 Storage에서도 함께 삭제됩니다.
          </p>
        )}

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
