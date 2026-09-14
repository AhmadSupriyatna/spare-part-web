import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { fetchMyTasks } from '@/features/tasks/api'
import { TaskRow } from '@/features/tasks/TaskRow'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function MyTasksPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: fetchMyTasks,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tugas Saya" description="Pekerjaan yang ditugaskan ke kamu." />

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : tasks?.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Tidak ada tugas untukmu saat ini"
          description="Tugas baru akan muncul di sini begitu ditugaskan atau dijadwalkan."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Ditugaskan ke</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks?.map((task) => (
              <TaskRow key={task.id} task={task} invalidateKey={['tasks', 'mine']} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
