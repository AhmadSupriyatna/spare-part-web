import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { fetchPublicMaintenanceReport } from '@/features/pm/api'
import { MaintenanceReportPrintSection } from '@/features/pm/MaintenanceReportPrintSection'
import { buildReportSections, type ReportPeriod } from '@/features/pm/reportSections'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * QR Validator's digital view — scanning the QR printed on a Laporan
 * Pemeriksaan Mesin lands here with no login, same shop-floor-friendly
 * access level as MachineMonitoringPage. Renders the exact same
 * MaintenanceReportPrintSection the paper copy used, built from the same
 * scope/id/from/to/period the QR encoded — confirms the paper report is
 * genuine and lets anyone see it digitally, but reflects current live
 * data rather than a frozen snapshot of what was true when it was printed.
 */
export function MaintenanceReportScanPage() {
  const [searchParams] = useSearchParams()
  const scope = searchParams.get('scope')
  const id = Number(searchParams.get('id'))
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const period: ReportPeriod = searchParams.get('period') === 'monthly' ? 'monthly' : 'weekly'
  const isValidScope = scope === 'machine' || scope === 'line'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-wo-report', scope, id, from, to],
    queryFn: () => fetchPublicMaintenanceReport(scope as 'machine' | 'line', id, from, to),
    enabled: isValidScope && Number.isFinite(id) && !!from && !!to,
  })

  return (
    <div className="min-h-svh bg-muted/40 p-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <Card className="border-success/40 bg-success/5">
          <CardContent className="flex items-center gap-2 pt-6 text-sm text-success">
            <ShieldCheck className="size-4.5 shrink-0" />
            Dokumen ini terverifikasi asli — versi digital dari Laporan Pemeriksaan Mesin yang dicetak.
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : isError || !data ? (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              Laporan tidak ditemukan, atau QR ini sudah tidak berlaku.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <MaintenanceReportPrintSection
                title={data.title}
                branchName={data.branch_name}
                machineName={data.machine_name}
                lineName={data.line_name}
                periodLabel={`${new Date(data.from).toLocaleDateString('id-ID', { dateStyle: 'medium' })} – ${new Date(data.to).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`}
                runtimeHours={data.runtime_hours}
                supervisorName={data.supervisor_name}
                sections={buildReportSections(data.tasks, period, data.from)}
                companySetting={data.company}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
