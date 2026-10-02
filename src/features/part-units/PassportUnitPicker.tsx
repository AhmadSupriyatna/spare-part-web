import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { PartUnit } from '@/types/relations'

interface PassportUnitPickerProps {
  units: PartUnit[]
  loading: boolean
  excludedUnitIds: Set<number>
  onToggleUnit: (unitId: number) => void
}

interface Batch {
  key: string
  label: string
  units: PartUnit[]
}

function batchLabel(arrivedAt: string | null): { key: string; label: string } {
  if (!arrivedAt) return { key: 'unknown', label: 'Tanpa tanggal kedatangan' }
  const date = new Date(arrivedAt)
  const key = date.toISOString().slice(0, 10)
  return { key, label: date.toLocaleDateString('id-ID', { dateStyle: 'full' }) }
}

/**
 * Groups a Passport part's units by Stock In date ("batch") so reprinting a
 * label is still fast once a part has dozens of units — pick a batch first
 * (newest on top, since that's almost always the one someone just printed
 * and lost a label for), then the specific unit inside it, instead of
 * scanning one long flat list. A unit already `scrapped` is left out
 * entirely — once a physical unit has been disposed of, there's nothing
 * left to put a reprinted label on.
 */
export function PassportUnitPicker({ units, loading, excludedUnitIds, onToggleUnit }: PassportUnitPickerProps) {
  const batches = useMemo(() => {
    const byKey = new Map<string, Batch>()
    units
      .filter((u) => u.status !== 'scrapped')
      .forEach((unit) => {
        const { key, label } = batchLabel(unit.arrived_at)
        if (!byKey.has(key)) byKey.set(key, { key, label, units: [] })
        byKey.get(key)!.units.push(unit)
      })
    return Array.from(byKey.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [units])

  if (loading) {
    return <p className="pl-1 text-xs text-muted-foreground">Memuat unit...</p>
  }

  if (batches.length === 0) {
    return <p className="pl-1 text-xs text-muted-foreground">Belum ada unit terdaftar — Stock In dulu.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {batches.map((batch, index) => {
        const selectedInBatch = batch.units.filter((u) => !excludedUnitIds.has(u.id))
        return (
          <details key={batch.key} open={index === 0} className="rounded border border-neutral-200">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-xs font-medium">
              <span>{batch.label}</span>
              <span className="shrink-0 text-muted-foreground">
                {selectedInBatch.length}/{batch.units.length} unit dipilih
              </span>
            </summary>
            <div className="flex flex-col gap-1 border-t px-2 py-1.5">
              {batch.units.map((unit) => (
                <label key={unit.id} className="flex items-center gap-2 text-xs">
                  <Checkbox checked={!excludedUnitIds.has(unit.id)} onCheckedChange={() => onToggleUnit(unit.id)} />
                  <span className="font-mono">{unit.unit_code ?? `#${unit.id}`}</span>
                </label>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
