import { QRCodeSVG } from 'qrcode.react'

interface PartUnitQrLabelCardProps {
  unitId: number
  partName: string | null | undefined
  itemMasterNo: string | null | undefined
  unitCode: string | null | undefined
  /** "Part Passport" units only — rendered as an extra line under the unit code when present. */
  arrivedAt?: string | null
  companyName?: string | null
  companyLogoUrl?: string | null
}

/**
 * The printable label itself — same markup `PartUnitQrPrint` used to render
 * inline, pulled out so `PartUnitBulkQrPrint` can lay out several of these
 * in one print area without duplicating the card markup.
 */
export function PartUnitQrLabelCard({
  unitId,
  partName,
  itemMasterNo,
  unitCode,
  arrivedAt,
  companyName,
  companyLogoUrl,
}: PartUnitQrLabelCardProps) {
  const scanUrl = `${window.location.origin}/part-units/${unitId}/scan`

  return (
    <div className="flex w-fit flex-col items-center gap-1 rounded-md border p-2 text-center">
      <div className="flex w-full items-center justify-center gap-1 border-b pb-1">
        {companyLogoUrl ? (
          <img src={companyLogoUrl} alt="" className="h-5 w-auto max-w-6 object-contain" />
        ) : (
          <div className="flex size-5 items-center justify-center rounded border border-dashed text-[6px] text-muted-foreground">
            Logo
          </div>
        )}
        <p className="text-[9px] font-semibold leading-none">{companyName ?? 'Nama Perusahaan'}</p>
      </div>
      <QRCodeSVG value={scanUrl} size={96} />
      <p className="text-[11px] font-medium leading-tight">{partName}</p>
      <p className="font-mono text-[10px] text-muted-foreground">
        {itemMasterNo} · Unit {unitCode}
      </p>
      {arrivedAt && (
        <p className="text-[9px] text-muted-foreground">
          Tiba: {new Date(arrivedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
        </p>
      )}
    </div>
  )
}
