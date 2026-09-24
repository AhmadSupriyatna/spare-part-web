import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { submitMaintenanceDecision } from '@/features/findings/api'
import { DecisionFormDialog } from '@/features/findings/DecisionFormDialog'
import { useCanApprove } from '@/stores/use-has-role'
import type { MaintenanceHistoryEntry } from '@/types/maintenance-history'
import type { CreateMaintenanceDecisionPayload } from '@/types/maintenance-decision'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

const RESULT_LABELS: Record<string, string> = {
  pass: 'PASS',
  monitor: 'MONITOR',
  action_required: 'ACTION REQUIRED',
  fail: 'FAIL',
}

const RESULT_VARIANTS: Record<string, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  pass: 'success',
  monitor: 'secondary',
  action_required: 'warning',
  fail: 'destructive',
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
}

const SEVERITY_VARIANTS: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
}

const DECISION_LABELS: Record<string, string> = {
  no_action: 'No Action',
  monitor: 'Monitor',
  schedule_maintenance: 'Schedule Maintenance',
  replace_part: 'Replace Part',
  repair_part: 'Repair Part',
  escalate: 'Escalate',
}

function extractErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })
    ?.response
  if (!response) return 'Gagal menyimpan Decision. Periksa koneksi Anda.'

  if (response.status === 403) return 'Anda tidak berwenang membuat Decision untuk Finding ini.'
  if (response.status === 409) return response.data?.message ?? 'Finding ini sudah memiliki keputusan.'
  if (response.data?.errors) {
    return Object.values(response.data.errors).flat().join(' ')
  }
  return response.data?.message ?? 'Data yang dikirim tidak valid.'
}

interface FindingDetailSheetProps {
  branchId: number
  entry: MaintenanceHistoryEntry | null
  onOpenChange: (open: boolean) => void
}

export function FindingDetailSheet({ branchId, entry, onOpenChange }: FindingDetailSheetProps) {
  const canApprove = useCanApprove()
  const queryClient = useQueryClient()
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: CreateMaintenanceDecisionPayload) => submitMaintenanceDecision(entry!.finding!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', branchId] })
      toast.success('Decision berhasil disimpan.')
      setDecisionDialogOpen(false)
      setErrorMessage(null)
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      setErrorMessage(extractErrorMessage(error))
    },
  })

  const hasDecision = !!entry?.decision
  const canCreateDecision = canApprove && entry?.event_type === 'FINDING' && !hasDecision

  return (
    <>
      <Sheet open={!!entry} onOpenChange={onOpenChange} modal={false}>
        <SheetContent className="gap-0 p-0" showOverlay={false}>
          {entry && (
            <>
              <div className="flex flex-col gap-1 border-b px-4 py-4 pr-10">
                <SheetTitle>Finding</SheetTitle>
                <SheetDescription>
                  {entry.equipment ?? '-'}
                  {entry.part && ` · ${entry.part}`}
                </SheetDescription>
              </div>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.finding && (
                    <Badge variant={RESULT_VARIANTS[entry.finding.result] ?? 'secondary'}>
                      {RESULT_LABELS[entry.finding.result] ?? entry.finding.result}
                    </Badge>
                  )}
                  {entry.finding?.severity && (
                    <Badge variant={SEVERITY_VARIANTS[entry.finding.severity] ?? 'secondary'}>
                      {SEVERITY_LABELS[entry.finding.severity] ?? entry.finding.severity}
                    </Badge>
                  )}
                  <Badge variant={hasDecision ? 'success' : 'outline'}>
                    {hasDecision ? 'Sudah Diputuskan' : 'Belum Diputuskan'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Tanggal</p>
                    <p>{new Date(entry.event_date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Reported By</p>
                    <p>{entry.performed_by ?? '-'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p>{entry.description}</p>
                </div>

                {entry.finding?.recommendation && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Recommendation</p>
                    <p>{entry.finding.recommendation}</p>
                  </div>
                )}

                {entry.source && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Sumber</p>
                    <p>
                      {entry.source.type === 'task_part_check'
                        ? `PM Checklist — ${entry.source.task_title ?? `Task #${entry.source.task_id}`}`
                        : `Replacement Request #${entry.source.request_id}`}
                    </p>
                  </div>
                )}

                {entry.decision && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs font-medium text-muted-foreground">Decision</p>
                    <p className="font-medium">{DECISION_LABELS[entry.decision.decision] ?? entry.decision.decision}</p>
                    <p className="text-muted-foreground">
                      Oleh {entry.decision.decided_by ?? '-'} ·{' '}
                      {new Date(entry.decision.decided_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {entry.decision.notes && <p className="mt-1">{entry.decision.notes}</p>}

                    {entry.decision.resulting_task_id && (
                      <p className="mt-2 rounded bg-muted p-2 text-xs">
                        Follow-up Task #{entry.decision.resulting_task_id}
                        {entry.decision.resulting_task_title && `: ${entry.decision.resulting_task_title}`}
                      </p>
                    )}
                    {entry.decision.resulting_replacement_request_id && (
                      <p className="mt-2 rounded bg-muted p-2 text-xs">
                        Replacement Request #{entry.decision.resulting_replacement_request_id} · Type: Maintenance
                        {entry.decision.resulting_replacement_request_status &&
                          ` · Status: ${entry.decision.resulting_replacement_request_status}`}
                      </p>
                    )}
                  </div>
                )}

                {canCreateDecision && (
                  <Button
                    onClick={() => {
                      setErrorMessage(null)
                      setDecisionDialogOpen(true)
                    }}
                  >
                    Buat Decision
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DecisionFormDialog
        finding={entry}
        open={decisionDialogOpen}
        onOpenChange={(open) => {
          setDecisionDialogOpen(open)
          if (!open) setErrorMessage(null)
        }}
        onSubmit={(payload) => mutation.mutate(payload)}
        isSubmitting={mutation.isPending}
        errorMessage={errorMessage}
      />
    </>
  )
}
