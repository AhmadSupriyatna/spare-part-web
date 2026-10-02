import { useQueries, useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fetchUnitsForPart } from '@/features/part-units/api'
import { PassportUnitPicker } from '@/features/part-units/PassportUnitPicker'
import { fetchParts } from '@/features/parts/api'
import { PartQrPrintCard } from '@/features/parts/PartQrPrintCard'
import { partReplacementStrategyOptions } from '@/features/parts/schema'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import { useBranchStore } from '@/stores/branch-store'
import type { Part } from '@/types/inventory'
import { PartUnitQrLabelCard } from '@/components/PartUnitQrLabelCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PartUnit } from '@/types/relations'
import { toast } from 'sonner'

interface PrintEntry {
  part: Part
  copy: number
}

const strategyMeta = Object.fromEntries(partReplacementStrategyOptions.map((o) => [o.value, o]))

/**
 * QR-per-part-per-branch for the public breakdown-report scan flow
 * (`/breakdown/scan/:partId/:branchId`, no login) — split out of
 * PrintQrCodesPage.tsx so it can sit alongside a Line QR tab without one
 * print job's `#qr-print-area` interfering with the other's (Base UI's
 * Tabs unmounts inactive panels, so only one of the two is ever in the DOM
 * at a time anyway, but keeping them as separate components makes that
 * guarantee obvious rather than incidental).
 */
