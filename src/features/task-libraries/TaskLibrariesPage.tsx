import { useQueries, useQuery } from '@tanstack/react-query'
import { NotebookPen } from 'lucide-react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { fetchEquipmentList } from '@/features/equipment/api'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines } from '@/features/machines/api'
import { TaskLibraryList } from '@/features/task-libraries/TaskLibraryList'
import { useBranchStore } from '@/stores/branch-store'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export function TaskLibrariesPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [searchParams, setSearchParams] = useSearchParams()

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

  // One equipment-list query per machine of the selected line, run in
  // parallel — there's no single "equipment for a whole line" endpoint, and
  // a line only ever has a handful of machines, so N small parallel queries
  // is simpler than adding a new backend endpoint just for this page.
  const equipmentQueries = useQueries({
    queries: (machines ?? []).map((machine) => ({
      queryKey: ['equipment', machine.id],
      queryFn: () => fetchEquipmentList(machine.id),
    })),
  })

  // Default to the first line once loaded, if nothing is selected via the URL yet.
  useEffect(() => {
    if (!selectedLineId && lines && lines.length > 0) {
      setSearchParams({ line: String(lines[0].id) }, { replace: true })
    }
  }, [selectedLineId, lines, setSearchParams])

  function selectLine(lineId: number) {
    setSearchParams({ line: String(lineId) })
  }

  function selectEquipment(equipmentId: number) {
    setSearchParams({ line: String(selectedLineId), equipment: String(equipmentId) })
  }

  const selectedEquipment = equipmentQueries
    .flatMap((query) => query.data ?? [])
    .find((equipment) => equipment.id === selectedEquipmentId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Task Library"
        description="Resep kegiatan PM (aktivitas + equipment + checklist part). Pilih line, lalu pilih equipment untuk kelola Task Library-nya."
      />

      <div className="sm:w-72">
        <Select
          value={selectedLineId ? String(selectedLineId) : ''}
          onValueChange={(value) => selectLine(Number(value))}
          disabled={linesLoading}
        >
          <SelectTrigger className="w-full">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-5">
          {machinesLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : machines?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada mesin di line ini.</p>
          ) : (
            machines?.map((machine, index) => {
              const equipmentList = equipmentQueries[index]?.data ?? []
              const isLoadingEquipment = equipmentQueries[index]?.isLoading

              return (
                <div key={machine.id} className="flex flex-col gap-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {machine.name}
                  </p>
                  {isLoadingEquipment ? (
                    <Skeleton className="h-16 w-full" />
                  ) : equipmentList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada equipment di mesin ini.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {equipmentList.map((equipment) => (
                        <button
                          key={equipment.id}
                          type="button"
                          onClick={() => selectEquipment(equipment.id)}
                          className={cn(
                            'flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted',
                            equipment.id === selectedEquipmentId && 'border-primary bg-primary/5',
                          )}
                        >
                          <span
                            className={cn(
                              'text-sm font-medium',
                              equipment.id === selectedEquipmentId && 'text-primary',
                            )}
                          >
                            {equipment.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {equipment.category ?? equipment.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="rounded-lg border p-4">
          {selectedEquipment ? (
            <TaskLibraryList
              key={selectedEquipment.id}
              equipmentId={selectedEquipment.id}
              title={`Task Library — ${selectedEquipment.name}`}
              addLabel="Tambah Task"
            />
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="Pilih equipment"
              description="Pilih salah satu card equipment di kiri untuk lihat dan kelola Task Library-nya."
            />
          )}
        </div>
      </div>
    </div>
  )
}
