import type { PartInstallation } from '@/types/relations'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface InstallationMultiSelectPickerProps {
  installations: PartInstallation[]
  requiredCount: number
  selectedIds: number[]
  onToggle: (id: number) => void
  onConfirm: () => void
  disabled?: boolean
}

/**
 * Breakdown replacement for quantity_used > 1 — the approver must tap
 * exactly `requiredCount` of the currently-installed units (A/B/C, via the
 * same slot_label every other installation picker uses) before "Setujui"
 * becomes clickable. Unlike the quantity_used = 1 ambiguous case (where
 * tapping the one unit both selects and approves in the same motion), a
 * multi-unit pick needs its own explicit confirm step since selection
 * happens over several taps.
 */
export function InstallationMultiSelectPicker({
  installations,
  requiredCount,
  selectedIds,
  onToggle,
  onConfirm,
  disabled,
}: InstallationMultiSelectPickerProps) {
  const sorted = [...installations].sort(
    (a, b) => new Date(a.installed_at).getTime() - new Date(b.installed_at).getTime(),
  )

  return (
    <div className="flex flex-col items-end gap-1.5">
      <p className="text-[11px] text-muted-foreground">Pilih unit yang benar-benar akan diganti:</p>
      <div className="flex flex-wrap justify-end gap-1.5">
        {sorted.map((installation) => {
          const selected = selectedIds.includes(installation.id)
          return (
            <Button
              key={installation.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onToggle(installation.id)}
              className={cn(
                'h-auto flex-col items-start gap-0 py-1.5',
                selected && 'border-primary bg-primary/5',
              )}
            >
              <span className="font-medium">Unit {installation.slot_label ?? '?'}</span>
              <span className="text-[10px] font-normal text-muted-foreground">
                {installation.age_in_days} hari · {installation.percent_used ?? '-'}% terpakai
              </span>
            </Button>
          )
        })}
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {selectedIds.length} dari {requiredCount} dipilih
      </p>
      <Button size="sm" disabled={disabled || selectedIds.length !== requiredCount} onClick={onConfirm}>
        Setujui
      </Button>
    </div>
  )
}
