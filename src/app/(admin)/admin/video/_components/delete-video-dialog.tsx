'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { toast } from 'sonner'
import { useLogActivity } from '@/hooks/use-log-activity'
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
  const marker = '/storage/v1/object/public/videos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

interface DeleteVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  title: string
  videoUrl: string | null
}

export function DeleteVideoDialog({
  open,
  onOpenChange,
  videoId,
  title,
  videoUrl,
}: DeleteVideoDialogProps) {
  const queryClient = useQueryClient()
  const log = useLogActivity()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()

      if (videoUrl) {
        const path = extractStoragePath(videoUrl)
        if (path) {
          await supabase.storage.from('videos').remove([path])
        }
      }

      const { error } = await supabase.from('video_contents').delete().eq('id', videoId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.activeCount() })
      toast.success('동영상이 삭제되었습니다.')
      onOpenChange(false)
      log({ actionType: 'delete', targetType: 'video', targetId: videoId, targetName: title, description: `동영상 '${title}' 삭제` })
    },
    onError: () => toast.error('동영상 삭제에 실패했습니다.'),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>동영상 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다. 아래 동영상을 영구적으로 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
          {title}
        </div>

        {videoUrl && (
          <p className="text-xs text-muted-foreground">
            등록된 동영상 파일이 Storage에서도 함께 삭제됩니다.
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
