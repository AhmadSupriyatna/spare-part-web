import { useQuery } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { PartUnitQrLabelCard } from '@/components/PartUnitQrLabelCard'
import { fetchCompanySetting } from '@/features/settings/api'
import { Button } from '@/components/ui/button'

interface PartUnitQrPrintProps {
  unitId: number
  partName: string | null | undefined
  itemMasterNo: string | null | undefined
  unitCode: string | null | undefined
  /** "Part Passport" units only — printed as an extra line when present. */
  arrivedAt?: string | null
  label?: string
}

/**
 * Print-a-label-then-scan-it flow shared by the unit detail page and the
 * Repair Part board's "Siap Dipasang" cards: a print-only area (hidden on
 * screen, shown via a scoped @media print rule) plus a button that just
 * calls window.print() — the browser's print dialog does the rest. Each
 * instance scopes its CSS/DOM id to the unit id so several cards on one
 * page (the Kanban board) don't collide. The label itself is
 * PartUnitQrLabelCard, shared with PartUnitBulkQrPrint's multi-unit print.
 */
export function PartUnitQrPrint({ unitId, partName, itemMasterNo, unitCode, arrivedAt, label }: PartUnitQrPrintProps) {
  const { data: companySetting } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: fetchCompanySetting,
  })

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
      <div id={printAreaId} className="hidden print:flex">
        <PartUnitQrLabelCard
          unitId={unitId}
          partName={partName}
          itemMasterNo={itemMasterNo}
          unitCode={unitCode}
          arrivedAt={arrivedAt}
          companyName={companySetting?.name}
          companyLogoUrl={companySetting?.logo_url}
        />
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
