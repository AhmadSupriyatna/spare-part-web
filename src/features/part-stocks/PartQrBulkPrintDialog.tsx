import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PartQrPrintCard } from '@/features/parts/PartQrPrintCard'
import { fetchCompanySetting } from '@/features/settings/api'
import { useAuthStore } from '@/stores/auth-store'
import type { Part, PartStock } from '@/types/inventory'
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
 * action) — same QR-per-part-per-branch target
 * (`/breakdown/scan/:partId/:branchId`) and same PartQrPrintCard as the
 * Cetak QR Code page's Part tab (PartQrPrintSection), so a sheet printed
 * from either place looks identical; the only difference here is a fixed
 * set of already-selected parts instead of its own search+select UI.
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

  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranch = branches.find((b) => b.id === branchId)
  const stockByPartId = new Map(stocks?.map((stock) => [stock.part_id, stock]))

  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  useEffect(() => {
    if (!quantityDialogOpen) return
    setQuantities((prev) => {
      const next = { ...prev }
      parts.forEach((part) => {
        next[part.id] = next[part.id] ?? '1'
      })
      return next
    })
  }, [quantityDialogOpen, parts])

  function confirmPrint() {
    const entries: { part: Part; copy: number }[] = []
    parts.forEach((part) => {
      const qty = Math.max(1, Number(quantities[part.id]) || 1)
      for (let i = 0; i < qty; i++) {
        entries.push({ part, copy: i + 1 })
      }
    })
    setPrintEntries(entries)
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
            <DialogTitle>Jumlah Cetak per Part</DialogTitle>
            <DialogDescription>Tentukan berapa lembar QR yang mau dicetak untuk tiap part terpilih.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
            {parts.map((part) => (
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
          </div>
          <DialogFooter>
            <Button onClick={confirmPrint}>
              <Printer />
              Cetak Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printEntries && (
        <div id="inventory-qr-print-area" className="hidden">
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
    </>
  )
}
