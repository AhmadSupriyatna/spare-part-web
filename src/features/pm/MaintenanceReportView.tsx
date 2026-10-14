import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, ClipboardList, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchLineRuntimeAt, fetchLines, fetchWoReportForLine } from '@/features/lines/api'
import { fetchMachines, fetchOutsideLineMachines, fetchWoReportForMachine } from '@/features/machines/api'
import { buildReportSections, monthLabel } from '@/features/pm/reportSections'
import { fetchSupervisorForBranch } from '@/features/users/api'
import { useAuthStore } from '@/stores/auth-store'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/EmptyState'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type ReportScope = 'machine' | 'line'
/** Only meaningful when scope is "machine" — a Line-scoped report has no meaning for a Machine outside any Line, so this choice doesn't exist there. */
type MachineLocation = 'inline' | 'outside'
type ReportPeriod = 'weekly' | 'monthly'
type ReportStep = 'scope' | 'location' | 'line' | 'machine' | 'period' | 'date'

const stepTitles: Record<ReportStep, string> = {
  scope: 'Jenis laporan',
  location: 'Lokasi Machine',
  line: 'Line',
  machine: 'Machine',
  period: 'Periode',
  date: 'Tanggal laporan',
}

function SelectionCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected && 'ring-2 ring-primary',
      )}
    >
      <Card className={cn('h-full transition-colors hover:bg-muted/40', selected && 'bg-primary/5')}>
        <CardContent className="flex h-full flex-col justify-center gap-1 p-3">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </CardContent>
      </Card>
    </button>
  )
}

/**
 * Builds a combined WO report through a guided selection flow:
 * scope → production location/asset → period.
 */
