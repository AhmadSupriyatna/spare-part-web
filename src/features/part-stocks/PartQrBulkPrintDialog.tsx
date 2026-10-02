import { useQueries, useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchUnitsForPart } from '@/features/part-units/api'
import { PassportUnitPicker } from '@/features/part-units/PassportUnitPicker'
import { PartQrPrintCard } from '@/features/parts/PartQrPrintCard'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import type { Part, PartStock } from '@/types/inventory'
import { PartUnitQrLabelCard } from '@/components/PartUnitQrLabelCard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { PartUnit } from '@/types/relations'

interface PartQrBulkPrintDialogProps {
  parts: Part[]
  /** Matched to `parts` by part_id — only used to print the location alongside each QR; omit where there's no stock context. */
  stocks?: PartStock[]
  branchId: number
  trigger: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Kelola Stok's "Cetak QR Terpilih (N)" (and the per-row single-part Print
 * action). A regular part prints N copies of the generic Breakdown-report
 * PartQrPrintCard (`/breakdown/scan/:partId/:branchId`), same as the Cetak
 * QR Code page's Part tab (PartQrPrintSection). A "Part Passport" part is
 * different: it has no single part-level QR to speak of, since the whole
 * point is each physical unit having its own — so instead it prints one
 * PartUnitQrLabelCard (with arrival date) per unit already registered for
 * that part, the exact same label the post-Stock-In bulk print uses.
 */
export function PartQrBulkPrintDialog({
  parts,
  stocks,
  branchId,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: PartQrBulkPrintDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const quantityDialogOpen = openProp ?? internalOpen
  const setQuantityDialogOpen = onOpenChangeProp ?? setInternalOpen
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [printEntries, setPrintEntries] = useState<{ part: Part; copy: number }[] | null>(null)
  const [printUnits, setPrintUnits] = useState<PartUnit[] | null>(null)
  const [excludedUnitIds, setExcludedUnitIds] = useState<Set<number>>(new Set())

  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranch = branches.find((b) => b.id === branchId)
  const stockByPartId = new Map(stocks?.map((stock) => [stock.part_id, stock]))

  const regularParts = parts.filter((part) => !part.has_passport)
  const passportParts = parts.filter((part) => part.has_passport)

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const passportUnitQueries = useQueries({
    queries: passportParts.map((part) => ({
      queryKey: ['part-units', part.id],
      queryFn: () => fetchUnitsForPart(part.id),
      enabled: quantityDialogOpen,
    })),
  })
  const passportUnitsByPartId = new Map(
    passportParts.map((part, index) => [part.id, passportUnitQueries[index]?.data ?? []]),
  )
  const loadingPassportUnits = passportUnitQueries.some((q) => q.isLoading)

  useEffect(() => {
    if (!quantityDialogOpen) return
    setQuantities((prev) => {
      const next = { ...prev }
      regularParts.forEach((part) => {
        next[part.id] = next[part.id] ?? '1'
      })
      return next
    })
    setExcludedUnitIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantityDialogOpen, parts])

  function toggleUnit(unitId: number) {
    setExcludedUnitIds((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  function confirmPrint() {
    const entries: { part: Part; copy: number }[] = []
    regularParts.forEach((part) => {
      const qty = Math.max(1, Number(quantities[part.id]) || 1)
      for (let i = 0; i < qty; i++) {
        entries.push({ part, copy: i + 1 })
      }
    })
    const units = passportParts.flatMap(
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
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #inventory-qr-print-area, #inventory-qr-print-area * { visibility: visible; }
          #inventory-qr-print-area {
            position: absolute;
            inset: 0;
            padding: 12px;
            display: block;
          }
          #inventory-qr-print-area .qr-print-grid + .qr-print-grid {
            margin-top: 0.3cm;
          }
          #inventory-qr-print-area .qr-print-grid-parts {
            display: grid;
            grid-template-columns: repeat(auto-fill, 8.5cm);
            gap: 0.3cm;
            justify-content: start;
            align-content: start;
          }
          #inventory-qr-print-area .qr-print-grid-units {
            display: grid;
            grid-template-columns: repeat(auto-fill, 8.5cm);
            gap: 0.3cm;
            justify-content: start;
            align-content: start;
          }
        }
      `}</style>

      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogTrigger render={trigger as React.ReactElement} />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cetak QR Terpilih</DialogTitle>
            <DialogDescription>
              Tentukan berapa lembar QR Breakdown yang mau dicetak untuk tiap part biasa. Untuk Part
              Passport, pilih unit fisik mana saja yang mau dicetak ulang labelnya.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {regularParts.map((part) => (
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
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [part.id]: e.target.value }))}
                />
              </div>
            ))}
            {passportParts.map((part) => {
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
            <Button onClick={confirmPrint} disabled={loadingPassportUnits}>
              <Printer />
              Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(printEntries || printUnits) && (
        <div id="inventory-qr-print-area" className="hidden">
          {printEntries && printEntries.length > 0 && (
            <div className="qr-print-grid qr-print-grid-parts">
              {printEntries.map((entry, index) => {
                const stock = stockByPartId.get(entry.part.id)
                return (
                  <PartQrPrintCard
                    key={`${entry.part.id}-${entry.copy}-${index}`}
                    part={entry.part}
                    qrValue={`${scanBaseUrl}/${entry.part.id}/${branchId}`}
                    companyName={companySetting?.name}
                    companyLogoUrl={companySetting?.logo_url}
                    branchLabel={activeBranch?.code}
                    locationLabel={stock?.location_code}
                  />
                )
              })}
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
    </>
  )
}
