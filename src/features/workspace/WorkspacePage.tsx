import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchFp3RequestsForBranch } from '@/features/fp3/api'
import { Fp3Card } from '@/features/fp3/Fp3Card'
import { fetchMyTasks } from '@/features/tasks/api'
import { WoCard } from '@/features/workspace/WoCard'
import { useBranchStore } from '@/stores/branch-store'
import { diffInDays, toDateKey } from '@/lib/dates'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DUE_WINDOW_DAYS = 7

/**
 * Tasks and FP3 requests are shown in separate tabs because they follow
 * different workflows and have different due-date filtering rules.
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

  const openTasks = useMemo(() => {
    const todayKey = toDateKey(new Date())

    return (tasks ?? [])
      .filter((task) => {
        if (task.status !== 'pending' && task.status !== 'in_progress') return false
        if (!task.due_date) return true
        return diffInDays(todayKey, toDateKey(new Date(task.due_date))) <= DUE_WINDOW_DAYS
      })
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0
      })
  }, [tasks])

  const openFp3 = useMemo(
    () =>
      (fp3Requests ?? [])
        .filter((fp3) => fp3.status === 'pending' || fp3.status === 'in_progress')
        .sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0
        }),
    [fp3Requests],
  )

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return openTasks
    return openTasks.filter((task) =>
      [
        task.title,
        task.equipment_name,
        task.machine_name,
        task.line_name,
        ...(task.part_checks ?? []).map((check) => check.part_name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [openTasks, search])

  const visibleFp3 = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return openFp3
    return openFp3.filter((fp3) =>
      [fp3.code, fp3.requester_name, fp3.department, fp3.description].join(' ').toLowerCase().includes(term),
    )
  }, [openFp3, search])

  return (
    <div className="flex flex-col gap-4">
      {!activeBranchId ? (
        <>
          <PageHeader title="Workspace" />
          <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
        </>
      ) : (
        <Tabs defaultValue="tasks" className="gap-4">
          <PageHeader
            title="Workspace"
            action={
              <TabsList className="h-10 rounded-xl border bg-muted/60 p-1 shadow-sm">
                <TabsTrigger
                  value="tasks"
                  className="h-full rounded-lg px-4 data-active:shadow-sm"
                >
                  WO ({visibleTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value="fp3"
                  className="h-full rounded-lg px-4 data-active:shadow-sm"
                >
                  FP3 ({visibleFp3.length})
                </TabsTrigger>
              </TabsList>
            }
          />
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari Task/WO, FP3, equipment, atau part..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <TabsContent value="tasks" keepMounted>
              {tasksLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : tasksError ? (
                <QueryErrorState onRetry={() => refetchTasks()} title="Gagal memuat Task / WO" />
              ) : visibleTasks.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={search ? 'Tidak ada Task / WO yang cocok' : 'Tidak ada Task / WO yang belum dikerjakan'}
                  description="Task / WO yang jatuh tempo hari ini sampai 7 hari ke depan, yang sudah terlambat, atau yang belum memiliki tanggal jatuh tempo, muncul di sini."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleTasks.map((task) => (
                    <WoCard key={task.id} task={task} invalidateKey={['tasks', 'mine', activeBranchId]} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="fp3" keepMounted>
              {fp3Loading ? (
                <Skeleton className="h-40 w-full" />
              ) : fp3Error ? (
                <QueryErrorState onRetry={() => refetchFp3()} title="Gagal memuat FP3" />
              ) : visibleFp3.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={search ? 'Tidak ada FP3 yang cocok' : 'Tidak ada FP3 yang belum dikerjakan'}
                  description="Semua FP3 yang belum selesai muncul di sini."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {visibleFp3.map((fp3) => (
                    <Fp3Card key={fp3.id} fp3={fp3} invalidateKey={fp3InvalidateKey} />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  )
}
