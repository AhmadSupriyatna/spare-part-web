import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchFp3RequestsForBranch, type Fp3Request } from '@/features/fp3/api'
import { Fp3Card } from '@/features/fp3/Fp3Card'
import { fetchMyTasks } from '@/features/tasks/api'
import { WoCard } from '@/features/workspace/WoCard'
import { useBranchStore } from '@/stores/branch-store'
import { diffInDays, toDateKey } from '@/lib/dates'
import type { Task } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const DUE_WINDOW_DAYS = 7

type WorkItem = { kind: 'task'; key: string; dueDate: string | null; task: Task } | { kind: 'fp3'; key: string; dueDate: string | null; fp3: Fp3Request }

/**
 * "Tugas Saya" grew into this: one shared pool for Engineer/Supervisor,
 * WO (Task) and "WO FP3" (Fp3Request) merged into a single list — FP3 is a
 * request/repair-and-fabrication job just like a WO, it just lives in its
 * own table since Task.equipment_id can't be null and FP3 has no
 * equipment/machine/line at all (see Fp3Request's own docblock).
 *
 * A WO only shows if due today or within the next 7 days (plus anything
 * already overdue or without a due date at all); an FP3 has no such window
 * — it's meant to be picked up whenever someone's free, not filtered by a
 * fixed date range, since a lot of requests never get a due_date at all.
 */
export function WorkspacePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const [search, setSearch] = useState('')

  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useQuery({
    queryKey: ['tasks', 'mine', activeBranchId],
    queryFn: () => fetchMyTasks(activeBranchId),
    enabled: !!activeBranchId,
  })

  const fp3InvalidateKey = ['fp3-requests', activeBranchId]
  const {
    data: fp3Requests,
    isLoading: fp3Loading,
    isError: fp3Error,
    refetch: refetchFp3,
  } = useQuery({
    queryKey: fp3InvalidateKey,
    queryFn: () => fetchFp3RequestsForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const isLoading = tasksLoading || fp3Loading
  const hasError = tasksError || fp3Error

  function retryAll() {
    refetchTasks()
    refetchFp3()
  }

  const items = useMemo(() => {
    const todayKey = toDateKey(new Date())

    const openTasks: WorkItem[] = (tasks ?? [])
      .filter((task) => {
        if (task.status !== 'pending' && task.status !== 'in_progress') return false
        if (!task.due_date) return true
        return diffInDays(todayKey, toDateKey(new Date(task.due_date))) <= DUE_WINDOW_DAYS
      })
      .map((task) => ({ kind: 'task', key: `task-${task.id}`, dueDate: task.due_date, task }))

    const openFp3: WorkItem[] = (fp3Requests ?? [])
      .filter((fp3) => fp3.status === 'pending' || fp3.status === 'in_progress')
      .map((fp3) => ({ kind: 'fp3', key: `fp3-${fp3.id}`, dueDate: fp3.due_date, fp3 }))

    return [...openTasks, ...openFp3].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
    })
  }, [tasks, fp3Requests])

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      if (item.kind === 'task') {
        return [
          item.task.title,
          item.task.equipment_name,
          item.task.machine_name,
          item.task.line_name,
          ...(item.task.part_checks ?? []).map((c) => c.part_name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      }
      return [item.fp3.code, item.fp3.requester_name, item.fp3.department, item.fp3.description]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [items, search])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Workspace" />

      {!activeBranchId ? (
        <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari WO, FP3, equipment, atau part..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : hasError ? (
            <QueryErrorState onRetry={retryAll} title="Gagal memuat Workspace" />
          ) : visibleItems.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title={search ? 'Tidak ada yang cocok' : 'Tidak ada WO atau FP3 yang belum dikerjakan'}
              description="WO yang jatuh tempo hari ini sampai 7 hari ke depan (atau sudah terlambat), dan semua FP3 yang belum selesai, muncul di sini."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visibleItems.map((item) =>
                item.kind === 'task' ? (
                  <WoCard key={item.key} task={item.task} invalidateKey={['tasks', 'mine', activeBranchId]} />
                ) : (
                  <Fp3Card key={item.key} fp3={item.fp3} invalidateKey={fp3InvalidateKey} />
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
