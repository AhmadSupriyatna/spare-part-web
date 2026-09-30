import { useMemo, useState } from 'react'
import { CalendarPlus, Search } from 'lucide-react'
import type { Fp3Request } from '@/features/fp3/api'
import type { TaskLibrary } from '@/types/pm'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface UnscheduledWorkPanelProps {
  libraries: TaskLibrary[] | undefined
  fp3Requests: Fp3Request[] | undefined
  isLoading: boolean
  onDragLibraryStart: (library: TaskLibrary) => void
  onDragFp3Start: (fp3: Fp3Request) => void
  onDragEnd: () => void
}

/**
 * Replaces the old "WO yang Akan Datang" list — a day cell already shows
 * every task/FP3 that already HAS a due_date, so a second read-only list of
 * the same thing was redundant. This shows the opposite: work with no
 * schedule yet, which never appears on the grid at all otherwise —
 * "Manual" (schedule_type: none) Task Library recipes, always available to
 * re-run, and FP3 requests nobody's scheduled or claimed yet — each
 * draggable onto a calendar day (see MaintenancePage's handleDrop) or, on
 * touch devices with no drag support, still visible here to schedule from
 * the "Jadwalkan"/"Terima" actions elsewhere.
 */
export function UnscheduledWorkPanel({
  libraries,
  fp3Requests,
  isLoading,
  onDragLibraryStart,
  onDragFp3Start,
  onDragEnd,
}: UnscheduledWorkPanelProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()

  const manualLibraries = useMemo(() => (libraries ?? []).filter((l) => l.schedule_type === null), [libraries])
  const unscheduledFp3 = useMemo(
    () => (fp3Requests ?? []).filter((f) => f.status === 'pending' && !f.due_date),
    [fp3Requests],
  )

  const filteredLibraries = useMemo(() => {
    if (!term) return manualLibraries
    return manualLibraries.filter((l) =>
      [l.title, l.equipment_name, l.machine_name, l.line_name, ...l.parts.map((p) => p.part_name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [manualLibraries, term])

  const filteredFp3 = useMemo(() => {
    if (!term) return unscheduledFp3
    return unscheduledFp3.filter((f) =>
      [f.code, f.requester_name, f.department, f.description].join(' ').toLowerCase().includes(term),
    )
  }, [unscheduledFp3, term])

  const isEmpty = filteredLibraries.length === 0 && filteredFp3.length === 0

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div>
        <h2 className="text-sm font-medium">Pekerjaan Manual Belum Terjadwal</h2>
        <p className="text-xs text-muted-foreground">Seret ke tanggal di kalender untuk menjadwalkan.</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari task manual atau FP3..."
          className="h-8 pl-8 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState icon={CalendarPlus} title="Tidak ada" description="Tidak ada pekerjaan manual yang menunggu jadwal." />
      ) : (
        <div className="flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
          {filteredLibraries.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Task Manual</p>
              {filteredLibraries.map((library) => (
                <div
                  key={library.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    onDragLibraryStart(library)
                  }}
                  onDragEnd={onDragEnd}
                  className="flex cursor-grab flex-col gap-1 rounded-md border p-2.5 text-sm select-none hover:bg-muted active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{library.title}</span>
                    <Badge variant="default" className="shrink-0">
                      Task Library
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {library.equipment_name} · {library.machine_name} · {library.line_name}
                  </p>
                  {library.parts.length > 0 && (
                    <p className="truncate text-xs text-muted-foreground">
                      Part: {library.parts.map((p) => p.part_name).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredFp3.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">FP3</p>
              {filteredFp3.map((fp3) => (
                <div
                  key={fp3.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    onDragFp3Start(fp3)
                  }}
                  onDragEnd={onDragEnd}
                  className="flex cursor-grab flex-col gap-1 rounded-md border p-2.5 text-sm select-none hover:bg-muted active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{fp3.requester_name}</span>
                    <Badge variant="outline" className="shrink-0">
                      WO FP3
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {fp3.code} · {fp3.department}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{fp3.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
