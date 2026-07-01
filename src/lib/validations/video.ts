import { z } from 'zod'

export const videoSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(50, '제목은 50자 이하여야 합니다'),
  video_url: z.string().nullable().optional(),
  is_active: z.boolean(),
})

export type VideoFormValues = z.infer<typeof videoSchema>