export function MaintenanceReportView({ branchId }: { branchId: number }) {
  const [period, setPeriod] = useState<ReportPeriod | null>(null)
  const [activeStep, setActiveStep] = useState<ReportStep>('scope')
  const [scope, setScope] = useState<ReportScope | null>(null)
  const [location, setLocation] = useState<MachineLocation | null>(null)
  const [lineId, setLineId] = useState<string>('')
  const [machineId, setMachineId] = useState<string>('')
  const [weekAnchor, setWeekAnchor] = useState(() => toDateKey(new Date()))
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [excludedTaskIds, setExcludedTaskIds] = useState<Set<number>>(new Set())
  const [isPreparingPrint, setIsPreparingPrint] = useState(false)
  const navigate = useNavigate()

  const activeBranch = useAuthStore((state) => state.user?.branches.find((b) => b.id === branchId))
  const { data: supervisorName } = useQuery({
    queryKey: ['supervisor-for-branch', branchId],
    queryFn: () => fetchSupervisorForBranch(branchId),
  })

  const {
    data: lines,
    isLoading: isLoadingLines,
    isError: isLinesError,
    refetch: refetchLines,
  } = useQuery({ queryKey: ['lines', branchId], queryFn: () => fetchLines(branchId) })
  const {
    data: outsideLineMachines,
    isLoading: isLoadingOutsideMachines,
    isError: isOutsideMachinesError,
    refetch: refetchOutsideMachines,
  } = useQuery({
    queryKey: ['outside-line-machines', branchId],
    queryFn: () => fetchOutsideLineMachines(branchId),
    enabled: scope === 'machine' && location === 'outside',
  })
  const {
    data: lineMachines,
    isLoading: isLoadingLineMachines,
    isError: isLineMachinesError,
    refetch: refetchLineMachines,
  } = useQuery({
    queryKey: ['machines', lineId],
    queryFn: () => fetchMachines(Number(lineId)),
    enabled: scope === 'machine' && location === 'inline' && !!lineId,
  })

  const selectedLine = lines?.find((line) => String(line.id) === lineId)
  const machineOptions = location === 'outside' ? outsideLineMachines : lineMachines
  const isLoadingMachines = location === 'outside' ? isLoadingOutsideMachines : isLoadingLineMachines
  const isMachinesError = location === 'outside' ? isOutsideMachinesError : isLineMachinesError
  const refetchMachines = location === 'outside' ? refetchOutsideMachines : refetchLineMachines
  const selectedMachine = machineOptions?.find((machine) => String(machine.id) === machineId)

  const steps: ReportStep[] = ['scope']
  if (scope === 'machine') {
    steps.push('location')
    if (location === 'inline') steps.push('line')
    if (location) steps.push('machine')
  } else if (scope === 'line') {
    steps.push('line')
  }
  if ((scope === 'line' && lineId) || (scope === 'machine' && machineId)) steps.push('period')
  if (period) steps.push('date')

  const completedStepTitles: Partial<Record<ReportStep, string>> = {
    scope: scope === 'machine' ? 'Machine' : scope === 'line' ? 'Line' : undefined,
    location: location === 'inline' ? 'Produksi' : location === 'outside' ? 'Diluar produksi' : undefined,
    line: selectedLine?.name,
    machine: selectedMachine?.name,
    period: period === 'weekly' ? 'Mingguan' : period === 'monthly' ? 'Bulanan' : undefined,
  }

  const { from, to, periodLabel } = useMemo(() => {
    if (period !== 'monthly') {
      const [y, m, d] = weekAnchor.split('-').map(Number)
      const jsDay = new Date(y, m - 1, d).getDay()
      const mondayOffset = (jsDay + 6) % 7
      const start = new Date(y, m - 1, d - mondayOffset)
      const end = new Date(y, m - 1, d - mondayOffset + 6)
      return {
        from: toDateKey(start),
        to: toDateKey(end),
        periodLabel: `${start.toLocaleDateString('id-ID', { dateStyle: 'medium' })} – ${end.toLocaleDateString('id-ID', { dateStyle: 'medium' })}`,
      }
    }

    const [y, m] = monthAnchor.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0)
    return { from: toDateKey(start), to: toDateKey(end), periodLabel: monthLabel(y, m - 1) }
  }, [period, weekAnchor, monthAnchor])

  const readyToFetch =
    period != null && (scope === 'machine' ? !!machineId : scope === 'line' && !!lineId)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['wo-report', scope, scope === 'machine' ? machineId : lineId, from, to],
    queryFn: () =>
      scope === 'machine'
        ? fetchWoReportForMachine(Number(machineId), from, to)
        : fetchWoReportForLine(Number(lineId), from, to),
    enabled: readyToFetch,
  })

  function toggleExcluded(taskId: number) {
    setExcludedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const selectedTasks = (tasks ?? []).filter((task) => !excludedTaskIds.has(task.id))

  async function handlePrint() {
    if (!period || !scope || !readyToFetch) return
    setIsPreparingPrint(true)
    try {
      const sections = buildReportSections(selectedTasks, period, from)

      // The report's Running Hours reflects the line's total as of the end
      // of the chosen period, not today's live figure — see
      // LineController::runtimeAsOf(). Fetched fresh here rather than read
      // off selectedLine, which only ever holds the current total.
      const runtimeHours = selectedLine ? await fetchLineRuntimeAt(selectedLine.id, to) : null

      navigate('/pm/maintenance-report/print', {
        state: {
          title: scope === 'line' ? 'Laporan Pemeriksaan Line' : 'Laporan Pemeriksaan Mesin',
          branchName: activeBranch?.name ?? null,
          machineName: scope === 'machine' ? (selectedMachine?.name ?? null) : null,
          lineName: selectedLine?.name ?? null,
          periodLabel,
          runtimeHours,
          supervisorName,
          sections,
        },
      })
    } finally {
      setIsPreparingPrint(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35fr_65fr]">
      <Card className="h-fit">
        <CardContent className="flex flex-col gap-4 pt-6">
          <nav aria-label="Navigasi pilihan laporan" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {steps.map((step, index) => {
              const title = completedStepTitles[step] ?? (step === activeStep ? stepTitles[step] : null)
              if (!title) return null
              const isActive = step === activeStep
              return (
                <span key={step} className="inline-flex items-center gap-1">
                  {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />}
                  {isActive ? (
                    <span aria-current="step" className="font-medium text-foreground">{title}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveStep(step)}
                      className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {title}
                    </button>
                  )}
                </span>
              )
            })}
          </nav>

          <div
            key={activeStep}
            className="flex flex-col gap-4 motion-reduce:animate-none animate-in fade-in-0 slide-in-from-right-2 duration-200"
          >
            {activeStep === 'scope' && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Pilih Jenis Laporan</p>
                <div className="grid grid-cols-2 gap-2">
                  <SelectionCard
                    title="Machine"
                    description="Laporan pemeriksaan per mesin"
                    selected={scope === 'machine'}
                    onClick={() => {
                      setScope('machine')
                      setLocation(null)
                      setLineId('')
                      setMachineId('')
                      setPeriod(null)
                      setExcludedTaskIds(new Set())
                      setActiveStep('location')
                    }}
                  />
                  <SelectionCard
                    title="Line"
                    description="Laporan pemeriksaan seluruh Line"
                    selected={scope === 'line'}
                    onClick={() => {
                      setScope('line')
                      setLocation(null)
                      setLineId('')
                      setMachineId('')
                      setPeriod(null)
                      setExcludedTaskIds(new Set())
                      setActiveStep('line')
                    }}
                  />
                </div>
              </div>
            )}

            {activeStep === 'location' && scope === 'machine' && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilih Lokasi Machine</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectionCard
                  title="Produksi"
                  description="Machine di dalam Line"
                  selected={location === 'inline'}
                  onClick={() => {
                    setLocation('inline')
                    setLineId('')
                    setMachineId('')
                    setPeriod(null)
                    setExcludedTaskIds(new Set())
                    setActiveStep('line')
                  }}
                />
                <SelectionCard
                  title="Diluar produksi"
                  description="Machine yang tidak berada di Line"
                  selected={location === 'outside'}
                  onClick={() => {
                    setLocation('outside')
                    setLineId('')
                    setMachineId('')
                    setPeriod(null)
                    setExcludedTaskIds(new Set())
                    setActiveStep('machine')
                  }}
                />
              </div>
            </div>
            )}

            {activeStep === 'line' && (scope === 'line' || (scope === 'machine' && location === 'inline')) && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilih Line</p>
              {isLinesError ? (
                <QueryErrorState onRetry={() => refetchLines()} title="Gagal memuat daftar Line" />
              ) : isLoadingLines ? (
                <Skeleton className="h-20 w-full" />
              ) : lines ? (
                lines.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {lines.map((line) => (
                      <SelectionCard
                        key={line.id}
                        title={line.name}
                        description={line.code}
                        selected={lineId === String(line.id)}
                        onClick={() => {
                          setLineId(String(line.id))
                          setMachineId('')
                          setPeriod(null)
                          setExcludedTaskIds(new Set())
                          setActiveStep(scope === 'line' ? 'period' : 'machine')
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada Line di plant ini.</p>
                )
              ) : null}
            </div>
            )}

            {activeStep === 'machine' &&
            scope === 'machine' &&
            (location === 'outside' || (location === 'inline' && !!lineId)) && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilih Machine</p>
              {isMachinesError ? (
                <QueryErrorState onRetry={() => refetchMachines()} title="Gagal memuat daftar Machine" />
              ) : isLoadingMachines ? (
                <Skeleton className="h-20 w-full" />
              ) : machineOptions ? (
                machineOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {machineOptions.map((machine) => (
                      <SelectionCard
                        key={machine.id}
                        title={machine.name}
                        description={machine.code}
                        selected={machineId === String(machine.id)}
                        onClick={() => {
                          setMachineId(String(machine.id))
                          setPeriod(null)
                          setExcludedTaskIds(new Set())
                          setActiveStep('period')
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada Machine pada pilihan ini.</p>
                )
              ) : null}
            </div>
            )}

            {activeStep === 'period' && ((scope === 'line' && !!lineId) || (scope === 'machine' && !!machineId)) && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilih Periode Laporan</p>
              <div className="grid grid-cols-2 gap-2">
                <SelectionCard
                  title="Mingguan"
                  description="Laporan per minggu"
                  selected={period === 'weekly'}
                  onClick={() => {
                    setPeriod('weekly')
                    setActiveStep('date')
                  }}
                />
                <SelectionCard
                  title="Bulanan"
                  description="Laporan per bulan"
                  selected={period === 'monthly'}
                  onClick={() => {
                    setPeriod('monthly')
                    setActiveStep('date')
                  }}
                />
              </div>
            </div>
            )}

            {activeStep === 'date' && period && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="size-4" />
                {period === 'weekly' ? 'Pilih Tanggal dalam Minggu' : 'Pilih Bulan'}
              </p>
              {period === 'weekly' ? (
                <Input
                  id="maintenance-report-period"
                  aria-label="Tanggal dalam minggu"
                  type="date"
                  value={weekAnchor}
                  onChange={(e) => setWeekAnchor(e.target.value || toDateKey(new Date()))}
                />
              ) : (
                <Input
                  id="maintenance-report-period"
                  aria-label="Bulan laporan"
                  type="month"
                  value={monthAnchor}
                  onChange={(e) => setMonthAnchor(e.target.value || monthAnchor)}
                />
              )}
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          {!readyToFetch ? (
            <EmptyState
              icon={ClipboardList}
              title="Pilih kriteria laporan"
              description="Pilih Machine atau Line, tentukan lokasi dan asetnya, lalu pilih periode untuk melihat WO."
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label>WO pada periode ini</Label>
                <Button size="sm" disabled={selectedTasks.length === 0 || isPreparingPrint} onClick={handlePrint}>
                  <Printer className="size-3.5" />
                  {isPreparingPrint ? 'Menyiapkan...' : `Cetak ${selectedTasks.length > 0 ? `(${selectedTasks.length} WO)` : ''}`}
                </Button>
              </div>
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !tasks || tasks.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tidak ada WO" description="Tidak ada WO yang jatuh tempo pada periode ini." />
              ) : (
                <div className="flex max-h-[calc(100svh-16rem)] flex-col gap-1.5 overflow-y-auto">
                  {tasks.map((task) => (
                    <label key={task.id} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox checked={!excludedTaskIds.has(task.id)} onCheckedChange={() => toggleExcluded(task.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {task.machine_name ? `${task.machine_name} — ` : ''}
                          {task.equipment_name} <span className="font-normal text-muted-foreground">(WO #{task.id})</span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{task.title}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
