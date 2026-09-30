import { useQueries, useQuery } from '@tanstack/react-query'
import { NotebookPen, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { fetchEquipmentList, fetchOutsideLineEquipment } from '@/features/equipment/api'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines, fetchOutsideLineMachines } from '@/features/machines/api'
import { fetchTaskLibrariesForBranch } from '@/features/task-libraries/api'
import { TaskLibraryList } from '@/features/task-libraries/TaskLibraryList'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function useTaskCountByEquipment(activeBranchId: number | null) {
  const { data: branchLibraries } = useQuery({
    queryKey: ['task-libraries', 'branch', activeBranchId],
    queryFn: () => fetchTaskLibrariesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  return useMemo(() => {
    const counts = new Map<number, number>()
    for (const library of branchLibraries ?? []) {
      counts.set(library.equipment_id, (counts.get(library.equipment_id) ?? 0) + 1)
    }
    return counts
  }, [branchLibraries])
}

/**
 * "Task Library" top-level page — split into "Line Produksi" (the original
 * Line -> Machine -> Equipment browser) and "Mesin & Asset Luar Line" (a
 * PM recipe couldn't be registered for equipment there at all before this
 * tab existed, since the browser only ever drove from fetchLines/
 * fetchMachines — even though the backend never cared which kind of
 * equipment it was).
 */
export function TaskLibraryBrowser() {
  return (
    <Tabs defaultValue="produksi">
      <TabsList>
        <TabsTrigger value="produksi">Line Produksi</TabsTrigger>
        <TabsTrigger value="non-produksi">Mesin & Asset Luar Line</TabsTrigger>
      </TabsList>
      <TabsContent value="produksi" className="mt-4">
        <ProductionTaskLibraryBrowser />
      </TabsContent>
      <TabsContent value="non-produksi" className="mt-4">
        <NonProductionTaskLibraryBrowser />
      </TabsContent>
    </Tabs>
  )
}

/** Line -> Machine -> Equipment browser for managing Task Library recipes — unchanged from before the tab split, just renamed. */
function ProductionTaskLibraryBrowser() {
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

  const taskCountByEquipment = useTaskCountByEquipment(activeBranchId)
  const term = search.trim().toLowerCase()

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
                        {equipmentList.map((equipment) => (
                          <EquipmentOption
                            key={equipment.id}
                            name={equipment.name}
                            subtitle={equipment.category ?? equipment.code}
                            taskCount={taskCountByEquipment.get(equipment.id) ?? 0}
                            isSelected={equipment.id === selectedEquipmentId}
                            onClick={() => selectEquipment(equipment.id)}
                          />
                        ))}
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

/**
 * Mesin Luar Line (each with its own Equipment sub-tree) plus Asset Tanpa
 * Mesin (fully standalone Equipment) — local selection state instead of URL
 * params, since this tab has no deep-linkable hierarchy the way Line ->
 * Machine does and keeping it separate avoids clashing with the Line tab's
 * own `line`/`equipment` params.
 */
function NonProductionTaskLibraryBrowser() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [search, setSearch] = useState('')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null)

  const { data: outsideLineMachines, isLoading: machinesLoading } = useQuery({
    queryKey: ['outside-line-machines', activeBranchId],
    queryFn: () => fetchOutsideLineMachines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const equipmentQueries = useQueries({
    queries: (outsideLineMachines ?? []).map((machine) => ({
      queryKey: ['equipment', machine.id],
      queryFn: () => fetchEquipmentList(machine.id),
    })),
  })

  const { data: standaloneEquipment, isLoading: standaloneLoading } = useQuery({
    queryKey: ['outside-line-equipment', activeBranchId],
    queryFn: () => fetchOutsideLineEquipment(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const taskCountByEquipment = useTaskCountByEquipment(activeBranchId)
  const term = search.trim().toLowerCase()

  const allEquipment = [...equipmentQueries.flatMap((q) => q.data ?? []), ...(standaloneEquipment ?? [])]
  const selectedEquipment = allEquipment.find((equipment) => equipment.id === selectedEquipmentId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  const filteredStandalone = (standaloneEquipment ?? []).filter(
    (equipment) => !term || `${equipment.name} ${equipment.code}`.toLowerCase().includes(term),
  )
  const isLoading = machinesLoading || standaloneLoading
  const isEmpty = !isLoading && (outsideLineMachines ?? []).length === 0 && (standaloneEquipment ?? []).length === 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col overflow-hidden rounded-lg border">
        <div className="relative border-b">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari mesin atau asset..."
            className="h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[32rem] overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : isEmpty ? (
            <p className="p-2 text-sm text-muted-foreground">Belum ada mesin atau asset luar line di plant ini.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {outsideLineMachines?.map((machine, index) => {
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
                        {equipmentList.map((equipment) => (
                          <EquipmentOption
                            key={equipment.id}
                            name={equipment.name}
                            subtitle={equipment.category ?? equipment.code}
                            taskCount={taskCountByEquipment.get(equipment.id) ?? 0}
                            isSelected={equipment.id === selectedEquipmentId}
                            onClick={() => setSelectedEquipmentId(equipment.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredStandalone.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Asset Tanpa Mesin</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {filteredStandalone.map((equipment) => (
                      <EquipmentOption
                        key={equipment.id}
                        name={equipment.name}
                        subtitle={equipment.category ?? equipment.code}
                        taskCount={taskCountByEquipment.get(equipment.id) ?? 0}
                        isSelected={equipment.id === selectedEquipmentId}
                        onClick={() => setSelectedEquipmentId(equipment.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
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
            title="Pilih mesin atau asset"
            description="Pilih salah satu mesin luar line atau asset di kiri untuk lihat dan kelola Task Library-nya."
          />
        )}
      </div>
    </div>
  )
}

function EquipmentOption({
  name,
  subtitle,
  taskCount,
  isSelected,
  onClick,
}: {
  name: string
  subtitle: string
  taskCount: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted',
        isSelected && 'border-primary bg-primary/5',
      )}
    >
      <span className="absolute top-1.5 right-2 text-[10px] text-muted-foreground">{taskCount} Task</span>
      <span className={cn('pr-10 text-sm font-medium', isSelected && 'text-primary')}>{name}</span>
      <span className="font-mono text-xs text-muted-foreground">{subtitle}</span>
    </button>
  )
}
