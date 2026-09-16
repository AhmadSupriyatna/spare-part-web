import { useQueries, useQuery } from '@tanstack/react-query'
import { NotebookPen, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

interface SubSystemOption {
  id: number
  name: string
  code: string
  category: string | null
  machineName: string
}

export function TaskLibrariesPage() {
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
  const equipmentLoading = machinesLoading || equipmentQueries.some((q) => q.isLoading)

  const subSystems = useMemo<SubSystemOption[]>(() => {
    const list: SubSystemOption[] = []
    ;(machines ?? []).forEach((machine, index) => {
      const equipmentList = equipmentQueries[index]?.data ?? []
      for (const equipment of equipmentList) {
        list.push({
          id: equipment.id,
          name: equipment.name,
          code: equipment.code,
          category: equipment.category ?? null,
          machineName: machine.name,
        })
      }
    })
    return list
  }, [machines, equipmentQueries])

  const filteredSubSystems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return subSystems
    return subSystems.filter((item) =>
      `${item.name} ${item.code} ${item.machineName}`.toLowerCase().includes(term),
    )
  }, [subSystems, search])

  // Default to the first line once loaded, if nothing is selected via the URL yet.
  useEffect(() => {
    if (!selectedLineId && lines && lines.length > 0) {
      setSearchParams({ line: String(lines[0].id) }, { replace: true })
    }
  }, [selectedLineId, lines, setSearchParams])

  function selectLine(lineId: number) {
    setSearch('')
    setSearchParams({ line: String(lineId) })
  }

  function selectEquipment(equipmentId: number) {
    setSearchParams({ line: String(selectedLineId), equipment: String(equipmentId) })
  }

  const selectedEquipment = subSystems.find((item) => item.id === selectedEquipmentId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Task Library" />

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

          <div className="max-h-[32rem] overflow-y-auto p-1.5">
            {!selectedLineId ? (
              <p className="p-3 text-sm text-muted-foreground">Pilih line terlebih dahulu.</p>
            ) : equipmentLoading ? (
              <div className="flex flex-col gap-2 p-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredSubSystems.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {search ? 'Sub system tidak ditemukan.' : 'Belum ada equipment di line ini.'}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredSubSystems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectEquipment(item.id)}
                    className={cn(
                      'flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted',
                      item.id === selectedEquipmentId && 'bg-primary/5 text-primary',
                    )}
                  >
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.machineName} · <span className="font-mono">{item.category ?? item.code}</span>
                    </span>
                  </button>
                ))}
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
              description="Pilih salah satu sub system (equipment) di kiri untuk lihat dan kelola Task Library-nya."
            />
          )}
        </div>
      </div>
    </div>
  )
}
