import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  MapPin,
  Play,
  Printer,
  ScanLine,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import { fetchPartInstallations } from '@/features/part-installations/api'
import { InstallationSlotPicker } from '@/features/part-installations/InstallationSlotPicker'
import { cancelTask, completeTask, startTask } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
import { useHasRole } from '@/stores/use-has-role'
import { dueDateBadge } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/tasks'
import { PartUnitQrScanDialog } from '@/components/PartUnitQrScanDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const statusLabels: Record<Task['status'], string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const sourceDotClass: Record<ReturnType<typeof taskSource>, string> = {
  library: 'bg-primary',
  lifetime: 'bg-warning',
  breakdown: 'bg-destructive',
}

const sourceBadgeClass: Record<ReturnType<typeof taskSource>, string> = {
  library: 'border-primary/20 bg-primary/5 text-primary',
  lifetime: 'border-warning/25 bg-warning/10 text-warning',
  breakdown: 'border-destructive/20 bg-destructive/5 text-destructive',
}

/** Task Library's own registered estimate — never derived from started_at/completed_at. */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours} jam ${rest} menit` : `${hours} jam`
}

interface ChecklistRowState {
  checked: boolean
  qty: string
  oldInstallationId: number | null
  picking: boolean
  /** "Part Passport" — the unit identified by the QR scan, sent as part_unit_id on completion. */
  partUnitId: number | null
  scannedUnitCode: string | null
  scanningUnit: boolean
}

interface ChecklistItemRowState {
  /** null until the technician explicitly picks Baik/Tidak — never defaulted, since condition_ok is required on submit. */
  conditionOk: boolean | null
  notes: string
}

interface WoCardProps {
  task: Task
  invalidateKey: unknown[]
}

/**
 * One WO as a self-contained card — no more modal for completion. A part
 * check is a checkbox (green once ticked) with a quick quantity field; it
 * submits with old_installation_id picked automatically (or via
 * InstallationSlotPicker when ambiguous) and part_unit_id null, so
 * TaskService::completeChecklist() treats it as "new part off the shelf" —
 * UNLESS the part is a "Part Passport" one (`check.has_passport`), in which
 * case checking the box opens PartUnitQrScanDialog first: the technician
 * scans the physical unit's QR, and that unit's id becomes part_unit_id,
 * so completeChecklist() reuses that exact unit instead of auto-picking.
 */
export function WoCard({ task, invalidateKey }: WoCardProps) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const canClaim = useHasRole(['engineer', 'supervisor', 'superadmin'])
  const isMine = task.assigned_to === currentUserId
  const canAct = isMine || (task.assigned_to === null && canClaim)
  const isDone = task.status === 'completed' || task.status === 'cancelled'
  const source = taskSource(task)
  const dueBadge = dueDateBadge(task.due_date)

  const [rows, setRows] = useState<Record<number, ChecklistRowState>>({})
  const [itemRows, setItemRows] = useState<Record<number, ChecklistItemRowState>>({})
  const [isExpanded, setIsExpanded] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [keterangan, setKeterangan] = useState('')

  const { data: installations } = useQuery({
    queryKey: ['part-installations', task.equipment_id],
    queryFn: () => fetchPartInstallations(task.equipment_id),
  })

  /**
   * Candidates for one checklist row's picker — active installations of
   * that part, minus whichever ones a *sibling* row (same part_id, a
   * different address on the same task — see PmSchedulingService::
   * schedule()'s one-row-per-unit split) has already claimed in the
   * current in-progress edit, so two rows can't both point at the same
   * installation.
   */
  function activeInstallationsFor(check: { id: number; part_id: number }) {
    const claimedBySiblings = new Set(
      (task.part_checks ?? [])
        .filter((c) => c.id !== check.id && c.part_id === check.part_id)
        .map((c) => rows[c.id]?.oldInstallationId)
        .filter((id): id is number => id != null),
    )
    return (installations ?? []).filter(
      (installation) =>
        installation.part_id === check.part_id && installation.is_active && !claimedBySiblings.has(installation.id),
    )
  }

  useEffect(() => {
    const next: Record<number, ChecklistRowState> = {}
    for (const check of task.part_checks ?? []) {
      next[check.id] = {
        checked: check.is_replaced ?? false,
        qty: String(check.quantity_used ?? check.quantity_planned),
        oldInstallationId: null,
        picking: false,
        partUnitId: null,
        scannedUnitCode: null,
        scanningUnit: false,
      }
    }
    setRows(next)

    const nextItems: Record<number, ChecklistItemRowState> = {}
    for (const item of task.checklist_items ?? []) {
      nextItems[item.id] = { conditionOk: item.condition_ok, notes: item.notes ?? '' }
    }
    setItemRows(nextItems)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status])

  function reportError(error: unknown, fallback: string) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
    toast.error(message)
  }

  const startMutation = useMutation({
    mutationFn: () => startTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO dimulai.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal memulai WO.'),
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO dibatalkan.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan WO.'),
  })

  const hasChecklist = (task.part_checks?.length ?? 0) > 0
  const partChecks = task.part_checks ?? []
  const hasChecklistItems = (task.checklist_items?.length ?? 0) > 0
  const allItemsDecided = (task.checklist_items ?? []).every((item) => itemRows[item.id]?.conditionOk != null)
  const actionableChecks = partChecks.filter(
    (check) =>
      check.task_checklist_item_id == null ||
      itemRows[check.task_checklist_item_id]?.conditionOk === false,
  )
  const legacyChecks = partChecks.filter((check) => check.task_checklist_item_id == null)
  const anyNotReplaced = actionableChecks.some((check) => !(rows[check.id]?.checked ?? false))
  const keteranganRequired = hasChecklist && anyNotReplaced

  function updateCondition(itemId: number, conditionOk: boolean) {
    setItemRows((prev) => {
      const current = prev[itemId] ?? { conditionOk: null, notes: '' }
      return {
        ...prev,
        [itemId]: { ...current, conditionOk, notes: conditionOk ? '' : current.notes },
      }
    })

    if (conditionOk) {
      const relatedCheckIds = partChecks
        .filter((check) => check.task_checklist_item_id === itemId)
        .map((check) => check.id)
      setRows((prev) => {
        const next = { ...prev }
        relatedCheckIds.forEach((id) => delete next[id])
        return next
      })
    }
  }

  const completeMutation = useMutation({
    mutationFn: (notes: string) => {
      const checklistItems = hasChecklistItems
        ? (task.checklist_items ?? []).map((item) => ({
            id: item.id,
            condition_ok: itemRows[item.id]?.conditionOk ?? false,
            notes: itemRows[item.id]?.notes || undefined,
          }))
        : undefined

      return hasChecklist
        ? completeTask(task.id, {
            notes: notes || undefined,
            checks: (task.part_checks ?? []).map((check) => {
              const row = rows[check.id]
              const conditionIsGood =
                check.task_checklist_item_id != null &&
                itemRows[check.task_checklist_item_id]?.conditionOk === true
              const checked = !conditionIsGood && (row?.checked ?? false)
              return {
                id: check.id,
                part_id: check.part_id,
                is_replaced: checked,
                quantity_used: checked ? Number(row?.qty || check.quantity_planned) : null,
                reason: checked
                  ? null
                  : itemRows[check.task_checklist_item_id ?? -1]?.conditionOk === true
                    ? 'Kondisi baik, tidak perlu diganti.'
                    : notes,
                old_installation_id: checked ? (row?.oldInstallationId ?? null) : null,
                part_unit_id: checked ? (row?.partUnitId ?? null) : null,
              }
            }),
            checklist_items: checklistItems,
          })
        : completeTask(task.id, {
            notes: notes || undefined,
            part_stock_id: task.part_stock_id ?? null,
            quantity_used: task.quantity_used ?? null,
            checklist_items: checklistItems,
          })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey })
      toast.success('WO berhasil diselesaikan.')
      setCompleteDialogOpen(false)
      setKeterangan('')
    },
    onError: (error: unknown) => reportError(error, 'Gagal menyelesaikan WO.'),
  })

  function renderPartChecks(checks: NonNullable<Task['part_checks']>, title: string) {
    if (checks.length === 0) return null

    return (
      <div className="order-3 flex flex-col gap-1.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
        {checks.map((check) => {
          const row = rows[check.id] ?? {
            checked: false,
            qty: String(check.quantity_planned),
            oldInstallationId: null,
            picking: false,
            partUnitId: null,
            scannedUnitCode: null,
            scanningUnit: false,
          }
          const activeSamePart = activeInstallationsFor(check)

          function resolveOldInstallation(): number | null {
            return activeSamePart[0]?.id ?? null
          }

          function afterOldInstallationResolved(oldInstallationId: number | null) {
            if (check.has_passport) {
              setRows((prev) => ({
                ...prev,
                [check.id]: { ...row, picking: false, oldInstallationId, scanningUnit: true },
              }))
              return
            }
            setRows((prev) => ({
              ...prev,
              [check.id]: { ...row, picking: false, checked: true, oldInstallationId },
            }))
          }

          return (
            <div
              key={check.id}
              className={cn(
                'flex flex-col gap-2 rounded-md border border-l-4 border-l-muted-foreground/20 bg-background p-2 transition-colors',
                row.checked && 'border-success/30 border-l-success bg-success/5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <label className={cn('flex min-w-0 items-center gap-2 text-sm', canAct && !isDone && 'cursor-pointer')}>
                  <Checkbox
                    checked={row.checked}
                    disabled={!canAct || isDone}
                    onCheckedChange={(value) => {
                      if (value !== true) {
                        setRows((prev) => ({
                          ...prev,
                          [check.id]: {
                            ...row,
                            checked: false,
                            oldInstallationId: null,
                            picking: false,
                            partUnitId: null,
                            scannedUnitCode: null,
                            scanningUnit: false,
                          },
                        }))
                        return
                      }

                      if (activeSamePart.length > 1) {
                        setRows((prev) => ({ ...prev, [check.id]: { ...row, picking: true } }))
                        return
                      }

                      afterOldInstallationResolved(resolveOldInstallation())
                    }}
                  />
                  <span className="min-w-0 truncate">
                    {check.part_name ?? `Part #${check.part_id}`}{' '}
                    <span className="font-mono text-xs text-muted-foreground">({check.item_master_no})</span>
                  </span>
                  {check.has_passport && (
                    <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                      <ScanLine className="size-3" />
                      Passport
                    </Badge>
                  )}
                </label>
                {row.checked && check.quantity_planned > 1 && (
                  <Input
                    type="number"
                    min={1}
                    disabled={!canAct || isDone}
                    className="h-7 w-16 shrink-0"
                    value={row.qty}
                    onChange={(e) => setRows((prev) => ({ ...prev, [check.id]: { ...row, qty: e.target.value } }))}
                  />
                )}
              </div>
              {row.picking && (
                <div className="flex flex-col gap-1 pl-6">
                  <p className="text-[11px] text-muted-foreground">
                    Ada {activeSamePart.length} unit terpasang — pilih yang diganti:
                  </p>
                  <InstallationSlotPicker
                    installations={activeSamePart}
                    onSelect={(installation) => afterOldInstallationResolved(installation.id)}
                  />
                </div>
              )}
              {row.checked && check.has_passport && (
                <div className="flex items-center justify-between gap-2 pl-6 text-[11px] text-success">
                  <span>✓ Unit {row.scannedUnitCode} dipindai</span>
                  {!isDone && (
                    <button
                      type="button"
                      className="text-muted-foreground underline underline-offset-2"
                      onClick={() => setRows((prev) => ({ ...prev, [check.id]: { ...row, scanningUnit: true } }))}
                    >
                      Scan Ulang
                    </button>
                  )}
                </div>
              )}
              {row.scanningUnit && (
                <PartUnitQrScanDialog
                  open
                  onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                      setRows((prev) => ({
                        ...prev,
                        [check.id]: {
                          ...row,
                          scanningUnit: false,
                          checked: row.partUnitId != null,
                        },
                      }))
                    }
                  }}
                  expectedPartId={check.part_id}
                  partName={check.part_name ?? `Part #${check.part_id}`}
                  onScanned={(unit) =>
                    setRows((prev) => ({
                      ...prev,
                      [check.id]: {
                        ...row,
                        scanningUnit: false,
                        checked: true,
                        partUnitId: unit.id,
                        scannedUnitCode: unit.unit_code,
                      },
                    }))
                  }
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
              task.status === 'in_progress'
                ? 'animate-pulse bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-primary/10 text-primary',
            )}
            title={task.status === 'in_progress' ? statusLabels.in_progress : undefined}
          >
            <Wrench
              className={cn('size-4', task.status === 'in_progress' && 'animate-pulse')}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">WO #{task.id}</span>
              <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px]', sourceBadgeClass[source])}>
                <span className={cn('size-1.5 rounded-full', sourceDotClass[source])} />
                {taskSourceLabel[source]}
              </Badge>
            </div>
            <p className="truncate text-sm leading-snug font-semibold sm:text-base">{task.title}</p>
            <p className="mt-1 flex min-w-0 items-start gap-1 text-xs leading-relaxed text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 whitespace-normal break-words">
                {[task.line_name, task.machine_name, task.equipment_name].filter(Boolean).join(' › ') || 'Lokasi belum tersedia'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.status !== 'in_progress' && (
            <Badge
              variant={
                task.status === 'completed'
                  ? 'success'
                  : task.is_overdue && !dueBadge
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {task.is_overdue && !dueBadge ? 'Terlambat' : statusLabels[task.status]}
            </Badge>
          )}
          {task.status === 'in_progress' && task.is_overdue && !dueBadge && (
            <Badge variant="destructive">Terlambat</Badge>
          )}
          {task.task_library_id && (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              aria-label="Cetak checklist WO"
              title="Cetak checklist WO"
              render={<Link to={`/pm/tasks/${task.id}/print`} />}
            >
              <Printer />
            </Button>
          )}
        </div>
      </div>

      <div className={cn('flex items-center justify-between gap-2 border-t pt-2.5', !dueBadge && 'justify-end')}>
        {dueBadge && (
          <span className={cn('flex items-center gap-1.5 text-xs', dueBadge.variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')}>
            <CalendarClock className="size-3.5" />
            {dueBadge.label}
          </span>
        )}
        <Button
          size="sm"
          variant={isExpanded ? 'ghost' : 'default'}
          className="h-8 rounded-lg"
          aria-expanded={isExpanded}
          aria-controls={`wo-details-${task.id}`}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          {isExpanded ? <ChevronUp /> : canAct ? <Play /> : <ChevronDown />}
          {isExpanded ? 'Tutup' : canAct ? 'Kerjakan' : 'Lihat detail'}
        </Button>
      </div>

      {isExpanded && (
        <div id={`wo-details-${task.id}`} className="flex flex-col gap-3 border-t pt-3">
          {task.cause && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Penyebab:</span> {task.cause}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-xl bg-muted/40 px-3 py-2.5 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <UserRound className="size-3.5" />
              PIC <span className="font-medium text-foreground">{task.assignee_name ?? 'Belum dikerjakan'}</span>
            </span>
            {!!task.estimated_duration_minutes && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock3 className="size-3.5" />
                Estimasi <span className="font-medium text-foreground">{formatDuration(task.estimated_duration_minutes)}</span>
              </span>
            )}
            {isDone && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Jatuh tempo <span className="font-medium text-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID') : '-'}</span>
              </span>
            )}
          </div>
      {legacyChecks.length > 0 && (
        <div className="order-2 flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Wrench className="size-3.5" /> Ganti Part
          </p>
          {legacyChecks.map((check) => {
            const row = rows[check.id] ?? {
              checked: false,
              qty: String(check.quantity_planned),
              oldInstallationId: null,
              picking: false,
              partUnitId: null,
              scannedUnitCode: null,
              scanningUnit: false,
            }
            const activeSamePart = activeInstallationsFor(check)

            function resolveOldInstallation(): number | null {
              return activeSamePart[0]?.id ?? null
            }

            function afterOldInstallationResolved(oldInstallationId: number | null) {
              if (check.has_passport) {
                setRows((prev) => ({
                  ...prev,
                  [check.id]: { ...row, picking: false, oldInstallationId, scanningUnit: true },
                }))
                return
              }
              setRows((prev) => ({
                ...prev,
                [check.id]: { ...row, picking: false, checked: true, oldInstallationId },
              }))
            }

            return (
              <div
                key={check.id}
                className={cn(
                  'flex flex-col gap-2 rounded-md border p-2 transition-colors',
                  row.checked && 'border-success bg-success/10',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className={cn('flex min-w-0 items-center gap-2 text-sm', canAct && !isDone && 'cursor-pointer')}>
                    <Checkbox
                      checked={row.checked}
                      disabled={!canAct || isDone}
                      onCheckedChange={(value) => {
                        if (value !== true) {
                          setRows((prev) => ({
                            ...prev,
                            [check.id]: {
                              ...row,
                              checked: false,
                              oldInstallationId: null,
                              picking: false,
                              partUnitId: null,
                              scannedUnitCode: null,
                              scanningUnit: false,
                            },
                          }))
                          return
                        }

                        if (activeSamePart.length > 1) {
                          setRows((prev) => ({ ...prev, [check.id]: { ...row, picking: true } }))
                          return
                        }

                        afterOldInstallationResolved(resolveOldInstallation())
                      }}
                    />
                    <span className="min-w-0 truncate">
                      {check.part_name ?? `Part #${check.part_id}`}{' '}
                      <span className="font-mono text-xs text-muted-foreground">({check.item_master_no})</span>
                    </span>
                    {check.has_passport && (
                      <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                        <ScanLine className="size-3" />
                        Passport
                      </Badge>
                    )}
                  </label>
                  {row.checked && check.quantity_planned > 1 && (
                    <Input
                      type="number"
                      min={1}
                      disabled={!canAct || isDone}
                      className="h-7 w-16 shrink-0"
                      value={row.qty}
                      onChange={(e) => setRows((prev) => ({ ...prev, [check.id]: { ...row, qty: e.target.value } }))}
                    />
                  )}
                </div>
                {row.picking && (
                  <div className="flex flex-col gap-1 pl-6">
                    <p className="text-[11px] text-muted-foreground">
                      Ada {activeSamePart.length} unit terpasang — pilih yang diganti:
                    </p>
                    <InstallationSlotPicker
                      installations={activeSamePart}
                      onSelect={(installation) => afterOldInstallationResolved(installation.id)}
                    />
                  </div>
                )}
                {row.checked && check.has_passport && (
                  <div className="flex items-center justify-between gap-2 pl-6 text-[11px] text-success">
                    <span>✓ Unit {row.scannedUnitCode} dipindai</span>
                    {!isDone && (
                      <button
                        type="button"
                        className="text-muted-foreground underline underline-offset-2"
                        onClick={() => setRows((prev) => ({ ...prev, [check.id]: { ...row, scanningUnit: true } }))}
                      >
                        Scan Ulang
                      </button>
                    )}
                  </div>
                )}
                {row.scanningUnit && (
                  <PartUnitQrScanDialog
                    open
                    onOpenChange={(nextOpen) => {
                      if (!nextOpen) {
                        setRows((prev) => ({
                          ...prev,
                          [check.id]: {
                            ...row,
                            scanningUnit: false,
                            checked: row.partUnitId != null,
                          },
                        }))
                      }
                    }}
                    expectedPartId={check.part_id}
                    partName={check.part_name ?? `Part #${check.part_id}`}
                    onScanned={(unit) =>
                      setRows((prev) => ({
                        ...prev,
                        [check.id]: {
                          ...row,
                          scanningUnit: false,
                          checked: true,
                          partUnitId: unit.id,
                          scannedUnitCode: unit.unit_code,
                        },
                      }))
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasChecklistItems && (
        <div className="order-1 flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <ClipboardCheck className="size-3.5" /> Checklist Kondisi
          </p>
          {(task.checklist_items ?? []).map((item) => {
            const row = itemRows[item.id] ?? { conditionOk: null, notes: '' }
            return (
              <div
                key={item.id}
                className={cn(
                  'flex flex-col gap-2 rounded-md border border-l-4 border-l-muted-foreground/20 bg-background p-2 transition-colors',
                  row.conditionOk === true && 'border-success/30 border-l-success bg-success/5',
                  row.conditionOk === false && 'border-destructive/30 border-l-destructive bg-destructive/5',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{item.description}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={
                        row.conditionOk === true
                          ? 'border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success'
                          : ''
                      }
                      disabled={!canAct || isDone}
                      onClick={() => updateCondition(item.id, true)}
                    >
                      Baik
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={row.conditionOk === false ? 'destructive' : 'outline'}
                      disabled={!canAct || isDone}
                      onClick={() => updateCondition(item.id, false)}
                    >
                      Tidak
                    </Button>
                  </div>
                </div>
                {row.conditionOk === false && (
                  <Input
                    aria-label={`Tindak lanjut ${item.description}`}
                    placeholder="Tindak lanjut (mis. dibersihkan saja)"
                    disabled={!canAct || isDone}
                    className="h-8"
                    value={row.notes}
                    onChange={(e) => setItemRows((prev) => ({ ...prev, [item.id]: { ...row, notes: e.target.value } }))}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {(task.checklist_items ?? []).map((item) =>
        itemRows[item.id]?.conditionOk === false
          ? renderPartChecks(
              partChecks.filter((check) => check.task_checklist_item_id === item.id),
              `Part terkait: ${item.description}`,
            )
          : null,
      )}

      {canAct && !isDone && (
        <div className="order-4 flex justify-end gap-2 border-t pt-3">
          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Batal
          </Button>
          {task.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              Mulai
            </Button>
          )}
          <Button
            size="sm"
            disabled={hasChecklistItems && !allItemsDecided}
            title={hasChecklistItems && !allItemsDecided ? 'Isi Baik/Tidak untuk semua item checklist kondisi dulu' : undefined}
            onClick={() => setCompleteDialogOpen(true)}
          >
            Selesai
          </Button>
        </div>
      )}
        </div>
      )}

      <Dialog
        open={completeDialogOpen}
        onOpenChange={(next) => {
          setCompleteDialogOpen(next)
          if (!next) setKeterangan('')
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Selesaikan WO</DialogTitle>
            <DialogDescription>
              {keteranganRequired
                ? 'Ada part yang tidak diganti — isi keterangan alasannya.'
                : 'Tambahkan keterangan kalau perlu, atau langsung simpan.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wo-keterangan">Keterangan</Label>
            <Textarea
              id="wo-keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={keteranganRequired ? 'Misal: part masih dalam kondisi baik' : 'Catatan (opsional)'}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCompleteDialogOpen(false)
                setKeterangan('')
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => completeMutation.mutate(keterangan)}
              disabled={completeMutation.isPending || (keteranganRequired && !keterangan.trim())}
            >
              {completeMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
