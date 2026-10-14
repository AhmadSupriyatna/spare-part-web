import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowRight, Factory, Gauge, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { fetchLines } from '@/features/lines/api'
import { fetchMachineSummary, fetchMachines, fetchOutsideLineMachines } from '@/features/machines/api'
import { MachineReportPrintSection } from '@/features/machines/MachineReportPrintSection'
import { fetchCompanySetting } from '@/features/settings/api'
import { LineAssetReportPrintSection } from '@/features/reports/LineAssetReportPrintSection'
import type { Machine } from '@/types/tasks'
import { EmptyState } from '@/components/EmptyState'
import { QueryErrorState } from '@/components/QueryErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type ReportView = 'lines' | 'line' | 'outside-machines' | 'machine'

export function MachineReportTab({ branchId }: { branchId: number }) {
  const [view, setView] = useState<ReportView>('lines')
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(null)
  const [autoPrintLine, setAutoPrintLine] = useState(false)
  const [autoPrintMachine, setAutoPrintMachine] = useState(false)
  const branchName = useAuthStore((state) => state.user?.branches.find((branch) => branch.id === branchId)?.name)

  const {
    data: lines,
    isLoading: linesLoading,
    isError: linesError,
    refetch: refetchLines,
  } = useQuery({
    queryKey: ['lines', branchId],
    queryFn: () => fetchLines(branchId),
  })
  const selectedLine = lines?.find((line) => line.id === selectedLineId)
  const {
    data: lineMachines,
    isLoading: lineMachinesLoading,
    isError: lineMachinesError,
    refetch: refetchLineMachines,
  } = useQuery({
    queryKey: ['machines', selectedLineId],
    queryFn: () => fetchMachines(selectedLineId!),
    enabled: selectedLineId != null && (view === 'line' || view === 'machine'),
  })
  const lineMachineReportQueries = useQueries({
    queries: (view === 'line' ? lineMachines ?? [] : []).map((machine) => ({
      queryKey: ['machine-summary', machine.id],
      queryFn: () => fetchMachineSummary(machine.id),
      enabled: view === 'line',
    })),
  })
  const {
    data: outsideMachines,
    isLoading: outsideMachinesLoading,
    isError: outsideMachinesError,
    refetch: refetchOutsideMachines,
  } = useQuery({
    queryKey: ['outside-line-machines', branchId],
    queryFn: () => fetchOutsideLineMachines(branchId),
    enabled: view === 'outside-machines' || (view === 'machine' && selectedLineId == null),
  })
  const selectedMachine = useMemo<Machine | undefined>(
    () => [...(lineMachines ?? []), ...(outsideMachines ?? [])].find((machine) => machine.id === selectedMachineId),
    [lineMachines, outsideMachines, selectedMachineId],
  )
  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ['machine-summary', selectedMachineId],
    queryFn: () => fetchMachineSummary(selectedMachineId!),
    enabled: view === 'machine' && selectedMachineId != null,
  })
  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const lineMachineReports = lineMachineReportQueries.flatMap((query) => query.data ? [query.data] : [])
  const lineReportsLoading =
    view === 'line' && lineMachines != null && lineMachineReportQueries.some((query) => query.isLoading)
  const lineReportsError = lineMachineReportQueries.some((query) => query.isError)

  useEffect(() => {
    if (
      autoPrintLine &&
      view === 'line' &&
      lineMachines &&
      !lineReportsLoading &&
      !lineReportsError &&
      lineMachineReports.length === lineMachines.length
    ) {
      setAutoPrintLine(false)
      window.print()
    }
  }, [autoPrintLine, lineMachines, lineMachineReports.length, lineReportsError, lineReportsLoading, view])

  useEffect(() => {
    if (autoPrintMachine && view === 'machine' && report) {
      setAutoPrintMachine(false)
      window.print()
    }
  }, [autoPrintMachine, report, view])

  function openLine(lineId: number) {
    setSelectedLineId(lineId)
    setSelectedMachineId(null)
    setAutoPrintLine(false)
    setView('line')
  }

  function printLine(lineId: number) {
    setSelectedLineId(lineId)
    setSelectedMachineId(null)
    setAutoPrintLine(true)
    setView('line')
  }

  function openOutsideMachines() {
    setSelectedLineId(null)
    setSelectedMachineId(null)
    setView('outside-machines')
  }

  function openMachine(machine: Machine) {
    setSelectedMachineId(machine.id)
    setAutoPrintMachine(false)
    setView('machine')
  }

  function printMachine(machine: Machine) {
    setSelectedMachineId(machine.id)
    setAutoPrintMachine(true)
    setView('machine')
  }

  function showLines() {
    setView('lines')
    setSelectedLineId(null)
    setSelectedMachineId(null)
    setAutoPrintLine(false)
    setAutoPrintMachine(false)
  }

  function showLine() {
    setView('line')
    setSelectedMachineId(null)
    setAutoPrintMachine(false)
  }

  const selectedTitle = view === 'outside-machines' ? 'Machine di Luar Line' : selectedLine?.name
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Navigasi laporan aset" className="flex flex-wrap items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={showLines} aria-current={view === 'lines' ? 'page' : undefined}>
          Laporan Aset
        </Button>
        {view !== 'lines' && (
          <>
            <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            {view === 'outside-machines' ? (
              <span aria-current="page" className="font-medium">{selectedTitle}</span>
            ) : (
              <Button variant="ghost" size="sm" onClick={showLine} aria-current={view === 'line' ? 'page' : undefined}>
                {selectedLine?.name ?? 'Line'}
              </Button>
            )}
          </>
        )}
        {view === 'machine' && (
          <>
            <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
            <span aria-current="page" className="font-medium">{selectedMachine?.name ?? 'Machine'}</span>
          </>
        )}
      </nav>

      {view === 'lines' && (
        <section className="flex flex-col gap-3" aria-labelledby="asset-line-heading">
          <h2 id="asset-line-heading" className="text-sm font-medium">Pilih Line</h2>
          {linesError ? (
            <QueryErrorState title="Gagal memuat daftar Line" onRetry={() => refetchLines()} />
          ) : linesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(lines ?? []).map((line) => (
                <Card key={line.id} className="transition-colors hover:bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Factory className="size-4" />
                      </span>
                      <CardTitle>{line.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <span className="text-sm text-muted-foreground">Kode {line.code}</span>
                    <div className="flex items-center justify-between gap-2">
                      <Button size="sm" variant="outline" onClick={() => printLine(line.id)}>
                        <Printer />
                        Print
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openLine(line.id)}>
                        Buka Line
                        <ArrowRight />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="transition-colors hover:bg-muted/30">
                <button
                  type="button"
                  onClick={openOutsideMachines}
                  className="w-full rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Gauge className="size-4" />
                      </span>
                      <CardTitle>Machine di Luar Line</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Machine non-produksi</span>
                    <span className="flex items-center gap-1 text-primary">Lihat Machine <ArrowRight className="size-3.5" /></span>
                  </CardContent>
                </button>
              </Card>
            </div>
          )}
        </section>
      )}

      {view === 'line' && selectedLine && (
        <section className="flex flex-col gap-4" aria-labelledby="asset-line-detail-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="asset-line-detail-heading" className="text-lg font-semibold">{selectedLine.name}</h2>
              <p className="text-sm text-muted-foreground">
                Kode {selectedLine.code} · {lineMachinesLoading ? '…' : (lineMachines?.length ?? 0)} Machine
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={!lineMachines || lineReportsLoading || lineReportsError}
            >
              <Printer />
              Cetak Laporan Line
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <span className="text-sm text-muted-foreground">Running Hours</span>
                <span className="text-xl font-semibold tabular-nums">{Number(selectedLine.runtime_hours).toLocaleString('id-ID')} jam</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 p-4">
                <span className="text-sm text-muted-foreground">Jumlah Machine</span>
                <span className="text-xl font-semibold tabular-nums">{lineMachines?.length ?? (lineMachinesLoading ? '…' : 0)}</span>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Pilih Machine untuk membuka laporannya</h3>
            {lineMachinesError ? (
              <QueryErrorState title="Gagal memuat Machine di Line" onRetry={() => refetchLineMachines()} />
            ) : lineReportsError ? (
              <QueryErrorState
                title="Gagal memuat laporan lengkap Machine di Line"
                onRetry={() => lineMachineReportQueries.forEach((query) => query.isError && query.refetch())}
              />
            ) : lineMachinesLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : lineMachines?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {lineMachines.map((machine) => (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    onClick={() => openMachine(machine)}
                    onPrint={() => printMachine(machine)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Gauge} title="Belum ada Machine di Line ini" />
            )}
          </div>
        </section>
      )}

      {view === 'outside-machines' && (
        <section className="flex flex-col gap-3" aria-labelledby="outside-machines-heading">
          <h2 id="outside-machines-heading" className="text-lg font-semibold">Machine di Luar Line</h2>
          {outsideMachinesError ? (
            <QueryErrorState title="Gagal memuat Machine di luar Line" onRetry={() => refetchOutsideMachines()} />
          ) : outsideMachinesLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : outsideMachines?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {outsideMachines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  onClick={() => openMachine(machine)}
                  onPrint={() => printMachine(machine)}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Gauge} title="Belum ada Machine di luar Line" />
          )}
        </section>
      )}

      {view === 'machine' && (
        <section className="flex flex-col gap-3" aria-labelledby="asset-machine-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="asset-machine-heading" className="text-lg font-semibold">{selectedMachine?.name ?? 'Laporan Machine'}</h2>
              {selectedMachine && <p className="text-sm text-muted-foreground">{selectedMachine.code}</p>}
            </div>
            {report && (
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer />
                Cetak Laporan Machine
              </Button>
            )}
          </div>
          {reportError ? (
            <QueryErrorState title="Gagal memuat laporan Machine" onRetry={() => refetchReport()} />
          ) : reportLoading || !report ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="rounded-lg border bg-card p-4">
              <MachineReportPrintSection data={report} companySetting={companySetting} />
            </div>
          )}
        </section>
      )}

      {view === 'line' && selectedLine && lineMachines && (
        <PrintContainer>
          <LineAssetReportPrintSection
            line={selectedLine}
            machines={lineMachines}
            machineReports={lineMachineReports}
            branchName={branchName}
            companySetting={companySetting}
          />
        </PrintContainer>
      )}
      {view === 'machine' && report && (
        <PrintContainer>
          <MachineReportPrintSection data={report} companySetting={companySetting} />
        </PrintContainer>
      )}
    </div>
  )
}

function MachineCard({
  machine,
  onClick,
  onPrint,
}: {
  machine: Machine
  onClick: () => void
  onPrint: () => void
}) {
  return (
    <Card className="h-full transition-colors hover:bg-muted/40">
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md p-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-medium">{machine.name}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{machine.code}</span>
            </span>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onPrint}
          aria-label={`Cetak laporan ${machine.name}`}
          title={`Cetak laporan ${machine.name}`}
        >
          <Printer />
        </Button>
      </CardContent>
    </Card>
  )
}

function PrintContainer({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #central-asset-report, #central-asset-report * { visibility: visible; }
          #central-asset-report { position: absolute; inset: 0; display: block; padding: 16px; }
        }
      `}</style>
      <div id="central-asset-report" className="hidden rounded-lg border bg-card p-4 print:block print:border-0 print:p-0">
        {children}
      </div>
    </>
  )
}
