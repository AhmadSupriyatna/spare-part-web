import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchMyTasks } from '@/features/tasks/api'
import { WoCard } from '@/features/workspace/WoCard'
import { useBranchStore } from '@/stores/branch-store'
import { diffInDays, toDateKey } from '@/lib/dates'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const DUE_WINDOW_DAYS = 7

/**
 * "Tugas Saya" grew into this: a shared WO pool for Engineer/Supervisor (a
 * WO belongs to whoever claims it, not to one person from the start — see
 * TaskController::mine()/ensureCanWork()). Approval used to live here as a
 * second tab but was split into its own page/nav item.
 *
 * Only shows what's due today or within the next 7 days (plus anything
 * already overdue or without a due date at all — an overdue WO shouldn't
 * silently vanish from the claim queue just because a fixed window passed).
 * Anything further out stays on the Maintenance calendar, which already
 * handles date-based browsing.
 */
function TaskPoolView({ branchId }: { branchId: number }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine', branchId],
    queryFn: () => fetchMyTasks(branchId),
  })

  const [search, setSearch] = useState('')

  const openTasks = useMemo(() => {
    const todayKey = toDateKey(new Date())
    return (tasks ?? []).filter((task) => {
      if (task.status !== 'pending' && task.status !== 'in_progress') return false
      if (!task.due_date) return true
      const diff = diffInDays(todayKey, toDateKey(new Date(task.due_date)))
      return diff <= DUE_WINDOW_DAYS
    })
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return openTasks
    return openTasks.filter((task) =>
      [task.title, task.equipment_name, task.machine_name, task.line_name, ...(task.part_checks ?? []).map((c) => c.part_name)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [openTasks, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari WO, equipment, atau part..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={search ? 'Tidak ada WO yang cocok' : 'Tidak ada WO yang belum dikerjakan'}
          description="WO yang jatuh tempo hari ini sampai 7 hari ke depan (atau sudah terlambat) akan muncul di sini."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleTasks.map((task) => (
            <WoCard key={task.id} task={task} invalidateKey={['tasks', 'mine', branchId]} />
          ))}
        </div>
      )}
    </div>
  )
}

export function WorkspacePage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Workspace" />

      {!activeBranchId ? (
        <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
      ) : (
        <TaskPoolView branchId={activeBranchId} />
      )}
    </div>
  )
}
