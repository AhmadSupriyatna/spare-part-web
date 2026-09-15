import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AddRuntimeDialog } from '@/features/lines/AddRuntimeDialog'
import { deleteLine, fetchLines } from '@/features/lines/api'
import { LineFormDialog } from '@/features/lines/LineFormDialog'
import { LineRuntimeLogTable } from '@/features/lines/LineRuntimeLogTable'
import { EquipmentFormDialog } from '@/features/equipment/EquipmentFormDialog'
import { deleteEquipment, fetchEquipmentList } from '@/features/equipment/api'
import { deleteMachine, fetchMachines } from '@/features/machines/api'
import { MachineFormDialog } from '@/features/machines/MachineFormDialog'
import { InstalledPartsPanel } from '@/features/part-installations/InstalledPartsPanel'
import { PartDropTargetOverlay } from '@/features/part-installations/PartDropTargetOverlay'
import { PartPickerSheet } from '@/features/part-installations/PartPickerSheet'
import { useBranchStore } from '@/stores/branch-store'
import { useCanManage } from '@/stores/use-has-role'
import type { Part } from '@/types/inventory'
import { cn } from '@/lib/utils'
import { DeleteWithPasswordDialog } from '@/components/DeleteWithPasswordDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function LineHierarchyPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const canManage = useCanManage()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [partSheetOpen, setPartSheetOpen] = useState(false)
  const [draggingPart, setDraggingPart] = useState<Part | null>(null)
  const [dropTargetActive, setDropTargetActive] = useState(false)
  const [droppedPart, setDroppedPart] = useState<Part | null>(null)

  const selectedLineId = searchParams.get('line') ? Number(searchParams.get('line')) : null
  const selectedMachineId = searchParams.get('machine') ? Number(searchParams.get('machine')) : null
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
  const selectedEquipment = equipmentList?.find((equipment) => equipment.id === selectedEquipmentId)

  function selectLine(lineId: number) {
    setSearchParams({ line: String(lineId) })
  }

  function selectMachine(machineId: number) {
    setSearchParams({ line: String(selectedLineId), machine: String(machineId) })
  }

  function selectEquipment(equipmentId: number) {
    setSearchParams({
      line: String(selectedLineId),
      machine: String(selectedMachineId),
      equipment: String(equipmentId),
    })
  }

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Line: horizontal strip, left to right, kotak "+" nempel di ujung kanan */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {linesLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-48 shrink-0" />)
        ) : lines?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada line di cabang ini.</p>
        ) : (
          lines?.map((line) => (
            <div
              key={line.id}
              className={cn(
                'group flex h-20 w-48 shrink-0 items-center gap-1 rounded-xl border py-3 pr-2 pl-4 hover:bg-muted',
                line.id === selectedLineId && 'border-primary bg-primary/5',
              )}
            >
              <button onClick={() => selectLine(line.id)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span
                  className={cn(
                    'truncate text-lg font-semibold',
                    line.id === selectedLineId && 'text-primary',
                  )}
                >
                  {line.name}
                </span>
                <span className="truncate font-mono text-sm text-muted-foreground">{line.code}</span>
              </button>
              {!line.is_active && (
                <Badge variant="secondary" className="ml-1 shrink-0">
                  Nonaktif
                </Badge>
              )}
              {canManage && (
                <div className="flex shrink-0 items-center">
                  <LineFormDialog
                    branchId={activeBranchId}
                    line={line}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Ubah Line" title="Ubah Line">
                        <Pencil />
                      </Button>
                    }
                  />
                  <DeleteWithPasswordDialog
                    title={`Hapus Line "${line.name}"?`}
                    description="Semua mesin, equipment, work order, tugas, dan riwayat di bawah line ini akan ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan."
                    onConfirm={(password) => deleteLine(line.id, password)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['lines', activeBranchId] })
                      if (line.id === selectedLineId) {
                        setSearchParams({})
                      }
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Hapus Line" title="Hapus Line">
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          ))
        )}
        {canManage && !linesLoading && (
          <LineFormDialog
            branchId={activeBranchId}
            trigger={
              <button
                type="button"
                aria-label="Tambah Line"
                title="Tambah Line"
                className="flex h-20 w-48 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Plus className="size-5" />
                <span className="text-sm font-medium">Tambah Line</span>
              </button>
            }
          />
        )}
      </div>

      {/* Mesin (30%) | Equipment (30%) | Part terpasang (40%) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_3fr_4fr]">
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
              deleteAction={
                canManage && (
                  <DeleteWithPasswordDialog
                    title={`Hapus Mesin "${machine.name}"?`}
                    description="Semua equipment, work order, tugas, dan riwayat di bawah mesin ini akan ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan."
                    onConfirm={(password) => deleteMachine(machine.id, password)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['machines', selectedLineId] })
                      if (machine.id === selectedMachineId) {
                        setSearchParams({ line: String(selectedLineId) })
                      }
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-xs" aria-label="Hapus Mesin" title="Hapus Mesin">
                        <Trash2 />
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
            <ColumnRow
              key={equipment.id}
              isSelected={equipment.id === selectedEquipmentId}
              onClick={() => selectEquipment(equipment.id)}
              title={equipment.name}
              subtitle={equipment.category ?? equipment.code}
              badge={!equipment.is_active ? <Badge variant="secondary">Nonaktif</Badge> : undefined}
              detailHref={`/equipment/${equipment.id}`}
              editAction={
                canManage &&
                selectedMachineId && (
                  <EquipmentFormDialog
                    machineId={selectedMachineId}
                    equipment={equipment}
                    trigger={
                      <Button variant="ghost" size="icon-xs" aria-label="Ubah Equipment" title="Ubah Equipment">
                        <Pencil />
                      </Button>
                    }
                  />
                )
              }
              deleteAction={
                canManage && (
                  <DeleteWithPasswordDialog
                    title={`Hapus Equipment "${equipment.name}"?`}
                    description="Semua work order, tugas, BOM, dan riwayat pemasangan part di equipment ini akan ikut terhapus permanen. Tindakan ini tidak bisa dibatalkan."
                    onConfirm={(password) => deleteEquipment(equipment.id, password)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['equipment', selectedMachineId] })
                      if (equipment.id === selectedEquipmentId) {
                        setSearchParams({ line: String(selectedLineId), machine: String(selectedMachineId) })
                      }
                    }}
                    trigger={
                      <Button variant="ghost" size="icon-xs" aria-label="Hapus Equipment" title="Hapus Equipment">
                        <Trash2 />
                      </Button>
                    }
                  />
                )
              }
            />
          ))}
        </HierarchyColumn>

        <div className="flex flex-col rounded-lg border">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <h2 className="truncate text-sm font-semibold text-muted-foreground">
              {selectedEquipment ? `Part — ${selectedEquipment.name}` : 'Part'}
            </h2>
            {canManage && selectedEquipment && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Pasang Part"
                title="Pasang Part"
                onClick={() => setPartSheetOpen(true)}
              >
                <Plus />
              </Button>
            )}
          </div>
          <div className="max-h-[36rem] overflow-y-auto rounded-b-lg p-3">
            {selectedEquipment ? (
              <InstalledPartsPanel equipmentId={selectedEquipment.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Pilih equipment untuk lihat part yang terpasang.</p>
            )}
          </div>
        </div>
      </div>

      {/* Target drop besar di tengah layar selagi laci terbuka — latar
          belakang jadi buram, dan hanya kotak ini yang menerima drop
          (bukan panel Part di halaman, yang bisa ketutupan laci). */}
      {partSheetOpen && selectedEquipment && (
        <PartDropTargetOverlay
          title={`Part — ${selectedEquipment.name}`}
          subtitle="Lepaskan part di sini untuk memasang"
          isDropTargetActive={dropTargetActive}
          onDragEnter={() => setDropTargetActive(true)}
          onDragLeave={() => setDropTargetActive(false)}
          onDrop={() => {
            setDropTargetActive(false)
            if (!draggingPart) return
            setDroppedPart(draggingPart)
          }}
          onClose={() => setPartSheetOpen(false)}
        >
          <InstalledPartsPanel equipmentId={selectedEquipment.id} />
        </PartDropTargetOverlay>
      )}

      {selectedEquipment && (
        <PartPickerSheet
          open={partSheetOpen}
          onOpenChange={setPartSheetOpen}
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          droppedPart={droppedPart}
          onDropHandled={() => setDroppedPart(null)}
          onDragStartPart={setDraggingPart}
          onDragEndPart={() => setDraggingPart(null)}
        />
      )}

      {/* Riwayat jam operasi line, per tanggal */}
      {selectedLine && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Catatan Jam Operasional Line {selectedLine.name}</h2>
            {canManage && (
              <AddRuntimeDialog
                lineId={selectedLine.id}
                branchId={activeBranchId}
                currentHours={selectedLine.runtime_hours}
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Jam operasi saat ini: <span className="font-medium text-foreground">{selectedLine.runtime_hours}</span> jam
          </p>
          <LineRuntimeLogTable lineId={selectedLine.id} />
        </div>
      )}
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
      <div className="flex max-h-[36rem] flex-col overflow-y-auto">
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
  detailHref?: string
  editAction?: React.ReactNode
  deleteAction?: React.ReactNode
}

function ColumnRow({
  title,
  subtitle,
  isSelected,
  onClick,
  badge,
  detailHref,
  editAction,
  deleteAction,
}: ColumnRowProps) {
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
      {detailHref && (
        <Link
          to={detailHref}
          className="px-1 text-xs text-muted-foreground hover:text-primary hover:underline"
          title="Lihat detail"
        >
          Detail
        </Link>
      )}
      {editAction}
      {deleteAction}
    </div>
  )
}
