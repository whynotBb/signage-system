'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingButton } from '@/components/composite/loading-button'
import type { Team, Employee } from '@/types'

async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

interface DeleteTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team | null
  affectedEmployees: Employee[]
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  team,
  affectedEmployees,
}: DeleteTeamDialogProps) {
  const queryClient = useQueryClient()
  const isBlocked = affectedEmployees.length > 0

  const deleteMutation = useMutation({
    mutationFn: () => deleteTeam(team!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
      onOpenChange(false)
    },
  })

  if (!team) return null

  const visibleEmployees = affectedEmployees.slice(0, 5)
  const hiddenCount = affectedEmployees.length - visibleEmployees.length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isBlocked && <AlertTriangle className="h-4 w-4 text-destructive" />}
            {isBlocked ? '삭제할 수 없습니다' : `"${team.name}" 팀을 삭제하시겠습니까?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked ? (
              <>
                <span className="font-medium text-foreground">
                  {team.name}
                </span>
                {`에 소속된 직원 ${affectedEmployees.length}명을 먼저 다른 팀으로 이동하거나 삭제해주세요.`}
              </>
            ) : (
              '이 작업은 되돌릴 수 없습니다.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isBlocked && (
          <div className="my-1 flex flex-col gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2">
            {visibleEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage
                    src={employee.profile_image_url ?? undefined}
                    alt={employee.name}
                  />
                  <AvatarFallback className="text-[9px]">
                    {employee.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{employee.name}</span>
                {employee.position && (
                  <span className="text-xs text-muted-foreground">{employee.position}</span>
                )}
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="text-xs text-muted-foreground">+{hiddenCount}명 더</p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          {isBlocked ? (
            <AlertDialogCancel>닫기</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction asChild>
                <LoadingButton
                  variant="destructive"
                  isPending={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  삭제
                </LoadingButton>
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
