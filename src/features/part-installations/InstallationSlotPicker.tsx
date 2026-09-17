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
 * A/B/C label is computed here purely for display (oldest install = A),
 * never stored: there's no persistent per-equipment "slot" concept in the
 * data, just installation records ordered by installed_at. Shared between
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
      {sorted.map((installation, index) => (
        <Button
          key={installation.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(installation)}
          className="h-auto flex-col items-start gap-0 py-1.5"
        >
          <span className="font-medium">Unit {String.fromCharCode(65 + index)}</span>
          <span className="text-[10px] font-normal text-muted-foreground">
            {installation.age_in_days} hari · {installation.percent_used ?? '-'}% terpakai
          </span>
        </Button>
      ))}
    </div>
  )
}
