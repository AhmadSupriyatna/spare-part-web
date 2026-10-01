import { useQuery } from '@tanstack/react-query'
import { Factory, PrinterIcon } from 'lucide-react'
import { useState } from 'react'
import { fetchLines } from '@/features/lines/api'
import { fetchCompanySetting } from '@/features/settings/api'
import { useBranchStore } from '@/stores/branch-store'
import { EquipmentQrPrintCard } from '@/components/EquipmentQrPrintCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/**
 * QR-per-Line for the login-gated runtime-log scan flow
 * (`/lines/:id/log-runtime`) — one label per Line (mounted physically on
 * it), so unlike the Part tab there's no per-item copy count to ask for;
 * select the Lines that need a fresh label and print straight away.
 */
export function LineQrPrintSection() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [printIds, setPrintIds] = useState<number[] | null>(null)

  const activeBranchId = useBranchStore((state) => state.activeBranchId)

  const { data: lines, isLoading } = useQuery({
    queryKey: ['lines', activeBranchId],
    queryFn: () => fetchLines(activeBranchId!),
    enabled: !!activeBranchId,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const allSelected = !!lines?.length && lines.every((l) => selectedIds.has(l.id))

  function toggleAll() {
    if (!lines) return
    setSelectedIds((prev) => {
      if (allSelected) return new Set()
      const next = new Set(prev)
      lines.forEach((l) => next.add(l.id))
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

  const printLines = (lines ?? []).filter((l) => printIds?.includes(l.id))
  const scanBaseUrl = `${window.location.origin}/lines`

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #line-qr-print-area, #line-qr-print-area * { visibility: visible; }
          #line-qr-print-area {
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
          Centang Line yang perlu label QR baru — QR ini dipindai untuk mencatat jam operasi, dan
          mengharuskan login terlebih dahulu (Engineer/Supervisor/Admin Spare Part/Superadmin).
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
                <TableHead>Nama Line</TableHead>
                <TableHead>Jam Operasi Saat Ini</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines?.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(line.id)}
                      onCheckedChange={() => toggleOne(line.id)}
                      aria-label={`Pilih ${line.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{line.code}</TableCell>
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell className="text-muted-foreground">{line.runtime_hours} jam</TableCell>
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={`Cetak QR ${line.name}`}
                      aria-label={`Cetak QR ${line.name}`}
                      onClick={() => printSelected([line.id])}
                    >
                      <PrinterIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lines?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada Line di plant ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {printLines.length > 0 && (
        <div id="line-qr-print-area" className="hidden">
          {printLines.map((line) => (
            <EquipmentQrPrintCard
              key={line.id}
              badge="LINE"
              icon={Factory}
              title={line.name}
              code={line.code}
              subLabel="Line Produksi"
              purpose="Scan untuk Catat Jam Operasi"
              qrValue={`${scanBaseUrl}/${line.id}/log-runtime`}
              companyName={companySetting?.name}
              companyLogoUrl={companySetting?.logo_url}
            />
          ))}
        </div>
      )}
    </div>
  )
}
