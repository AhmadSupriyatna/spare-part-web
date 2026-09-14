import { useQuery } from '@tanstack/react-query'
import { fetchMyTasks } from '@/features/tasks/api'
import { TaskRow } from '@/features/tasks/TaskRow'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function MyTasksPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: fetchMyTasks,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Tugas Saya</h1>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : tasks?.length === 0 ? (
        <p className="text-muted-foreground">Tidak ada tugas yang ditugaskan ke kamu saat ini.</p>
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
