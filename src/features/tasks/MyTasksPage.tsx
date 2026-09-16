import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchMyTasks } from '@/features/tasks/api'
import { TaskRow } from '@/features/tasks/TaskRow'
import { mondayOf, toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function MyTasksPage() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: fetchMyTasks,
  })

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = toDateKey(new Date())

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return date
    }),
    [weekStart],
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, number>()
    tasks?.forEach((task) => {
      if (!task.due_date) return
      const key = toDateKey(new Date(task.due_date))
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [tasks])

  const visibleTasks = useMemo(() => {
    if (!tasks) return []
    if (!selectedDate) return tasks
    return tasks.filter((task) => task.due_date && toDateKey(new Date(task.due_date)) === selectedDate)
  }, [tasks, selectedDate])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tugas Saya" description="Pekerjaan yang ditugaskan ke kamu." />

      <div className="flex flex-col gap-2 rounded-md border p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} —{' '}
            {days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Minggu sebelumnya"
              onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekStart(mondayOf(new Date()))}
            >
              Minggu Ini
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Minggu berikutnya"
              onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            const key = toDateKey(date)
            const count = tasksByDate.get(key) ?? 0
            const isSelected = selectedDate === key

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate((prev) => (prev === key ? null : key))}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-md border p-1.5 transition-colors',
                  isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <span className={cn('text-[10px] font-medium text-muted-foreground', i === 6 && 'text-destructive')}>
                  {WEEKDAYS[i]}
                </span>
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                    key === today && 'bg-primary text-primary-foreground',
                  )}
                >
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <Badge variant={isSelected ? 'default' : 'secondary'} className="h-4 min-w-4 px-1 text-[10px]">
                    {count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setSelectedDate(null)}>
            Tampilkan semua tugas
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={selectedDate ? 'Tidak ada tugas di hari ini' : 'Tidak ada tugas untukmu saat ini'}
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
            {visibleTasks.map((task) => (
              <TaskRow key={task.id} task={task} invalidateKey={['tasks', 'mine']} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
