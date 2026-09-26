import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { fetchTask } from '@/features/tasks/api'
import { WoPrintSection } from '@/features/pm/WoPrintSection'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function PrintWoChecklistPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (isLoading || !task) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #wo-print-area, #wo-print-area * { visibility: visible; }
          #wo-print-area { position: absolute; inset: 0; padding: 24px; }
        }
      `}</style>

      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>Cetak</Button>
      </div>

      <div id="wo-print-area">
        <WoPrintSection task={task} companySetting={companySetting} />
      </div>
    </div>
  )
}
