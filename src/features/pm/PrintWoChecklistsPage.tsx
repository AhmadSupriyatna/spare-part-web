import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { fetchCompanySetting } from '@/features/settings/api'
import { WoPrintSection } from '@/features/pm/WoPrintSection'
import type { Task } from '@/types/tasks'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ClipboardList } from 'lucide-react'

interface PrintWoChecklistsLocationState {
  tasks: Task[]
}

/**
 * Bulk print (WoListView's checkbox selection + "Cetak N Terpilih") — the
 * selected Tasks are handed over via router state instead of a fetch, since
 * WoListView already has them fully loaded (TaskController::pmSchedule()
 * eager-loads everything WoPrintSection needs). Reloading this page directly
 * (no state, e.g. a bookmark) has nothing to print — see the empty state.
 */
export function PrintWoChecklistsPage() {
  const location = useLocation()
  const tasks = (location.state as PrintWoChecklistsLocationState | null)?.tasks ?? []

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  if (tasks.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada WO untuk dicetak"
          description="Pilih WO dari daftar WO lalu tekan tombol Cetak Terpilih."
        />
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
        <Button onClick={() => window.print()}>Cetak {tasks.length} WO</Button>
      </div>

      <div id="wo-print-area" className="flex flex-col gap-8">
        {tasks.map((task, i) => (
          <WoPrintSection key={task.id} task={task} companySetting={companySetting} pageBreakAfter={i < tasks.length - 1} />
        ))}
      </div>
    </div>
  )
}
