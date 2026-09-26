import { ClipboardList, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { taskChipVariant, taskSource, taskSourceLabel } from '@/features/pm/taskColors'
import type { Task, TaskStatus } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Belum Mulai',
  in_progress: 'Sedang Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

interface WoListViewProps {
  tasks: Task[] | undefined
  isLoading: boolean
  onSelect: (task: Task) => void
}

/**
 * Flat table of every WO in the branch — replaces the old standalone Work
 * Order page and WO Ledger tab, now that everything lives on one
 * Maintenance page alongside the calendar. Checkbox selection + "Cetak
 * Terpilih" hands the selected Tasks straight to PrintWoChecklistsPage via
 * router state (this list already has everything that page needs loaded).
 */
export function WoListView({ tasks, isLoading, onSelect }: WoListViewProps) {
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return <EmptyState icon={ClipboardList} title="Belum ada WO" description="Belum ada WO yang tercatat di plant ini." />
  }

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id))

  function toggleAll() {
    if (!tasks) return
    setSelectedIds(allSelected ? new Set() : new Set(tasks.map((t) => t.id)))
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function printSelected() {
    const selected = tasks?.filter((t) => selectedIds.has(t.id)) ?? []
    navigate('/pm/tasks/print', { state: { tasks: selected } })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button size="sm" disabled={selectedIds.size === 0} onClick={printSelected}>
          <Printer className="size-3.5" />
          Cetak Terpilih ({selectedIds.size})
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
              </TableHead>
              <TableHead>WO</TableHead>
              <TableHead>Equipment / Line</TableHead>
              <TableHead>Ditugaskan ke</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="cursor-pointer" onClick={() => onSelect(task)}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(task.id)}
                    onCheckedChange={() => toggleOne(task.id)}
                    aria-label={`Pilih WO ${task.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.equipment_name}
                  <div className="text-xs">
                    {task.machine_name} · {task.line_name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{task.assignee_name ?? '-'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={taskChipVariant(task)}>{taskSourceLabel[taskSource(task)]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={task.status === 'completed' ? 'success' : task.status === 'cancelled' ? 'destructive' : 'secondary'}>
                    {task.is_overdue && task.status !== 'completed' && task.status !== 'cancelled'
                      ? 'Terlambat'
                      : statusLabels[task.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    nativeButton={false}
                    aria-label="Cetak checklist"
                    title="Cetak checklist"
                    onClick={(e) => e.stopPropagation()}
                    render={<Link to={`/pm/tasks/${task.id}/print`} />}
                  >
                    <Printer />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
