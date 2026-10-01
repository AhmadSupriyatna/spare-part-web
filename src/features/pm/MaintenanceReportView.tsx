import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchLineRuntimeAt, fetchLines, fetchWoReportForLine } from '@/features/lines/api'
import { fetchMachines, fetchOutsideLineMachines, fetchWoReportForMachine } from '@/features/machines/api'
import { buildReportSections, monthLabel, type ReportPeriod } from '@/features/pm/reportSections'
import { fetchSupervisorForBranch } from '@/features/users/api'
import { useAuthStore } from '@/stores/auth-store'
import { toDateKey } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type ReportScope = 'machine' | 'line'
/** Only meaningful when scope is "machine" — a Line-scoped report has no meaning for a Machine outside any Line, so this choice doesn't exist there. */
type MachineLocation = 'inline' | 'outside'

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors',
            value === option.value ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * "Laporan" tab — Maintenance page's official Laporan Pemeriksaan Mesin
 * generator. Separate from the WO list on purpose: that tab stays a plain
 * list of individual WOs, this one builds the combined printed report (see
 * MaintenanceReportPrintSection for what gets printed — every WO's full
 * checklist renders inline, there is no separate per-WO print to refer
 * back to). Laid out as two groups — "where" (Cakupan/Lokasi/Line/Mesin)
 * then "when" (Jenis Laporan/Periode) — instead of one flat grid, so a
 * Mesin Luar Line pick doesn't have to masquerade as a fake "Line".
 */
export function MaintenanceReportView({ branchId }: { branchId: number }) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly')
  const [scope, setScope] = useState<ReportScope>('machine')
  const [location, setLocation] = useState<MachineLocation>('inline')
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

  const showLineSelect = scope === 'line' || (scope === 'machine' && location === 'inline')
  const showOutsideMachines = scope === 'machine' && location === 'outside'

  const { data: lines } = useQuery({ queryKey: ['lines', branchId], queryFn: () => fetchLines(branchId) })
  const { data: outsideLineMachines } = useQuery({
    queryKey: ['outside-line-machines', branchId],
    queryFn: () => fetchOutsideLineMachines(branchId),
    enabled: showOutsideMachines,
  })
  const { data: lineMachines } = useQuery({
    queryKey: ['machines', lineId],
    queryFn: () => fetchMachines(Number(lineId)),
    enabled: scope === 'machine' && location === 'inline' && !!lineId,
  })

  const selectedLine = lines?.find((line) => String(line.id) === lineId)
  const machineOptions = showOutsideMachines ? outsideLineMachines : lineMachines
  const selectedMachine = machineOptions?.find((machine) => String(machine.id) === machineId)

  const { from, to, periodLabel } = useMemo(() => {
    if (period === 'weekly') {
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

  const readyToFetch = scope === 'machine' ? !!machineId : !!lineId

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['wo-report', scope, scope === 'machine' ? machineId : lineId, from, to],
    queryFn: () => (scope === 'machine' ? fetchWoReportForMachine(Number(machineId), from, to) : fetchWoReportForLine(Number(lineId), from, to)),
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
    setIsPreparingPrint(true)
    try {
      const sections = buildReportSections(selectedTasks, period, from)
      const scanId = scope === 'machine' ? machineId : lineId
      const scanUrl = `${window.location.origin}/maintenance-report/scan?${new URLSearchParams({
        scope,
        id: scanId,
        from,
        to,
        period,
      }).toString()}`

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
          scanUrl,
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
          <div className="flex flex-col gap-2">
            <Label>Cakupan</Label>
            <SegmentedControl
              value={scope}
              onChange={(value) => {
                setScope(value)
                setLineId('')
                setMachineId('')
              }}
              options={[
                { value: 'machine', label: 'Per Mesin' },
                { value: 'line', label: 'Per Line' },
              ]}
            />
          </div>

          {scope === 'machine' && (
            <div className="flex flex-col gap-2">
              <Label>Lokasi Mesin</Label>
              <SegmentedControl
                value={location}
                onChange={(value) => {
                  setLocation(value)
                  setLineId('')
                  setMachineId('')
                }}
                options={[
                  { value: 'inline', label: 'Di Dalam Line' },
                  { value: 'outside', label: 'Mesin Luar Line' },
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showLineSelect && (
              <div className="flex flex-col gap-2">
                <Label>Line</Label>
                <Select
                  value={lineId}
                  onValueChange={(next) => {
                    setLineId(next ?? '')
                    setMachineId('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih line" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines?.map((line) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'machine' && (
              <div className="flex flex-col gap-2">
                <Label>Mesin</Label>
                <Select
                  value={machineId}
                  onValueChange={(next) => setMachineId(next ?? '')}
                  disabled={location === 'inline' && !lineId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mesin" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineOptions?.map((machine) => (
                      <SelectItem key={machine.id} value={String(machine.id)}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-t" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Jenis Laporan</Label>
              <SegmentedControl
                value={period}
                onChange={setPeriod}
                options={[
                  { value: 'weekly', label: 'Mingguan' },
                  { value: 'monthly', label: 'Bulanan' },
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="maintenance-report-period">{period === 'weekly' ? 'Minggu' : 'Bulan'}</Label>
              {period === 'weekly' ? (
                <Input
                  id="maintenance-report-period"
                  type="date"
                  value={weekAnchor}
                  onChange={(e) => setWeekAnchor(e.target.value || toDateKey(new Date()))}
                />
              ) : (
                <Input
                  id="maintenance-report-period"
                  type="month"
                  value={monthAnchor}
                  onChange={(e) => setMonthAnchor(e.target.value || monthAnchor)}
                />
              )}
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 pt-6">
          {!readyToFetch ? (
            <EmptyState
              icon={ClipboardList}
              title="Pilih cakupan dulu"
              description={`Pilih ${scope === 'machine' ? 'mesin' : 'line'} di kiri untuk melihat WO pada periode ini.`}
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
