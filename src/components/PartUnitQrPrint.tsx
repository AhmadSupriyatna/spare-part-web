import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'

interface PartUnitQrPrintProps {
  unitId: number
  partName: string | null | undefined
  itemMasterNo: string | null | undefined
  unitCode: string | null | undefined
  label?: string
}

/**
 * Print-a-label-then-scan-it flow shared by the unit detail page and the
 * Repair Part board's "Siap Dipasang" cards: a print-only area (hidden on
 * screen, shown via a scoped @media print rule) plus a button that just
 * calls window.print() — the browser's print dialog does the rest. Each
 * instance scopes its CSS/DOM id to the unit id so several cards on one
 * page (the Kanban board) don't collide.
 */
export function PartUnitQrPrint({ unitId, partName, itemMasterNo, unitCode, label }: PartUnitQrPrintProps) {
  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

  const scanUrl = `${window.location.origin}/part-units/${unitId}/scan`
  const printAreaId = `qr-print-area-${unitId}`

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #${printAreaId}, #${printAreaId} * { visibility: visible; }
          #${printAreaId} { position: absolute; inset: 0; padding: 8px; display: flex !important; }
        }
      `}</style>
      <div
        id={printAreaId}
        className="hidden w-fit flex-col items-center gap-1 rounded-md border p-2 text-center print:flex"
      >
        <div className="flex w-full items-center justify-center gap-1 border-b pb-1">
          {companySetting?.logo_url ? (
            <img src={companySetting.logo_url} alt="" className="h-5 w-auto max-w-6 object-contain" />
          ) : (
            <div className="flex size-5 items-center justify-center rounded border border-dashed text-[6px] text-muted-foreground">
              Logo
            </div>
          )}
          <p className="text-[9px] font-semibold leading-none">{companySetting?.name ?? 'Nama Perusahaan'}</p>
        </div>
        <QRCodeSVG value={scanUrl} size={96} />
        <p className="text-[11px] font-medium leading-tight">{partName}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {itemMasterNo} · Unit {unitCode}
        </p>
      </div>
      <Button
        size={label ? 'sm' : 'icon-sm'}
        variant="outline"
        title="Cetak QR Unit"
        aria-label="Cetak QR Unit"
        onClick={() => requestAnimationFrame(() => window.print())}
      >
        <PrinterIcon />
        {label}
      </Button>
    </>
  )
}
