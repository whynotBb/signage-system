'use client'

import { useAuthStore } from '@/store/auth-store'
import { logActivity } from '@/lib/activity-log'
import type { ActivityActionType, ActivityTargetType } from '@/lib/activity-log'

interface UseLogActivityParams {
  actionType: ActivityActionType
  targetType: ActivityTargetType
  targetId?: string
  targetName?: string
  description: string
}

export function useLogActivity() {
  const user = useAuthStore((s) => s.user)

  return (params: UseLogActivityParams) => {
    if (!user) return
    return logActivity({
      ...params,
      actorId: user.id,
      actorName: user.name,
    })
  }
}
