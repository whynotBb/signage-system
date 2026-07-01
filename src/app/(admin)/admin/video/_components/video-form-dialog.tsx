'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { videoSchema, type VideoFormValues } from '@/lib/validations/video'
import { toast } from 'sonner'
import { useLogActivity } from '@/hooks/use-log-activity'
import { LoadingButton } from '@/components/composite/loading-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, Video } from 'lucide-react'
import type { VideoContent } from '@/types'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/videos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function uploadVideo(path: string, file: File): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, file, { upsert: true, contentType: file.type || 'video/mp4' })
  if (error) throw error
  const { data } = supabase.storage.from('videos').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

async function deleteVideo(url: string): Promise<void> {
  const path = extractStoragePath(url)
  if (!path) return
  const supabase = createClient()
  await supabase.storage.from('videos').remove([path])
}

async function insertVideo(values: VideoFormValues, videoFile: File | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 정보가 없습니다.')

  const { data, error } = await supabase
    .from('video_contents')
    .insert({
      title: values.title,
      video_url: null,
      is_active: values.is_active,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw error

  if (videoFile && data?.id) {
    try {
      const ext = videoFile.name.split('.').pop() ?? 'mp4'
      const url = await uploadVideo(`${data.id}.${ext}`, videoFile)
      await supabase.from('video_contents').update({ video_url: url }).eq('id', data.id)
    } catch (err) {
      console.error('동영상 업로드 실패:', err)
    }
  }
}

async function updateVideo(
  id: string,
  values: VideoFormValues,
  videoFile: File | null,
  prevVideoUrl: string | null
): Promise<void> {
  const supabase = createClient()
  let video_url: string | undefined

  if (videoFile) {
    if (prevVideoUrl) {
      await deleteVideo(prevVideoUrl).catch(() => {})
    }
    try {
      const ext = videoFile.name.split('.').pop() ?? 'mp4'
      video_url = await uploadVideo(`${id}.${ext}`, videoFile)
    } catch (err) {
      console.error('동영상 업로드 실패:', err)
    }
  }

  const { error } = await supabase
    .from('video_contents')
    .update({
      title: values.title,
      is_active: values.is_active,
      ...(video_url !== undefined ? { video_url } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VideoFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video?: VideoContent | null
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function VideoFormDialog({ open, onOpenChange, video }: VideoFormDialogProps) {
  const queryClient = useQueryClient()
  const log = useLogActivity()
  const isEdit = !!video
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: '',
      video_url: null,
      is_active: true,
    },
  })

  const titleValue = form.watch('title') ?? ''

  useEffect(() => {
    if (open) {
      form.reset({
        title: video?.title ?? '',
        video_url: video?.video_url ?? null,
        is_active: video?.is_active ?? true,
      })
      setPreviewUrl(video?.video_url ?? null)
      setVideoFile(null)
      setFileName(null)
    }
  }, [open, video, form])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      toast.error('동영상 파일 크기는 100MB 이하여야 합니다.')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setVideoFile(file)
    setFileName(file.name)
    e.target.value = ''
  }

  function handleRemoveVideo() {
    setPreviewUrl(null)
    setVideoFile(null)
    setFileName(null)
    form.setValue('video_url', null)
  }

  const insertMutation = useMutation({
    mutationFn: (values: VideoFormValues) => insertVideo(values, videoFile),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.activeCount() })
      toast.success('동영상이 등록되었습니다.')
      onOpenChange(false)
      log({ actionType: 'create', targetType: 'video', targetName: values.title, description: `동영상 '${values.title}' 등록` })
    },
    onError: () => toast.error('동영상 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: VideoFormValues) =>
      updateVideo(video!.id, values, videoFile, video?.video_url ?? null),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.videos.activeCount() })
      toast.success('동영상이 수정되었습니다.')
      onOpenChange(false)
      log({ actionType: 'update', targetType: 'video', targetId: video!.id, targetName: values.title, description: `동영상 '${values.title}' 수정` })
    },
    onError: () => toast.error('동영상 수정에 실패했습니다.'),
  })

  const isPending = insertMutation.isPending || updateMutation.isPending

  function onSubmit(values: VideoFormValues) {
    const hasVideo = !!videoFile || !!form.getValues('video_url')
    if (!hasVideo) {
      toast.error('동영상 파일을 첨부해주세요.')
      return
    }

    if (isEdit) {
      updateMutation.mutate(values)
    } else {
      insertMutation.mutate(values)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '동영상 수정' : '동영상 등록'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>
                      제목 <span className="text-destructive">*</span>
                    </FormLabel>
                    <span className="text-xs text-muted-foreground">
                      {titleValue.length}/50
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="동영상 제목을 입력하세요"
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 동영상 파일 업로드 */}
            <div className="flex flex-col gap-2">
              <Label>
                동영상 파일 <span className="text-destructive">*</span>{' '}
                <span className="font-normal text-muted-foreground">(최대 100MB · mp4, webm)</span>
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-md border border-border bg-black">
                  <video
                    src={previewUrl}
                    controls
                    className="h-40 w-full object-contain"
                    muted
                  />
                  {fileName && (
                    <p className="px-2 py-1 text-xs text-muted-foreground truncate bg-muted/80">
                      {fileName}
                    </p>
                  )}
                  <div className="absolute right-2 top-2 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => fileInputRef.current?.click()}
                      title="동영상 교체"
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={handleRemoveVideo}
                      title="동영상 제거"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Video className="h-5 w-5" />
                  <span>클릭하여 동영상 선택</span>
                  <span className="text-xs">MP4, WebM · 최대 100MB</span>
                </button>
              )}
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div className="flex flex-col gap-0.5">
                      <FormLabel className="cursor-pointer text-sm font-medium">
                        활성화
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
                        활성화 시 디스플레이 슬라이드에 표시됩니다.
                      </span>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <LoadingButton type="submit" isPending={isPending}>
                {isEdit ? '수정' : '등록'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
