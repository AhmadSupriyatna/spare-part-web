import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchLineKwhReport, fetchLineRuntimeReport } from '@/features/lines/api'
import { LineMonthlyReportPrintSection } from '@/features/lines/LineMonthlyReportPrintSection'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

/**
 * "Laporan kWh" / "Laporan Running Hours Line" — every Line in the active
 * branch, aggregated per calendar month, previewed on screen with the
 * exact same table that gets printed (LineMonthlyReportPrintSection),
 * then handed off to PrintLineMonthlyReportPage via router state.
 */
export function LineReportsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  if (!activeBranchId) {
    return <p className="text-muted-foreground">Pilih plant terlebih dahulu.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Laporan Line" description="Rekap bulanan kWh dan Running Hours untuk seluruh Line di plant yang sedang aktif." />

      <Tabs defaultValue="kwh">
        <TabsList>
          <TabsTrigger value="kwh">Laporan kWh</TabsTrigger>
          <TabsTrigger value="runtime">Laporan Running Hours Line</TabsTrigger>
        </TabsList>
        <TabsContent value="kwh" className="mt-4">
          <MonthlyReportView metric="kwh" branchId={activeBranchId} />
        </TabsContent>
        <TabsContent value="runtime" className="mt-4">
          <MonthlyReportView metric="runtime" branchId={activeBranchId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MonthlyReportView({ metric, branchId }: { metric: 'kwh' | 'runtime'; branchId: number }) {
  const navigate = useNavigate()
  const activeBranchName =
    useAuthStore((state) => state.user?.branches.find((branch) => branch.id === branchId)?.name) ?? ''
  const [month, setMonth] = useState(currentMonthValue())

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const { data: kwhRows, isLoading: kwhLoading } = useQuery({
    queryKey: ['line-kwh-report', branchId, month],
    queryFn: () => fetchLineKwhReport(branchId, month),
    enabled: metric === 'kwh',
  })

  const { data: runtimeRows, isLoading: runtimeLoading } = useQuery({
    queryKey: ['line-runtime-report', branchId, month],
    queryFn: () => fetchLineRuntimeReport(branchId, month),
    enabled: metric === 'runtime',
  })

  const isLoading = metric === 'kwh' ? kwhLoading : runtimeLoading

  function handlePrint() {
    navigate('/lines/monthly-report/print', {
      state:
        metric === 'kwh'
          ? { metric: 'kwh', branchName: activeBranchName, monthLabel: monthLabel(month), rows: kwhRows ?? [] }
          : { metric: 'runtime', branchName: activeBranchName, monthLabel: monthLabel(month), rows: runtimeRows ?? [] },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`month-${metric}`}>Bulan</Label>
          <Input
            id={`month-${metric}`}
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading}>
          <Printer />
          Cetak
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="rounded-lg border bg-card p-4">
          {metric === 'kwh' ? (
            <LineMonthlyReportPrintSection
              metric="kwh"
              rows={kwhRows ?? []}
              branchName={activeBranchName}
              monthLabel={monthLabel(month)}
              companySetting={companySetting}
            />
          ) : (
            <LineMonthlyReportPrintSection
              metric="runtime"
              rows={runtimeRows ?? []}
              branchName={activeBranchName}
              monthLabel={monthLabel(month)}
              companySetting={companySetting}
            />
          )}
        </div>
      )}
    </div>
  )
}
