import { Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { fetchCompanySetting } from '@/features/settings/api'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import type { Part } from '@/types/inventory'
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
  branchId: number
  trigger: React.ReactNode
}

/**
 * Inventory Workspace's "Cetak QR Terpilih (N)" — same QR-per-part-per-
 * branch target (`/breakdown/scan/:partId/:branchId`) as
 * PartQrPrintSection, but for a fixed set of already-checkbox-selected
 * parts instead of that page's own search+select UI, so it's a separate,
 * smaller component rather than reusing that one directly.
 */
export function PartQrBulkPrintDialog({ parts, branchId, trigger }: PartQrBulkPrintDialogProps) {
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const [printEntries, setPrintEntries] = useState<{ part: Part; copy: number }[] | null>(null)

  const branches = useAuthStore((state) => state.user?.branches ?? [])
  const activeBranch = branches.find((b) => b.id === branchId)

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
          #inventory-qr-print-area { position: absolute; inset: 0; padding: 8px; }
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
        <div id="inventory-qr-print-area" className="hidden grid-cols-3 gap-3 print:grid">
          {printEntries.map((entry, index) => (
            <div
              key={`${entry.part.id}-${entry.copy}-${index}`}
              className="flex flex-col items-center gap-1 rounded-md border p-2 text-center break-inside-avoid"
            >
              <div className="flex w-full items-center justify-center gap-1 border-b pb-1">
                {companySetting?.logo_url ? (
                  <img src={companySetting.logo_url} alt="" className="h-5 w-auto max-w-6 object-contain" />
                ) : (
                  <div className="flex size-5 items-center justify-center rounded border border-dashed text-[6px] text-muted-foreground">
                    Logo
                  </div>
                )}
                <p className="text-[9px] leading-none font-semibold">{companySetting?.name ?? 'Nama Perusahaan'}</p>
              </div>
              <p className="text-[8px] leading-none text-muted-foreground">
                {activeBranch ? `${activeBranch.code} — ${activeBranch.name}` : ''}
              </p>
              <QRCodeSVG value={`${scanBaseUrl}/${entry.part.id}/${branchId}`} size={64} />
              <p className="text-[10px] leading-tight font-medium">{entry.part.name}</p>
              <p className="font-mono text-[9px] text-muted-foreground">{entry.part.item_master_no}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
