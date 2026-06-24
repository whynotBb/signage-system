import { z } from 'zod'

// 실(Division) 폼 유효성 스키마
export const divisionSchema = z.object({
  name: z.string().min(1, '실 이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  display_order: z.coerce.number().int().min(1, '1 이상이어야 합니다'),
})

// 팀(Team) 폼 유효성 스키마
export const teamSchema = z.object({
  name: z.string().min(1, '팀 이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  division_id: z.string().min(1, '소속 실을 선택해주세요'),
  display_order: z.coerce.number().int().min(1, '1 이상이어야 합니다'),
})

// 폼 값 타입 (Zod 스키마에서 파생)
export type DivisionFormValues = z.infer<typeof divisionSchema>
export type TeamFormValues = z.infer<typeof teamSchema>
