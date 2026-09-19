import { useQueries, useQuery } from '@tanstack/react-query'
import { NotebookPen, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { fetchEquipmentList } from '@/features/equipment/api'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines } from '@/features/machines/api'
import { fetchTaskLibrariesForBranch } from '@/features/task-libraries/api'
import { TaskLibraryList } from '@/features/task-libraries/TaskLibraryList'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Line -> Machine -> Equipment browser for managing Task Library recipes —
 * rendered by the standalone TaskLibraryPage (`/task-libraries`). Briefly
 * lived embedded as a tab inside MaintenancePage's toggle; split back out
 * into its own nav item since Library recipes are edited far less often
 * than the Kalender/WO/Repair Part views are checked day-to-day.
 */
export function TaskLibraryBrowser() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const selectedLineId = searchParams.get('line') ? Number(searchParams.get('line')) : null
  const selectedEquipmentId = searchParams.get('equipment') ? Number(searchParams.get('equipment')) : null

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['lines', activeBranchId],
    queryFn: () => fetchLines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: machines, isLoading: machinesLoading } = useQuery({
    queryKey: ['machines', selectedLineId],
    queryFn: () => fetchMachines(selectedLineId!),
    enabled: !!selectedLineId,
  })

  const equipmentQueries = useQueries({
    queries: (machines ?? []).map((machine) => ({
      queryKey: ['equipment', machine.id],
      queryFn: () => fetchEquipmentList(machine.id),
    })),
  })

  const { data: branchLibraries } = useQuery({
    queryKey: ['task-libraries', 'branch', activeBranchId],
    queryFn: () => fetchTaskLibrariesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })
  const taskCountByEquipment = useMemo(() => {
    const counts = new Map<number, number>()
    for (const library of branchLibraries ?? []) {
      counts.set(library.equipment_id, (counts.get(library.equipment_id) ?? 0) + 1)
    }
    return counts
  }, [branchLibraries])

  const term = search.trim().toLowerCase()

  /**
   * Merges into whatever params are already there (namely
   * MaintenancePage's `tab`) instead of replacing the whole query string —
   * this browser is only ever embedded inside that page's toggle now, so a
   * plain `setSearchParams({...})` here would silently wipe `tab` out from
   * under it.
   */
  const mergeSearchParams = useCallback(
    (patch: Record<string, string | null>, options?: { replace?: boolean }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key)
          else next.set(key, value)
        }
        return next
      }, options)
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (!selectedLineId && lines && lines.length > 0) {
      mergeSearchParams({ line: String(lines[0].id) }, { replace: true })
    }
  }, [selectedLineId, lines, mergeSearchParams])

  function selectLine(lineId: number) {
    setSearch('')
    mergeSearchParams({ line: String(lineId), equipment: null })
  }

  function selectEquipment(equipmentId: number) {
    mergeSearchParams({ line: String(selectedLineId), equipment: String(equipmentId) })
  }

  const selectedEquipment = equipmentQueries
    .flatMap((query) => query.data ?? [])
    .find((equipment) => equipment.id === selectedEquipmentId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col overflow-hidden rounded-lg border">
        <div className="border-b p-1">
          <Select
            value={selectedLineId ? String(selectedLineId) : ''}
            onValueChange={(value) => selectLine(Number(value))}
            disabled={linesLoading}
          >
            <SelectTrigger className="w-full border-0 shadow-none focus-visible:ring-0">
              <SelectValue placeholder={linesLoading ? 'Memuat...' : 'Pilih Line'} />
            </SelectTrigger>
            <SelectContent>
              {lines?.map((line) => (
                <SelectItem key={line.id} value={String(line.id)}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative border-b">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari sub system..."
            disabled={!selectedLineId}
            className="h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
        </div>

        <div className="max-h-[32rem] overflow-y-auto p-3">
          {!selectedLineId ? (
            <p className="p-2 text-sm text-muted-foreground">Pilih line terlebih dahulu.</p>
          ) : machinesLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : machines?.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">Belum ada mesin di line ini.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {machines?.map((machine, index) => {
                const equipmentList = (equipmentQueries[index]?.data ?? []).filter(
                  (equipment) => !term || `${equipment.name} ${equipment.code} ${machine.name}`.toLowerCase().includes(term),
                )
                const isLoadingEquipment = equipmentQueries[index]?.isLoading

                if (!isLoadingEquipment && equipmentList.length === 0) return null

                return (
                  <div key={machine.id} className="flex flex-col gap-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{machine.name}</p>
                    {isLoadingEquipment ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {equipmentList.map((equipment) => {
                          const taskCount = taskCountByEquipment.get(equipment.id) ?? 0
                          return (
                            <button
                              key={equipment.id}
                              type="button"
                              onClick={() => selectEquipment(equipment.id)}
                              className={cn(
                                'relative flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted',
                                equipment.id === selectedEquipmentId && 'border-primary bg-primary/5',
                              )}
                            >
                              <span className="absolute top-1.5 right-2 text-[10px] text-muted-foreground">
                                {taskCount} Task
                              </span>
                              <span
                                className={cn(
                                  'pr-10 text-sm font-medium',
                                  equipment.id === selectedEquipmentId && 'text-primary',
                                )}
                              >
                                {equipment.name}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {equipment.category ?? equipment.code}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[38rem] overflow-y-auto rounded-lg border p-4">
        {selectedEquipment ? (
          <TaskLibraryList
            key={selectedEquipment.id}
            equipmentId={selectedEquipment.id}
            title={`Task Library — ${selectedEquipment.name}`}
          />
        ) : (
          <EmptyState
            icon={NotebookPen}
            title="Pilih sub system"
            description="Pilih salah satu equipment di kiri untuk lihat dan kelola Task Library-nya."
          />
        )}
      </div>
    </div>
  )
}
