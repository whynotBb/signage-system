import { z } from 'zod'

export const imageSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(50, '제목은 50자 이하여야 합니다'),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean(),
})

export type ImageFormValues = z.infer<typeof imageSchema>
