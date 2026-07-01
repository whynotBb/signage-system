/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { imageSchema, type ImageFormValues } from '@/lib/validations/image'
import { toast } from 'sonner'
import { useLogActivity } from '@/hooks/use-log-activity'
import { ImageCropDialog } from './image-crop-dialog'
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
import { Upload, X } from 'lucide-react'
import type { ImageContent } from '@/types'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/images/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function uploadImage(path: string, blob: Blob): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('images')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('images').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

async function deleteImage(url: string): Promise<void> {
  const path = extractStoragePath(url)
  if (!path) return
  const supabase = createClient()
  await supabase.storage.from('images').remove([path])
}

async function insertImage(values: ImageFormValues, imageBlob: Blob | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 정보가 없습니다.')

  const { data, error } = await supabase
    .from('image_contents')
    .insert({
      title: values.title,
      image_url: null,
      is_active: values.is_active,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw error

  if (imageBlob && data?.id) {
    try {
      const url = await uploadImage(`${data.id}.jpg`, imageBlob)
      await supabase.from('image_contents').update({ image_url: url }).eq('id', data.id)
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
    }
  }
}

async function updateImage(
  id: string,
  values: ImageFormValues,
  imageBlob: Blob | null,
  prevImageUrl: string | null
): Promise<void> {
  const supabase = createClient()
  let image_url: string | undefined

  if (imageBlob) {
    if (prevImageUrl) {
      await deleteImage(prevImageUrl).catch(() => {})
    }
    try {
      image_url = await uploadImage(`${id}.jpg`, imageBlob)
    } catch (err) {
      console.error('이미지 업로드 실패:', err)
    }
  }

  const { error } = await supabase
    .from('image_contents')
    .update({
      title: values.title,
      is_active: values.is_active,
      ...(image_url !== undefined ? { image_url } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ImageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image?: ImageContent | null
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ImageFormDialog({ open, onOpenChange, image }: ImageFormDialogProps) {
  const queryClient = useQueryClient()
  const log = useLogActivity()
  const isEdit = !!image
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)

  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageSchema),
    defaultValues: {
      title: '',
      image_url: null,
      is_active: true,
    },
  })

  const titleValue = form.watch('title') ?? ''

  useEffect(() => {
    if (open) {
      form.reset({
        title: image?.title ?? '',
        image_url: image?.image_url ?? null,
        is_active: image?.is_active ?? true,
      })
      setPreviewUrl(image?.image_url ?? null)
      setImageBlob(null)
    }
  }, [open, image, form])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('이미지 파일 크기는 10MB 이하여야 합니다.')
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    setCropOpen(true)
    e.target.value = ''
  }

  function handleCropComplete(blob: Blob) {
    setImageBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
  }

  function handleRemoveImage() {
    setPreviewUrl(null)
    setImageBlob(null)
    form.setValue('image_url', null)
  }

  const insertMutation = useMutation({
    mutationFn: (values: ImageFormValues) => insertImage(values, imageBlob),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.images.activeCount() })
      toast.success('이미지가 등록되었습니다.')
      onOpenChange(false)
      log({ actionType: 'create', targetType: 'image', targetName: values.title, description: `이미지 '${values.title}' 등록` })
    },
    onError: () => toast.error('이미지 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: ImageFormValues) =>
      updateImage(image!.id, values, imageBlob, image?.image_url ?? null),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.images.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.images.activeCount() })
      toast.success('이미지가 수정되었습니다.')
      onOpenChange(false)
      log({ actionType: 'update', targetType: 'image', targetId: image!.id, targetName: values.title, description: `이미지 '${values.title}' 수정` })
    },
    onError: () => toast.error('이미지 수정에 실패했습니다.'),
  })

  const isPending = insertMutation.isPending || updateMutation.isPending

  function onSubmit(values: ImageFormValues) {
    const hasImage = !!imageBlob || !!form.getValues('image_url')
    if (!hasImage) {
      toast.error('이미지를 첨부해주세요.')
      return
    }

    if (isEdit) {
      updateMutation.mutate(values)
    } else {
      insertMutation.mutate(values)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? '이미지 수정' : '이미지 등록'}</DialogTitle>
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
                        placeholder="이미지 제목을 입력하세요"
                        maxLength={50}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 이미지 파일 업로드 */}
              <div className="flex flex-col gap-2">
                <Label>
                  이미지 <span className="text-destructive">*</span>{' '}
                  <span className="font-normal text-muted-foreground">(최대 10MB · 16:9 비율로 편집됩니다)</span>
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-md border border-border">
                    <img
                      src={previewUrl}
                      alt="이미지 미리보기"
                      className="h-36 w-full object-cover"
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={() => fileInputRef.current?.click()}
                        title="이미지 교체"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={handleRemoveImage}
                        title="이미지 제거"
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
                    <Upload className="h-5 w-5" />
                    <span>클릭하여 이미지 선택</span>
                    <span className="text-xs">JPG, PNG, WebP · 16:9 비율로 편집됩니다</span>
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

      {cropSrc && (
        <ImageCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  )
}
