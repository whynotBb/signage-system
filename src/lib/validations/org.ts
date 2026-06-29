import { z } from 'zod'

// 실(Division) 폼 유효성 스키마
export const divisionSchema = z.object({
  name: z.string().min(1, '실 이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '올바른 색상 코드를 입력해주세요'),
})

// 팀(Team) 폼 유효성 스키마
export const teamSchema = z.object({
  name: z.string().min(1, '팀 이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  division_id: z.string().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '올바른 색상 코드를 입력해주세요'),
})

// 직원(Employee) 폼 유효성 스키마
export const employeeSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '50자 이하로 입력해주세요'),
  title: z.string().max(30, '30자 이하로 입력해주세요'),
  position: z.string().min(1, '직위를 선택해주세요'),
  division_id: z.string().nullable(),
  team_id: z.string().nullable(),
  org_role: z.enum(['member', 'representative', 'vice_representative', 'ai']),
  hired_at: z.string().min(1, '입사일을 입력해주세요'),
  is_dispatched: z.boolean(),
  is_resigned: z.boolean(),
})

// 폼 값 타입 (Zod 스키마에서 파생)
export type DivisionFormValues = z.infer<typeof divisionSchema>
export type TeamFormValues = z.infer<typeof teamSchema>
export type EmployeeFormValues = z.infer<typeof employeeSchema>
