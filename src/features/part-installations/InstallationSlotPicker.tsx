import type { PartInstallation } from '@/types/relations'
import { Button } from '@/components/ui/button'

interface InstallationSlotPickerProps {
  installations: PartInstallation[]
  onSelect: (installation: PartInstallation) => void
  disabled?: boolean
}

/**
 * Lets someone pick which currently-installed unit of a part is the one
 * being replaced, when an equipment has more than one active at once — the
 * A/B/C address (`slot_label`) is a real, persistent field on each
 * PartInstallation, scoped to that one equipment+part pair (not
 * PartUnit.unit_code, which is a global running count across the whole
 * part catalog and not fit to show as a stable "address"). It survives a
 * replacement — the new installation inherits the old one's slot_label —
 * so "Unit A" means the same position over time, visible wherever
 * installed parts are listed, not just inside this picker. Shared between
 * the Workspace WO checklist and the breakdown approval board, since both
 * hit the exact same "which installation is this closing out" ambiguity
 * (see PartLifecycleService::resolveActiveInstallation()).
 */
export function InstallationSlotPicker({ installations, onSelect, disabled }: InstallationSlotPickerProps) {
  const sorted = [...installations].sort(
    (a, b) => new Date(a.installed_at).getTime() - new Date(b.installed_at).getTime(),
  )

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((installation) => (
        <Button
          key={installation.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(installation)}
          className="h-auto flex-col items-start gap-0 py-1.5"
        >
          <span className="font-medium">Unit {installation.slot_label ?? '?'}</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {installation.age_in_days} hari · {installation.percent_used ?? '-'}% terpakai
          </span>
        </Button>
      ))}
    </div>
  )
}
