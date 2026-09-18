import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { deletePartRepair, fetchPartRepairs, updatePartRepair } from '@/features/part-repairs/api'
import { RepairCard } from '@/features/part-repairs/RepairCard'
import { RepairDecisionDialog } from '@/features/part-repairs/RepairDecisionDialog'
import { RepairEditDialog } from '@/features/part-repairs/RepairEditDialog'
import { RepairScrapList } from '@/features/part-repairs/RepairScrapList'
import { useCanManage, useIsSuperadmin } from '@/stores/use-has-role'
import { cn } from '@/lib/utils'
import type { PartRepair, PartRepairDisposition } from '@/types/relations'
import { Skeleton } from '@/components/ui/skeleton'

interface RepairBoardProps {
  branchId: number
}

const COLUMNS: { key: PartRepairDisposition; title: string; theme: string; dot: string }[] = [
  { key: 'pending', title: 'Perlu Keputusan', theme: 'border-t-primary bg-primary/5', dot: 'bg-primary' },
  { key: 'in_repair', title: 'Proses Repair', theme: 'border-t-warning bg-warning/5', dot: 'bg-warning' },
  { key: 'repaired', title: 'Siap Dipasang', theme: 'border-t-success bg-success/5', dot: 'bg-success' },
]

function reportError(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  toast.error(message)
}

/**
 * Kanban board for parts pulled off equipment: PartLifecycleService::remove()
 * opens the "Perlu Keputusan" card automatically the moment a part comes
 * off, so there's nothing to trigger manually here — this view is purely
 * about moving those cards forward (Repair with an ETA, or Scrap) and, once
 * repaired, printing the QR label for reinstallation. Superadmin gets two
 * extra corrections everyone else doesn't (see RepairCard/RepairEditDialog):
 * editing a record to any status (including backward), and undoing a
 * removal entirely for a part removed by mistake.
 */
export function RepairBoard({ branchId }: RepairBoardProps) {
  const canManage = useCanManage()
  const isSuperadmin = useIsSuperadmin()
  const queryClient = useQueryClient()
  const queryKey = ['part-repairs', branchId]

  const [draggingRepair, setDraggingRepair] = useState<PartRepair | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<PartRepairDisposition | null>(null)
  const [decisionFor, setDecisionFor] = useState<PartRepair | null>(null)
  const [editFor, setEditFor] = useState<PartRepair | null>(null)

  const { data: repairs, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchPartRepairs(branchId),
  })

  const mutation = useMutation({
    mutationFn: ({
      id,
      disposition,
      estimatedCompletionDate,
      notes,
    }: {
      id: number
      disposition: PartRepairDisposition
      estimatedCompletionDate?: string | null
      notes?: string | null
    }) => updatePartRepair(id, { disposition, estimated_completion_date: estimatedCompletionDate, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('Status perbaikan diperbarui.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal memperbarui status perbaikan.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePartRepair(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('Pelepasan part dibatalkan — unit dikembalikan seperti semula.')
    },
    onError: (error: unknown) => reportError(error, 'Gagal membatalkan pelepasan.'),
  })

  const byColumn = new Map<PartRepairDisposition, PartRepair[]>(COLUMNS.map((c) => [c.key, []]))
  const scrapped: PartRepair[] = []
  repairs?.forEach((repair) => {
    if (repair.disposition === 'scrapped') {
      scrapped.push(repair)
      return
    }
    byColumn.get(repair.disposition)?.push(repair)
  })

  function handleDropOnColumn(column: PartRepairDisposition) {
    setDragOverColumn(null)
    const repair = draggingRepair
    setDraggingRepair(null)
    if (!repair || !canManage || repair.disposition === column) return

    if (repair.disposition === 'pending' && column === 'in_repair') {
      setDecisionFor(repair)
    } else if (repair.disposition === 'in_repair' && column === 'repaired') {
      mutation.mutate({ id: repair.id, disposition: 'repaired' })
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = byColumn.get(column.key) ?? []
          return (
            <div
              key={column.key}
              className={cn(
                'flex flex-col gap-2 rounded-lg border border-t-4 p-2 transition-colors',
                column.theme,
                dragOverColumn === column.key &&
                  'bg-primary/10 outline-2 -outline-offset-2 outline-primary/50 outline-dashed',
              )}
              onDragOver={(e) => {
                if (!canManage || !draggingRepair) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverColumn(column.key)
              }}
              onDragLeave={() => setDragOverColumn((prev) => (prev === column.key ? null : prev))}
              onDrop={(e) => {
                e.preventDefault()
                handleDropOnColumn(column.key)
              }}
            >
              <div className="flex items-center gap-2 px-1 py-1">
                <span className={cn('size-2 rounded-full', column.dot)} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Tidak ada unit.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((repair) => (
                    <RepairCard
                      key={repair.id}
                      repair={repair}
                      canManage={canManage}
                      isSuperadmin={isSuperadmin}
                      onDragStart={() => setDraggingRepair(repair)}
                      onDragEnd={() => setDraggingRepair(null)}
                      onRepair={() => setDecisionFor(repair)}
                      onReady={() => mutation.mutate({ id: repair.id, disposition: 'repaired' })}
                      onScrap={() => mutation.mutate({ id: repair.id, disposition: 'scrapped' })}
                      onEdit={() => setEditFor(repair)}
                      onDelete={() => deleteMutation.mutate(repair.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <RepairScrapList
        repairs={scrapped}
        isSuperadmin={isSuperadmin}
        onEdit={setEditFor}
        onDelete={(repair) => deleteMutation.mutate(repair.id)}
      />

      <RepairDecisionDialog
        repair={decisionFor}
        isSubmitting={mutation.isPending}
        onCancel={() => setDecisionFor(null)}
        onConfirm={(estimatedCompletionDate) => {
          if (!decisionFor) return
          mutation.mutate(
            { id: decisionFor.id, disposition: 'in_repair', estimatedCompletionDate },
            { onSuccess: () => setDecisionFor(null) },
          )
        }}
      />

      <RepairEditDialog
        repair={editFor}
        isSubmitting={mutation.isPending}
        onCancel={() => setEditFor(null)}
        onConfirm={(data) => {
          if (!editFor) return
          mutation.mutate(
            {
              id: editFor.id,
              disposition: data.disposition,
              estimatedCompletionDate: data.estimated_completion_date,
              notes: data.notes,
            },
            { onSuccess: () => setEditFor(null) },
          )
        }}
      />
    </div>
  )
}
