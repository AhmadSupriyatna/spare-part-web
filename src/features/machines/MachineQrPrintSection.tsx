import { useQueries, useQuery } from '@tanstack/react-query'
import { Cog, PrinterIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchLines } from '@/features/lines/api'
import { fetchMachines, fetchOutsideLineMachines } from '@/features/machines/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useBranchStore } from '@/stores/branch-store'
import type { Machine } from '@/types/tasks'
import { EquipmentQrPrintCard } from '@/components/EquipmentQrPrintCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface PrintableMachine extends Machine {
  location_label: string
}

/**
 * QR-per-Mesin for the public "Monitoring Life Time Mesin" scan flow
 * (`/machines/scan/:machineId`, no login) — one label per Machine, both
 * production (grouped under their Line) and "Mesin Luar Line". Mirrors
 * LineQrPrintSection exactly, just aggregating machines from every Line
 * plus the outside-line list, since there's no single "every machine in
 * this branch" endpoint.
 */
export function MachineQrPrintSection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [printIds, setPrintIds] = useState<number[] | null>(null)

  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: lines, isLoading: linesLoading } = useQuery({
    queryKey: ['lines', activeBranchId],
    queryFn: () => fetchLines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const lineMachineQueries = useQueries({
    queries: (lines ?? []).map((line) => ({
      queryKey: ['machines', line.id],
      queryFn: () => fetchMachines(line.id),
    })),
  })

  const { data: outsideLineMachines, isLoading: outsideLoading } = useQuery({
    queryKey: ['outside-line-machines', activeBranchId],
    queryFn: () => fetchOutsideLineMachines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const isLoading = linesLoading || outsideLoading || lineMachineQueries.some((q) => q.isLoading)

  const machines = useMemo<PrintableMachine[]>(() => {
    const fromLines = (lines ?? []).flatMap((line, index) =>
      (lineMachineQueries[index]?.data ?? []).map((machine) => ({ ...machine, location_label: line.name })),
    )
    const outside = (outsideLineMachines ?? []).map((machine) => ({ ...machine, location_label: 'Luar Line' }))
    return [...fromLines, ...outside]
  }, [lines, lineMachineQueries, outsideLineMachines])

  const allSelected = !!machines.length && machines.every((m) => selectedIds.has(m.id))

  function toggleAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set()
      const next = new Set(prev)
      machines.forEach((m) => next.add(m.id))
      return next
    })
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function printSelected(ids: number[]) {
    setPrintIds(ids)
    requestAnimationFrame(() => window.print())
  }

  const printMachines = machines.filter((m) => printIds?.includes(m.id))
  const scanBaseUrl = `${window.location.origin}/machines/scan`

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #machine-qr-print-area, #machine-qr-print-area * { visibility: visible; }
          #machine-qr-print-area {
            position: absolute;
            inset: 0;
            padding: 8px;
            display: grid;
            grid-template-columns: repeat(auto-fill, 6.5cm);
            gap: 0.4cm;
            justify-content: start;
            align-content: start;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          Centang Mesin yang perlu label QR baru — QR ini dipindai untuk membuka halaman Monitoring
          Life Time Mesin (jadwal maintenance, life time part, dan chart), tanpa perlu login.
        </p>
        <Button onClick={() => printSelected(Array.from(selectedIds))} disabled={selectedIds.size === 0}>
          Cetak Terpilih ({selectedIds.size})
        </Button>
      </div>

      {!activeBranchId ? (
        <p className="text-sm text-destructive print:hidden">Pilih plant di header terlebih dahulu.</p>
      ) : isLoading ? (
        <div className="flex flex-col gap-2 print:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border print:hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Pilih semua" />
                </TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Mesin</TableHead>
                <TableHead>Line / Lokasi</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(machine.id)}
                      onCheckedChange={() => toggleOne(machine.id)}
                      aria-label={`Pilih ${machine.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{machine.code}</TableCell>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell className="text-muted-foreground">{machine.location_label}</TableCell>
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={`Cetak QR ${machine.name}`}
                      aria-label={`Cetak QR ${machine.name}`}
                      onClick={() => printSelected([machine.id])}
                    >
                      <PrinterIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {machines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada Mesin di plant ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {printMachines.length > 0 && (
        <div id="machine-qr-print-area" className="hidden">
          {printMachines.map((machine) => (
            <EquipmentQrPrintCard
              key={machine.id}
              badge="MESIN"
              icon={Cog}
              title={machine.name}
              code={machine.code}
              subLabel={machine.location_label}
              purpose="Scan untuk Monitoring Life Time"
              qrValue={`${scanBaseUrl}/${machine.id}`}
              companyName={companySetting?.name}
              companyLogoUrl={companySetting?.logo_url}
            />
          ))}
        </div>
      )}
    </div>
  )
}
