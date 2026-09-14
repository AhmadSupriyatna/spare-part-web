import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AddRuntimeDialog } from '@/features/lines/AddRuntimeDialog'
import { fetchLines } from '@/features/lines/api'
import { LineFormDialog } from '@/features/lines/LineFormDialog'
import { EquipmentFormDialog } from '@/features/equipment/EquipmentFormDialog'
import { fetchEquipmentList } from '@/features/equipment/api'
import { MachineFormDialog } from '@/features/machines/MachineFormDialog'
import { fetchMachines } from '@/features/machines/api'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function LineHierarchyPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedLineId = searchParams.get('line') ? Number(searchParams.get('line')) : null
  const selectedMachineId = searchParams.get('machine') ? Number(searchParams.get('machine')) : null

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

  const { data: equipmentList, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', selectedMachineId],
    queryFn: () => fetchEquipmentList(selectedMachineId!),
    enabled: !!selectedMachineId,
  })

  // Default to the first line once loaded, if nothing is selected via the URL yet.
  useEffect(() => {
    if (!selectedLineId && lines && lines.length > 0) {
      setSearchParams({ line: String(lines[0].id) }, { replace: true })
    }
  }, [selectedLineId, lines, setSearchParams])

  // Default to the first machine of the selected line, if none is selected yet.
  useEffect(() => {
    if (selectedLineId && !selectedMachineId && machines && machines.length > 0) {
      setSearchParams({ line: String(selectedLineId), machine: String(machines[0].id) }, { replace: true })
    }
  }, [selectedLineId, selectedMachineId, machines, setSearchParams])

  const selectedLine = lines?.find((line) => line.id === selectedLineId)
  const selectedMachine = machines?.find((machine) => machine.id === selectedMachineId)

  function selectLine(lineId: number) {
    setSearchParams({ line: String(lineId) })
  }

  function selectMachine(machineId: number) {
    setSearchParams({ line: String(selectedLineId), machine: String(machineId) })
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Line Produksi"
        description="Hierarki Line, Mesin, dan Equipment untuk cabang ini."
        action={
          selectedLine && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Jam operasi {selectedLine.name}:{' '}
                <span className="font-medium text-foreground tabular-nums">{selectedLine.runtime_hours}</span>
              </p>
              {canManage && <AddRuntimeDialog lineId={selectedLine.id} branchId={activeBranchId} />}
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HierarchyColumn
          title="Line"
          isLoading={linesLoading}
          isEmpty={lines?.length === 0}
          emptyMessage="Belum ada line di cabang ini."
          addAction={
            canManage && (
              <LineFormDialog
                branchId={activeBranchId}
                trigger={
                  <Button variant="ghost" size="icon-xs" aria-label="Tambah Line" title="Tambah Line">
                    <Plus />
                  </Button>
                }
              />
            )
          }
        >
          {lines?.map((line) => (
            <ColumnRow
              key={line.id}
              isSelected={line.id === selectedLineId}
              onClick={() => selectLine(line.id)}
              title={line.name}
              subtitle={line.code}
              badge={!line.is_active ? <Badge variant="secondary">Nonaktif</Badge> : undefined}
              editAction={
                canManage && (
                  <LineFormDialog
                    branchId={activeBranchId}
                    line={line}
                    trigger={
                      <Button variant="ghost" size="icon-xs" aria-label="Ubah Line" title="Ubah Line">
                        <Pencil />
                      </Button>
                    }
                  />
                )
              }
            />
          ))}
        </HierarchyColumn>

        <HierarchyColumn
          title={selectedLine ? `Mesin — ${selectedLine.name}` : 'Mesin'}
          isLoading={!!selectedLineId && machinesLoading}
          isEmpty={!selectedLineId || machines?.length === 0}
          emptyMessage={!selectedLineId ? 'Pilih line terlebih dahulu.' : 'Belum ada mesin di line ini.'}
          addAction={
            canManage &&
            selectedLineId && (
              <MachineFormDialog
                lineId={selectedLineId}
                trigger={
                  <Button variant="ghost" size="icon-xs" aria-label="Tambah Mesin" title="Tambah Mesin">
                    <Plus />
                  </Button>
                }
              />
            )
          }
        >
          {machines?.map((machine) => (
            <ColumnRow
              key={machine.id}
              isSelected={machine.id === selectedMachineId}
              onClick={() => selectMachine(machine.id)}
              title={machine.name}
              subtitle={machine.category ?? machine.code}
              badge={!machine.is_active ? <Badge variant="secondary">Nonaktif</Badge> : undefined}
              editAction={
                canManage &&
                selectedLineId && (
                  <MachineFormDialog
                    lineId={selectedLineId}
                    machine={machine}
                    trigger={
                      <Button variant="ghost" size="icon-xs" aria-label="Ubah Mesin" title="Ubah Mesin">
                        <Pencil />
                      </Button>
                    }
                  />
                )
              }
            />
          ))}
        </HierarchyColumn>

        <HierarchyColumn
          title={selectedMachine ? `Equipment — ${selectedMachine.name}` : 'Equipment'}
          isLoading={!!selectedMachineId && equipmentLoading}
          isEmpty={!selectedMachineId || equipmentList?.length === 0}
          emptyMessage={!selectedMachineId ? 'Pilih mesin terlebih dahulu.' : 'Belum ada equipment di mesin ini.'}
          addAction={
            canManage &&
            selectedMachineId && (
              <EquipmentFormDialog
                machineId={selectedMachineId}
                trigger={
                  <Button variant="ghost" size="icon-xs" aria-label="Tambah Equipment" title="Tambah Equipment">
                    <Plus />
                  </Button>
                }
              />
            )
          }
        >
          {equipmentList?.map((equipment) => (
            <div
              key={equipment.id}
              className="flex items-center gap-1 border-b pr-1 last:border-b-0 hover:bg-muted"
            >
              <Link
                to={`/equipment/${equipment.id}`}
                className="flex flex-1 flex-col gap-0.5 px-3 py-2 text-left text-sm"
              >
                <span className="font-medium">{equipment.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {equipment.category ?? equipment.code}
                </span>
              </Link>
              {canManage && selectedMachineId && (
                <EquipmentFormDialog
                  machineId={selectedMachineId}
                  equipment={equipment}
                  trigger={
                    <Button variant="ghost" size="icon-xs" aria-label="Ubah Equipment" title="Ubah Equipment">
                      <Pencil />
                    </Button>
                  }
                />
              )}
            </div>
          ))}
        </HierarchyColumn>
      </div>
    </div>
  )
}

interface HierarchyColumnProps {
  title: string
  isLoading: boolean
  isEmpty: boolean | undefined
  emptyMessage: string
  addAction?: React.ReactNode
  children: React.ReactNode
}

function HierarchyColumn({ title, isLoading, isEmpty, emptyMessage, addAction, children }: HierarchyColumnProps) {
  return (
    <div className="flex flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <h2 className="truncate text-sm font-semibold text-muted-foreground">{title}</h2>
        {addAction}
      </div>
      <div className="flex max-h-[32rem] flex-col overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

interface ColumnRowProps {
  title: string
  subtitle?: string | null
  isSelected: boolean
  onClick: () => void
  badge?: React.ReactNode
  editAction?: React.ReactNode
}

function ColumnRow({ title, subtitle, isSelected, onClick, badge, editAction }: ColumnRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b pr-1 last:border-b-0 hover:bg-muted',
        isSelected && 'bg-primary/10',
      )}
    >
      <button onClick={onClick} className="flex flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm">
        <span className="flex flex-col gap-0.5">
          <span className={cn('font-medium', isSelected && 'text-primary')}>{title}</span>
          {subtitle && <span className="font-mono text-xs text-muted-foreground">{subtitle}</span>}
        </span>
        {badge}
      </button>
      {editAction}
    </div>
  )
}
