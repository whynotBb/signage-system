import { createClient } from '@/lib/supabase/client'

export type ActivityActionType = 'create' | 'update' | 'delete'
export type ActivityTargetType =
  | 'employee'
  | 'division'
  | 'team'
  | 'news'
  | 'visitor'
  | 'video'
  | 'image'
  | 'company_intro'
  | 'org_chart'
  | 'user'

export interface LogActivityParams {
  actorId: string
  actorName: string
  actionType: ActivityActionType
  targetType: ActivityTargetType
  targetId?: string
  targetName?: string
  description: string
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        actor_id: params.actorId,
        actor_name: params.actorName,
        action_type: params.actionType,
        target_type: params.targetType,
        target_id: params.targetId ?? null,
        target_name: params.targetName ?? null,
        description: params.description,
      })
    if (error) console.error('[activity-log]', error.message)
  } catch {
    // 이력 기록 실패는 무시
  }
}
