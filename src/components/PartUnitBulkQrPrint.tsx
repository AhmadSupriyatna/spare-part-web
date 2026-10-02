import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { PartUnitQrLabelCard } from '@/components/PartUnitQrLabelCard'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PartReplacementStrategy } from '@/types/inventory'

export interface NewPartUnit {
  id: number
  part_name?: string
  item_master_no?: string
  replacement_strategy?: PartReplacementStrategy | null
  unit_code: string | null
  arrived_at: string | null
}

interface PartUnitBulkQrPrintProps {
  units: NewPartUnit[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Part Passport" — Stock In for a has_passport Part returns `new_units`,
 * one row per quantity just received. This surfaces that as a confirmation
 * dialog ("N unit baru, cetak QR sekarang?") rather than a silent side
 * effect, then prints all of them at once in a grid — same print-area CSS
 * pattern as PartQrBulkPrintDialog, same label markup as the single-unit
 * PartUnitQrPrint (via the shared PartUnitQrLabelCard), just without that
 * dialog's per-part quantity picker since the quantity here is already
 * fixed by what was just received.
 */
export function PartUnitBulkQrPrint({ units, open, onOpenChange }: PartUnitBulkQrPrintProps) {
  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  function confirmPrint() {
    onOpenChange(false)
    requestAnimationFrame(() => window.print())
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #part-unit-bulk-qr-print-area, #part-unit-bulk-qr-print-area * { visibility: visible; }
          #part-unit-bulk-qr-print-area {
            position: absolute;
            inset: 0;
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(auto-fill, 8.5cm);
            gap: 0.3cm;
            justify-content: start;
            align-content: start;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cetak QR Unit Baru</DialogTitle>
            <DialogDescription>
              {units.length} unit baru terdaftar dengan Part Passport, lengkap dengan tanggal kedatangan. Cetak QR-nya
              sekarang?
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-60 flex-col gap-1 overflow-y-auto text-sm">
            {units.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <span className="truncate">{unit.part_name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">Unit {unit.unit_code}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Nanti Saja
            </Button>
            <Button onClick={confirmPrint}>
              <Printer />
              Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {units.length > 0 && (
        <div id="part-unit-bulk-qr-print-area" className="hidden">
          {units.map((unit) => (
            <PartUnitQrLabelCard
              key={unit.id}
              unitId={unit.id}
              partName={unit.part_name}
              itemMasterNo={unit.item_master_no}
              replacementStrategy={unit.replacement_strategy}
              unitCode={unit.unit_code}
              arrivedAt={unit.arrived_at}
              companyName={companySetting?.name}
              companyLogoUrl={companySetting?.logo_url}
            />
          ))}
        </div>
      )}
    </>
  )
}
