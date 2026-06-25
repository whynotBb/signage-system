import { z } from 'zod'

export const newsSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '200자 이하로 입력해주세요'),
  subtitle: z.string().max(500, '500자 이하로 입력해주세요').nullable().optional(),
  news_date: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  scheduled_start_at: z.string().nullable().optional(),
  scheduled_end_at: z.string().nullable().optional(),
  is_active: z.boolean(),
})

export type NewsFormValues = z.infer<typeof newsSchema>
