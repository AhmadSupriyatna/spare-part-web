import { ArrowLeft, ArrowRight, CalendarDays, ClipboardCheck, Factory, FileWarning, Gauge, PackageSearch, Wrench } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { LineReportsPage } from '@/features/lines/LineReportsPage'
import { MachineReportTab } from '@/features/reports/MachineReportTab'
import { MaintenanceReportView } from '@/features/pm/MaintenanceReportView'
import { PmScheduleReport } from '@/features/pm/PmScheduleReport'
import { Fp3ListPage } from '@/features/fp3/Fp3ListPage'
import { RepairReportView } from '@/features/part-repairs/RepairReportView'
import { StockLedgerPage } from '@/features/part-stocks/StockLedgerPage'
import { useBranchStore } from '@/stores/branch-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

const reportOptions = [
  {
    slug: 'pemeriksaan',
    title: 'Work Order Report',
    description: 'Choose a machine or production line, then view its weekly or monthly work order reports.',
    icon: ClipboardCheck,
    className: 'bg-primary/10 text-primary',
  },
  {
    slug: 'pm-schedule',
    title: 'PM Schedule',
    description: 'Print an annual January–December schedule by production line for Task Library and Part Lifetime work orders.',
    icon: CalendarDays,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    slug: 'mesin',
    title: 'Asset Report',
    description: 'View production line summaries or browse and print reports for individual machines.',
    icon: Gauge,
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    slug: 'line',
    title: 'Running Hours & Energy',
    description: 'Review monthly energy consumption and running hours for all production lines.',
    icon: Factory,
    className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    slug: 'repair',
    title: 'Part Repair',
    description: 'Review repair progress and select part repair history to print.',
    icon: Wrench,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    slug: 'fp3',
    title: 'FP3 Requests',
    description: 'Review FP3 requests by date range and status.',
    icon: FileWarning,
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    slug: 'stok',
    title: 'Stock Transactions',
    description: 'Review stock receipts, usage, and adjustments by date range.',
    icon: PackageSearch,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
] as const

type ReportSlug = (typeof reportOptions)[number]['slug']

const legacyReportSlugs: Record<string, ReportSlug | null> = {
  pemeriksaan: 'pemeriksaan',
  'pm-schedule': 'pm-schedule',
  line: 'line',
  mesin: 'mesin',
  stok: 'stok',
  repair: 'repair',
  riwayat: null,
  fp3: 'fp3',
}

function isReportSlug(value: string | undefined): value is ReportSlug {
  return reportOptions.some((report) => report.slug === value)
}

export function ReportsPage() {
  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const { reportType } = useParams<{ reportType: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const legacyTab = searchParams.get('tab')
  const selectedReport = isReportSlug(reportType) ? reportOptions.find((report) => report.slug === reportType) : undefined

  useEffect(() => {
    if (legacyTab) {
      const legacySlug = legacyReportSlugs[legacyTab]
      navigate(legacySlug ? `/reports/${legacySlug}` : '/reports', { replace: true })
    } else if (reportType && !isReportSlug(reportType)) {
      navigate('/reports', { replace: true })
    }
  }, [legacyTab, navigate, reportType])

  if (!selectedReport) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Reports" description="Choose a report to view." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {reportOptions.map(({ slug, title, description, icon: Icon, className }) => (
            <Link
              key={slug}
              to={`/reports/${slug}`}
              className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="h-full transition-colors group-hover:bg-muted/40 group-focus-visible:bg-muted/40">
                <CardHeader>
                  <div className={`mb-2 flex size-10 items-center justify-center rounded-lg ${className}`}>
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {title}
                    <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const backButton = (
    <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>
      <ArrowLeft />
      All Reports
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={selectedReport.title} action={backButton} />
      {selectedReport.slug === 'pemeriksaan' &&
        (activeBranchId ? (
          <MaintenanceReportView branchId={activeBranchId} />
        ) : (
          <p className="text-sm text-muted-foreground">Pilih plant terlebih dahulu.</p>
        ))}
      {selectedReport.slug === 'pm-schedule' && <PmScheduleReport />}
      {selectedReport.slug === 'fp3' && <Fp3ListPage showPageHeader={false} />}
      {selectedReport.slug === 'line' && <LineReportsPage showPageHeader={false} />}
      {selectedReport.slug === 'mesin' &&
        (activeBranchId ? (
          <MachineReportTab branchId={activeBranchId} />
        ) : (
          <p className="text-sm text-muted-foreground">Pilih plant terlebih dahulu.</p>
        ))}
      {selectedReport.slug === 'stok' && <StockLedgerPage showPageHeader={false} />}
      {selectedReport.slug === 'repair' &&
        (activeBranchId ? (
          <RepairReportView branchId={activeBranchId} />
        ) : (
          <p className="text-sm text-muted-foreground">Pilih plant terlebih dahulu.</p>
        ))}
    </div>
  )
}
