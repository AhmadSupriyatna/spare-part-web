import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchMachineCalendar } from '@/features/machines/api'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/**
 * A read-only month calendar — unlike the full PM Calendar page
 * (MaintenancePage.tsx), there's no drag-and-drop or scheduling here, just
 * a glance at where this Machine's PM (any status, blue dot) and
 * failure/breakdown events (red dot) land within a month.
 */
export function MachineMiniCalendar({ machineId }: { machineId: number }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const monthKey = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`

  const { data, isLoading } = useQuery({
    queryKey: ['machine-calendar', machineId, monthKey],
    queryFn: () => fetchMachineCalendar(machineId, monthKey),
  })

  const cells = useMemo(() => {
    const jsDay = monthCursor.getDay()
    const mondayOffset = (jsDay + 6) % 7
    const gridStart = new Date(monthCursor)
    gridStart.setDate(gridStart.getDate() - mondayOffset)

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + i)
      return date
    })
  }, [monthCursor])

  const today = toDateKey(new Date())

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{monthCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Bulan sebelumnya"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Bulan berikutnya"
            onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" /> PM
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-destructive" /> Failure/Breakdown
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="bg-muted/60 p-1 text-center text-[10px] font-medium text-muted-foreground">
              {label}
            </div>
          ))}
          {cells.map((date) => {
            const key = toDateKey(date)
            const isCurrentMonth = date.getMonth() === monthCursor.getMonth()
            const day = data?.days[key]
            const pmCount = day?.pm?.length ?? 0
            const failureCount = day?.failure_count ?? 0
            const pmTitles = day?.pm?.map((t) => t.title).join(', ')

            return (
              <div
                key={key}
                title={pmTitles}
                className={cn(
                  'flex min-h-14 flex-col gap-0.5 bg-background p-1 text-xs',
                  !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                  key === today && 'ring-1 ring-inset ring-primary',
                )}
              >
                <span className={cn('tabular-nums', !isCurrentMonth && 'opacity-50')}>{date.getDate()}</span>
                {(pmCount > 0 || failureCount > 0) && (
                  <div className="flex flex-wrap gap-0.5">
                    {pmCount > 0 && (
                      <span className="rounded bg-primary/15 px-1 text-[9px] font-medium text-primary">{pmCount} PM</span>
                    )}
                    {failureCount > 0 && (
                      <span className="rounded bg-destructive/15 px-1 text-[9px] font-medium text-destructive">
                        {failureCount} FB
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
