import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchTaskLibrariesForEquipment } from '@/features/task-libraries/api'
import type { MaintenanceHistoryEntry } from '@/types/maintenance-history'
import type { CreateMaintenanceDecisionPayload, MaintenanceDecisionType } from '@/types/maintenance-decision'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const DECISION_OPTIONS: { value: MaintenanceDecisionType; label: string }[] = [
  { value: 'no_action', label: 'No Action' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'schedule_maintenance', label: 'Schedule Maintenance' },
  { value: 'replace_part', label: 'Replace Part' },
  { value: 'repair_part', label: 'Repair Part' },
  { value: 'escalate', label: 'Escalate' },
]

const DECISION_LABELS: Record<MaintenanceDecisionType, string> = Object.fromEntries(
  DECISION_OPTIONS.map((o) => [o.value, o.label]),
) as Record<MaintenanceDecisionType, string>

interface DecisionFormDialogProps {
  finding: MaintenanceHistoryEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: CreateMaintenanceDecisionPayload) => void
  isSubmitting: boolean
  errorMessage: string | null
}

/**
 * Only decision/notes/follow_up_* ever leave this form — see
 * features/findings/api.ts. equipment/part shown here are read-only,
 * sourced straight from the Finding, never editable inputs.
 */
export function DecisionFormDialog({
  finding,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: DecisionFormDialogProps) {
  const [decision, setDecision] = useState<MaintenanceDecisionType | ''>('')
  const [notes, setNotes] = useState('')
  const [wantsFollowUp, setWantsFollowUp] = useState(false)
  const [followUpSource, setFollowUpSource] = useState<'library' | 'adhoc'>('adhoc')
  const [taskLibraryId, setTaskLibraryId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [title, setTitle] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [quantity, setQuantity] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (open) {
      setDecision('')
      setNotes('')
      setWantsFollowUp(false)
      setFollowUpSource('adhoc')
      setTaskLibraryId('')
      setDueDate('')
      setTitle('')
      setFollowUpNotes('')
      setQuantity('')
      setConfirming(false)
    }
  }, [open, finding?.id])

  const { data: taskLibraries } = useQuery({
    queryKey: ['task-libraries', 'equipment', finding?.equipment_id],
    queryFn: () => fetchTaskLibrariesForEquipment(finding!.equipment_id!),
    enabled: !!finding?.equipment_id && (decision === 'monitor' || decision === 'schedule_maintenance'),
  })

  if (!finding) return null

  const needsFollowUpForm = decision === 'schedule_maintenance' || (decision === 'monitor' && wantsFollowUp)
  const followUpValid =
    !needsFollowUpForm ||
    (!!dueDate && (followUpSource === 'library' ? !!taskLibraryId : !!title.trim()))

  const canSubmit =
    !!decision &&
    (decision !== 'schedule_maintenance' || needsFollowUpForm) &&
    followUpValid

  function buildPayload(): CreateMaintenanceDecisionPayload {
    const payload: CreateMaintenanceDecisionPayload = {
      decision: decision as MaintenanceDecisionType,
      notes: notes.trim() || undefined,
    }

    if (needsFollowUpForm) {
      payload.follow_up_due_date = dueDate
      if (followUpSource === 'library') {
        payload.follow_up_task_library_id = Number(taskLibraryId)
      } else {
        payload.follow_up_title = title.trim()
      }
      if (followUpNotes.trim()) payload.follow_up_notes = followUpNotes.trim()
    }

    if (decision === 'replace_part' && quantity.trim()) {
      payload.follow_up_quantity = Number(quantity)
    }

    return payload
  }

  function handlePrimaryAction() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    onSubmit(buildPayload())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Maintenance Decision</DialogTitle>
          <DialogDescription className="line-clamp-2">{finding.description}</DialogDescription>
        </DialogHeader>

        {!confirming ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(value) => setDecision((value as MaintenanceDecisionType) ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih keputusan..." />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decision-notes">Catatan (opsional)</Label>
              <Textarea id="decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {decision === 'monitor' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={wantsFollowUp}
                  onChange={(e) => setWantsFollowUp(e.target.checked)}
                  className="size-4"
                />
                Buat follow-up Task
              </label>
            )}

            {needsFollowUpForm && (
              <div className="flex flex-col gap-3 rounded-md border p-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Sumber Follow-up</Label>
                  <Select value={followUpSource} onValueChange={(v) => setFollowUpSource((v as 'library' | 'adhoc') ?? 'adhoc')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="library">Task Library</SelectItem>
                      <SelectItem value="adhoc">Ad-hoc Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {followUpSource === 'library' ? (
                  <div className="flex flex-col gap-1.5">
                    <Label>Task Library</Label>
                    <Select value={taskLibraryId} onValueChange={(v) => setTaskLibraryId(v ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Task Library..." />
                      </SelectTrigger>
                      <SelectContent>
                        {taskLibraries?.length ? (
                          taskLibraries.map((library) => (
                            <SelectItem key={library.id} value={String(library.id)}>
                              {library.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            Tidak ada Task Library untuk equipment ini
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="followup-title">Judul Task</Label>
                    <Input id="followup-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="followup-due-date">Due Date</Label>
                  <Input
                    id="followup-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="followup-notes">Catatan Follow-up (opsional)</Label>
                  <Textarea
                    id="followup-notes"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {decision === 'replace_part' && (
              <div className="flex flex-col gap-3 rounded-md border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <Label>Part</Label>
                    <p className="text-sm text-muted-foreground">{finding.part ?? '-'}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Equipment</Label>
                    <p className="text-sm text-muted-foreground">{finding.equipment ?? '-'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="replace-quantity">Quantity</Label>
                  <Input
                    id="replace-quantity"
                    type="number"
                    min={1}
                    placeholder="Default: sesuai rencana checklist"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tidak boleh melebihi jumlah unit aktif yang saat ini terpasang — divalidasi oleh sistem saat
                    disimpan.
                  </p>
                </div>
                <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  Permintaan penggantian akan masuk ke Approval Board (belum langsung disetujui).
                </p>
              </div>
            )}

            {decision === 'repair_part' && (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                Keputusan repair dicatat. Eksekusi repair dilakukan melalui Repair Board.
              </p>
            )}

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Finding</p>
              <p className="mb-2">{finding.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Result: {finding.finding?.result}</span>
                <span>Severity: {finding.finding?.severity ?? '-'}</span>
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground">Decision</p>
              <p>{DECISION_LABELS[decision as MaintenanceDecisionType]}</p>
              {notes && <p className="mt-1 text-muted-foreground">Catatan: {notes}</p>}
              {decision === 'replace_part' && <p className="mt-1">Quantity: {quantity || '(default)'}</p>}
              {needsFollowUpForm && (
                <p className="mt-1">
                  Follow-up: {followUpSource === 'library' ? 'Task Library' : `Ad-hoc — ${title}`} · Due{' '}
                  {dueDate}
                </p>
              )}
            </div>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        )}

        <DialogFooter>
          {confirming && (
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={isSubmitting}>
              Kembali
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={handlePrimaryAction} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : confirming ? 'Konfirmasi & Simpan Decision' : 'Lanjutkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
