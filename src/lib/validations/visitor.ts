import { z } from 'zod'

export const visitorSchema = z.object({
  title: z.string().min(1, '방문 제목을 입력해주세요').max(100, '100자 이하로 입력해주세요'),
  visitor_org: z.string().min(1, '방문 기관/기업명을 입력해주세요').max(100, '100자 이하로 입력해주세요'),
  visitor_name: z.string().min(1, '방문자 이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  visitor_title: z.string().min(1, '방문자 직책을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  location: z.string().min(1, '방문 장소를 입력해주세요').max(100, '100자 이하로 입력해주세요'),
  scheduled_start_at: z.string().nullable().optional(),
  scheduled_end_at: z.string().nullable().optional(),
  is_active: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.scheduled_start_at && data.scheduled_end_at) {
    const start = new Date(data.scheduled_start_at)
    const end = new Date(data.scheduled_end_at)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '종료 일시는 시작 일시 이후여야 합니다.',
        path: ['scheduled_end_at'],
      })
    }
  }
})

export type VisitorFormValues = z.infer<typeof visitorSchema>
