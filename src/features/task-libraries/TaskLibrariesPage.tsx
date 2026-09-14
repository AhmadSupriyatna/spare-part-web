import { useQuery } from '@tanstack/react-query'
import { NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { ScheduleTaskLibraryDialog } from '@/features/task-libraries/ScheduleTaskLibraryDialog'
import { fetchTaskLibrariesForBranch } from '@/features/task-libraries/api'
import { useBranchStore } from '@/stores/branch-store'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function TaskLibrariesPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: libraries, isLoading } = useQuery({
    queryKey: ['task-libraries', 'branch', activeBranchId],
    queryFn: () => fetchTaskLibrariesForBranch(activeBranchId!),
    enabled: !!activeBranchId,
  })

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih cabang terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Task Library"
        description="Resep kegiatan PM (aktivitas + equipment + checklist part) untuk cabang ini. Kelola per equipment lewat halaman detailnya."
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : libraries?.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Belum ada Task Library di cabang ini"
          description="Tambahkan lewat halaman detail equipment (bagian Task Library (PM))."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {libraries?.map((library) => (
            <div key={library.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{library.title}</p>
                  <Link
                    to={`/equipment/${library.equipment_id}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {library.equipment_name} · {library.machine_name} · {library.line_name}
                  </Link>
                  {library.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{library.description}</p>
                  )}
                </div>
                <ScheduleTaskLibraryDialog
                  libraries={[library]}
                  defaultLibraryId={library.id}
                  invalidateKeys={[['pm-tasks', activeBranchId]]}
                  trigger={
                    <Button size="sm" className="shrink-0">
                      Jadwalkan
                    </Button>
                  }
                />
              </div>
              {library.parts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {library.parts.map((part) => (
                    <span
                      key={part.id}
                      className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {part.part_name} × {part.quantity_required}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