export function PartQrPrintSection() {
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [dialogPartIds, setDialogPartIds] = useState<number[]>([])
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [printEntries, setPrintEntries] = useState<PrintEntry[] | null>(null)
  const [printUnits, setPrintUnits] = useState<PartUnit[] | null>(null)
  const [excludedUnitIds, setExcludedUnitIds] = useState<Set<number>>(new Set())

  const activeBranchId = useBranchStore((state) => state.activeBranchId)
  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranch = branches.find((b) => b.id === activeBranchId)

  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: fetchParts,
  })

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const dialogParts = parts?.filter((p) => dialogPartIds.includes(p.id)) ?? []
  const dialogRegularParts = dialogParts.filter((p) => !p.has_passport)
  const dialogPassportParts = dialogParts.filter((p) => p.has_passport)

  const passportUnitQueries = useQueries({
    queries: dialogPassportParts.map((part) => ({
      queryKey: ['part-units', part.id],
      queryFn: () => fetchUnitsForPart(part.id),
      enabled: quantityDialogOpen,
    })),
  })
  const passportUnitsByPartId = new Map(
    dialogPassportParts.map((part, index) => [part.id, passportUnitQueries[index]?.data ?? []]),
  )
  const loadingPassportUnits = passportUnitQueries.some((q) => q.isLoading)

  const filteredParts = useMemo(
    () =>
      parts?.filter(
        (part) =>
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.item_master_no.toLowerCase().includes(search.toLowerCase()),
      ),
    [parts, search],
  )

  const allSelected = !!filteredParts?.length && filteredParts.every((p) => selectedIds.has(p.id))

  function toggleAll() {
    if (!filteredParts) return
    setSelectedIds((prev) => {
      if (allSelected) return new Set()
      const next = new Set(prev)
      filteredParts.forEach((p) => next.add(p.id))
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

  function openQuantityDialogFor(ids: number[]) {
    setQuantities((prev) => {
      const next = { ...prev }
      ids.forEach((id) => {
        next[id] = next[id] ?? '1'
      })
      return next
    })
    setDialogPartIds(ids)
    setExcludedUnitIds(new Set())
    setQuantityDialogOpen(true)
  }

  function toggleUnit(unitId: number) {
    setExcludedUnitIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  function confirmPrint() {
    const entries: PrintEntry[] = []
    dialogRegularParts.forEach((part) => {
      const qty = Math.max(1, Number(quantities[part.id]) || 1)
      for (let i = 0; i < qty; i++) {
        entries.push({ part, copy: i + 1 })
      }
    })
    const units = dialogPassportParts.flatMap(
      (part) =>
        (passportUnitsByPartId.get(part.id) ?? []).filter(
          (u) => u.status !== 'scrapped' && !excludedUnitIds.has(u.id),
        ),
    )
    if (entries.length === 0 && units.length === 0) {
      toast.error('Belum ada unit Passport yang dipilih untuk dicetak.')
      return
    }
    setPrintEntries(entries)
    setPrintUnits(units)
    setQuantityDialogOpen(false)
    requestAnimationFrame(() => window.print())
  }

  const scanBaseUrl = `${window.location.origin}/breakdown/scan`

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #part-qr-print-area, #part-qr-print-area * { visibility: visible; }
          #part-qr-print-area {
            position: absolute;
            inset: 0;
            padding: 8px;
            display: block;
          }
          #part-qr-print-area .qr-print-grid + .qr-print-grid {
            margin-top: 0.3cm;
          }
          #part-qr-print-area .qr-print-grid-parts {
            display: grid;
            grid-template-columns: repeat(auto-fill, 8.5cm);
            gap: 0.3cm;
            justify-content: start;
            align-content: start;
          }
          #part-qr-print-area .qr-print-grid-units {
            display: grid;
            grid-template-columns: repeat(auto-fill, 8.5cm);
            gap: 0.3cm;
            justify-content: start;
            align-content: start;
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">
          Centang part yang mau dicetak QR-nya, lalu tentukan berapa lembar per part.
        </p>
        <Button onClick={() => openQuantityDialogFor(Array.from(selectedIds))} disabled={selectedIds.size === 0}>
          Cetak Terpilih ({selectedIds.size})
        </Button>
      </div>

      {!activeBranchId && (
        <p className="text-sm text-destructive print:hidden">
          Pilih plant di header terlebih dahulu — QR akan menyimpan plant ini agar tidak perlu
          dipilih lagi saat scan.
        </p>
      )}

      <Input
        placeholder="Cari nama atau Item Master..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm print:hidden"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2 print:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
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
                <TableHead>Nama Part</TableHead>
                <TableHead>Item Master</TableHead>
                <TableHead>Strategi Penggantian</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts?.map((part) => (
                <TableRow key={part.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(part.id)}
                      onCheckedChange={() => toggleOne(part.id)}
                      aria-label={`Pilih ${part.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{part.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {part.item_master_no}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{strategyMeta[part.replacement_strategy].label}</TableCell>
                  <TableCell>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title={`Cetak QR ${part.name}`}
                      aria-label={`Cetak QR ${part.name}`}
                      onClick={() => openQuantityDialogFor([part.id])}
                    >
                      <PrinterIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredParts?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Tidak ada part yang cocok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cetak QR Terpilih</DialogTitle>
            <DialogDescription>
              Tentukan berapa lembar QR Breakdown yang mau dicetak untuk tiap part biasa. Untuk Part
              Passport, pilih unit fisik mana saja yang mau dicetak ulang labelnya.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {dialogRegularParts.map((part) => (
              <div key={part.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{part.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
                </div>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={quantities[part.id] ?? '1'}
                  onChange={(e) =>
                    setQuantities((prev) => ({ ...prev, [part.id]: e.target.value }))
                  }
                />
              </div>
            ))}
            {dialogPassportParts.map((part) => {
              const units = passportUnitsByPartId.get(part.id) ?? []
              return (
                <div
                  key={part.id}
                  className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{part.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{part.item_master_no}</p>
                  </div>
                  <PassportUnitPicker
                    units={units}
                    loading={loadingPassportUnits}
                    excludedUnitIds={excludedUnitIds}
                    onToggleUnit={toggleUnit}
                  />
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={confirmPrint} disabled={!activeBranchId || loadingPassportUnits}>
              Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(printEntries || printUnits) && activeBranchId && (
        <div id="part-qr-print-area" className="hidden">
          {printEntries && printEntries.length > 0 && (
            <div className="qr-print-grid qr-print-grid-parts">
              {printEntries.map((entry, index) => (
                <PartQrPrintCard
                  key={`${entry.part.id}-${entry.copy}-${index}`}
                  part={entry.part}
                  qrValue={`${scanBaseUrl}/${entry.part.id}/${activeBranchId}`}
                  companyName={companySetting?.name}
                  companyLogoUrl={companySetting?.logo_url}
                  branchLabel={activeBranch?.code}
                />
              ))}
            </div>
          )}
          {printUnits && printUnits.length > 0 && (
            <div className="qr-print-grid qr-print-grid-units">
              {printUnits.map((unit) => (
                <PartUnitQrLabelCard
                  key={unit.id}
                  unitId={unit.id}
                  partName={unit.part_name}
                  itemMasterNo={unit.item_master_no}
                  unitCode={unit.unit_code}
                  replacementStrategy={unit.replacement_strategy}
                  arrivedAt={unit.arrived_at}
                  companyName={companySetting?.name}
                  companyLogoUrl={companySetting?.logo_url}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
