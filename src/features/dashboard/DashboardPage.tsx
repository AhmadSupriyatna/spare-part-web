import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ClipboardList, type LucideIcon, Package, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { fetchStockAlerts } from '@/features/alerts/api'
import { fetchReplacementRequests } from '@/features/breakdown/api'
import { fetchParts } from '@/features/parts/api'
import { fetchMyTasks } from '@/features/tasks/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface SummaryCardProps {
  title: string
  value: number
  icon: LucideIcon
  href: string
  tone?: 'default' | 'warning' | 'destructive'
  loading?: boolean
}

const toneClasses: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
}

function SummaryCard({ title, value, icon: Icon, href, tone = 'default', loading }: SummaryCardProps) {
  return (
    <Link to={href}>
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="flex items-center gap-4">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', activeBranchId],
    queryFn: () => fetchStockAlerts(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'mine'],
    queryFn: fetchMyTasks,
  })

  const { data: pendingReplacements, isLoading: replacementsLoading } = useQuery({
    queryKey: ['replacement-requests', activeBranchId, 'pending'],
    queryFn: () => fetchReplacementRequests(activeBranchId!, 'pending'),
    enabled: !!activeBranchId,
  })

  const activeTaskCount =
    tasks?.filter((task) => task.status === 'pending' || task.status === 'in_progress').length ?? 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Halo, ${user?.name?.split(' ')[0] ?? 'kamu'}`}
        description={
          <>
            Peran: {user?.roles.join(', ') || '-'} &middot; Cabang:{' '}
            {user?.branches.map((branch) => branch.name).join(', ') || '-'}
          </>
        }
      />

      {!activeBranchId ? (
        <p className="text-sm text-muted-foreground">
          Pilih cabang di header untuk melihat ringkasan stok & breakdown cabang tersebut.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Part"
            value={parts?.length ?? 0}
            icon={Package}
            href="/parts"
            loading={partsLoading}
          />
          <SummaryCard
            title="Peringatan Stok"
            value={alerts?.length ?? 0}
            icon={AlertTriangle}
            href="/alerts"
            tone={alerts && alerts.length > 0 ? 'destructive' : 'default'}
            loading={alertsLoading}
          />
          <SummaryCard
            title="Tugas Saya Aktif"
            value={activeTaskCount}
            icon={ClipboardList}
            href="/my-tasks"
            loading={tasksLoading}
          />
          <SummaryCard
            title="Breakdown Menunggu"
            value={pendingReplacements?.length ?? 0}
            icon={ShieldCheck}
            href="/breakdown/approvals"
            tone={pendingReplacements && pendingReplacements.length > 0 ? 'warning' : 'default'}
            loading={replacementsLoading}
          />
        </div>
      )}
    </div>
  )
}
