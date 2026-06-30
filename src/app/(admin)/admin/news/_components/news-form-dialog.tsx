'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { newsSchema, type NewsFormValues } from '@/lib/validations/news'
import { toast } from 'sonner'
import { useLogActivity } from '@/hooks/use-log-activity'
import { NewsCropDialog } from './news-crop-dialog'
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
import { DatePicker, DateTimePicker } from '@/components/ui/date-picker'
import type { NewsContent } from '@/types'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function extractStoragePath(url: string): string | null {
  const marker = '/storage/v1/object/public/news-images/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  // UTC → KST (+9시간) 변환 후 "YYYY-MM-DDTHH:mm" 반환
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 16)
}

function toUTCIso(localKST: string | null | undefined): string | null {
  if (!localKST) return null
  // "YYYY-MM-DDTHH:mm" (KST) → UTC ISO string
  const date = new Date(`${localKST}+09:00`)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

// 이미지 유무 · 제목 길이에 따른 부제목 최대 글자수
function calcSubtitleMax(hasImage: boolean, titleLen: number): number {
  if (hasImage) {
    if (titleLen <= 7) return 48
    if (titleLen <= 14) return 36
    return 0  // 15자 이상: 부제목 불가
  } else {
    if (titleLen > 22) return 0  // 23자 이상: 부제목 불가
    if (titleLen >= 12) return 19
    return 38
  }
}

// 부제목 필드 안내 문구
function getSubtitleHint(hasImage: boolean, titleLen: number): string {
  if (hasImage) {
    if (titleLen > 14) return '* 이미지가 있을 때 제목이 15자를 초과하면 부제목을 입력할 수 없습니다.'
    if (titleLen <= 7) return '* 이미지 있음 — 제목 7자 이하: 부제목 최대 48자 / 8~14자: 최대 36자'
    return '* 이미지 있음 — 제목 8~14자: 부제목 최대 36자 / 7자 이하: 최대 48자'
  } else {
    if (titleLen > 22) return '* 제목이 23자를 초과하면 부제목을 입력할 수 없습니다.'
    if (titleLen >= 12) return '* 제목이 12자 이상(2줄)이므로 부제목은 최대 19자입니다.'
    return '* 제목이 12자 이상(2줄)이면 부제목은 19자 이하로 입력해주세요.'
  }
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function uploadNewsImage(path: string, blob: Blob): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('news-images')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
  if (error) throw error
  const { data } = supabase.storage.from('news-images').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

async function deleteNewsImage(url: string): Promise<void> {
  const path = extractStoragePath(url)
  if (!path) return
  const supabase = createClient()
  await supabase.storage.from('news-images').remove([path])
}

async function insertNews(values: NewsFormValues, imageBlob: Blob | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 정보가 없습니다.')

  const { data, error } = await supabase
    .from('news_contents')
    .insert({
      title: values.title,
      subtitle: values.subtitle ?? null,
      news_date: values.news_date || null,
      image_url: null,
      scheduled_start_at: toUTCIso(values.scheduled_start_at),
      scheduled_end_at: toUTCIso(values.scheduled_end_at),
      is_active: values.is_active,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw error

  if (imageBlob && data?.id) {
    try {
      const url = await uploadNewsImage(`${data.id}.jpg`, imageBlob)
      await supabase.from('news_contents').update({ image_url: url }).eq('id', data.id)
    } catch (imgErr) {
      console.error('뉴스 이미지 업로드 실패:', imgErr)
    }
  }
}

async function updateNews(
  id: string,
  values: NewsFormValues,
  imageBlob: Blob | null,
  prevImageUrl: string | null
): Promise<void> {
  const supabase = createClient()
  let image_url: string | undefined

  if (imageBlob) {
    if (prevImageUrl) {
      await deleteNewsImage(prevImageUrl).catch(() => {})
    }
    try {
      image_url = await uploadNewsImage(`${id}.jpg`, imageBlob)
    } catch (imgErr) {
      console.error('뉴스 이미지 업로드 실패:', imgErr)
    }
  }

  const { error } = await supabase
    .from('news_contents')
    .update({
      title: values.title,
      subtitle: values.subtitle ?? null,
      news_date: values.news_date || null,
      scheduled_start_at: toUTCIso(values.scheduled_start_at),
      scheduled_end_at: toUTCIso(values.scheduled_end_at),
      is_active: values.is_active,
      ...(image_url !== undefined ? { image_url } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NewsFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  news?: NewsContent | null
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function NewsFormDialog({ open, onOpenChange, news }: NewsFormDialogProps) {
  const queryClient = useQueryClient()
  const log = useLogActivity()
  const isEdit = !!news
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      news_date: null,
      image_url: null,
      scheduled_start_at: null,
      scheduled_end_at: null,
      is_active: true,
    },
  })

  const titleValue = form.watch('title') ?? ''
  const subtitleValue = form.watch('subtitle') ?? ''
  const scheduledStartAt = form.watch('scheduled_start_at')
  const hasImage = !!previewUrl

  // 이미지 유무 · 부제목 유무에 따른 제목 최대 글자수
  const titleMax = hasImage
    ? (subtitleValue.length > 0 ? 14 : 28)
    : (subtitleValue.length > 0 ? 22 : 33)

  // 이미지 유무 · 제목 길이에 따른 부제목 최대 글자수
  const subtitleMax = calcSubtitleMax(hasImage, titleValue.length)
  const subtitleDisabled = subtitleMax === 0

  // 제목이 변경될 때 부제목이 새 max를 초과하면 자동 trim
  useEffect(() => {
    const subtitle = form.getValues('subtitle') ?? ''
    const newMax = calcSubtitleMax(hasImage, titleValue.length)
    if (subtitle.length > newMax) {
      form.setValue('subtitle', subtitle.slice(0, newMax), { shouldValidate: true })
    }
  }, [titleValue, hasImage, form])

  useEffect(() => {
    if (open) {
      form.reset({
        title: news?.title ?? '',
        subtitle: news?.subtitle ?? '',
        news_date: news?.news_date ?? null,
        image_url: news?.image_url ?? null,
        scheduled_start_at: toDatetimeLocal(news?.scheduled_start_at),
        scheduled_end_at: toDatetimeLocal(news?.scheduled_end_at),
        is_active: news?.is_active ?? true,
      })
      setPreviewUrl(news?.image_url ?? null)
      setImageBlob(null)
    }
  }, [open, news, form])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 파일 크기는 5MB 이하여야 합니다.')
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
    mutationFn: (values: NewsFormValues) => insertNews(values, imageBlob),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.news.activeCount() })
      toast.success('뉴스가 등록되었습니다.')
      onOpenChange(false)
      // 뉴스 등록 이력 기록
      log({ actionType: 'create', targetType: 'news', targetName: values.title, description: `뉴스 '${values.title}' 등록` })
    },
    onError: () => toast.error('뉴스 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: NewsFormValues) =>
      updateNews(news!.id, values, imageBlob, news?.image_url ?? null),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.news.activeCount() })
      toast.success('뉴스가 수정되었습니다.')
      onOpenChange(false)
      // 뉴스 수정 이력 기록
      log({ actionType: 'update', targetType: 'news', targetId: news!.id, targetName: values.title, description: `뉴스 '${values.title}' 수정` })
    },
    onError: () => toast.error('뉴스 수정에 실패했습니다.'),
  })

  const isPending = insertMutation.isPending || updateMutation.isPending

  function onSubmit(values: NewsFormValues) {
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
            <DialogTitle>{isEdit ? '뉴스 수정' : '뉴스 등록'}</DialogTitle>
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
                        {titleValue.length}/{titleMax}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="뉴스 제목을 입력하세요"
                        maxLength={titleMax}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        부제목{' '}
                        <span className="font-normal text-muted-foreground">(선택)</span>
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {(field.value ?? '').length}/{subtitleDisabled ? '-' : subtitleMax}
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        placeholder={subtitleDisabled ? '제목이 너무 길어 부제목을 입력할 수 없습니다' : '부제목을 입력하세요'}
                        maxLength={subtitleDisabled ? undefined : subtitleMax}
                        disabled={subtitleDisabled}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {getSubtitleHint(hasImage, titleValue.length)}
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="news_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      날짜{' '}
                      <span className="font-normal text-muted-foreground">(선택)</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? ''}
                        onChange={(v) => field.onChange(v || null)}
                        placeholder="날짜 선택"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 이미지 업로드 */}
              <div className="flex flex-col gap-2">
                <Label>
                  이미지{' '}
                  <span className="font-normal text-muted-foreground">(선택 · 최대 5MB)</span>
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
                      alt="뉴스 이미지 미리보기"
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

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="scheduled_start_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        게시 시작{' '}
                        <span className="font-normal text-muted-foreground">(선택)</span>
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder="시작 일시 선택"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scheduled_end_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        게시 종료{' '}
                        <span className="font-normal text-muted-foreground">(선택)</span>
                      </FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v || null)}
                          min={scheduledStartAt || undefined}
                          placeholder="종료 일시 선택"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
        <NewsCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  )
}
