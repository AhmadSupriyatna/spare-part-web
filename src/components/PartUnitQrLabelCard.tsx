import { ScanLine } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { STRATEGY_STYLE } from '@/features/parts/PartQrPrintCard'
import { cn } from '@/lib/utils'
import type { PartReplacementStrategy } from '@/types/inventory'

function formatArrivalDate(arrivedAt: string): string {
  const date = new Date(arrivedAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

interface PartUnitQrLabelCardProps {
  unitId: number
  partName: string | null | undefined
  itemMasterNo: string | null | undefined
  unitCode: string | null | undefined
  /** The owning Part's strategy — shown as the same chip a regular part's QR card uses. */
  replacementStrategy?: PartReplacementStrategy | null
  /** Gates the Passport badge — this card is also used for a non-Passport unit's QR (e.g. reprinting after a repair), which must NOT show it. */
  hasPassport?: boolean
  /** "Part Passport" units only — rendered next to the Passport badge when present. */
  arrivedAt?: string | null
  /** Shown when reprinting a unit's QR after its repair completed — a repaired unit isn't necessarily Passport, so this is independent of hasPassport. */
  repairedAt?: string | null
  companyName?: string | null
  companyLogoUrl?: string | null
}

/**
 * The printable label itself — same plant-engineer nameplate language as
 * PartQrPrintCard (amber hazard stripe, rivet corners, bracket-framed QR,
 * identical 8.5cm x 3.6cm footprint) so a sheet mixing regular and
 * Passport parts reads as one design, not two. This is a per-UNIT QR
 * (/part-units/:id/scan), used both for genuine Part Passport units AND
 * for reprinting any other unit's QR (e.g. after a repair) — the Passport
 * badge is therefore gated on `hasPassport`, never assumed just because
 * this is the per-unit (not per-part) card.
 */
export function PartUnitQrLabelCard({
  unitId,
  partName,
  itemMasterNo,
  unitCode,
  replacementStrategy,
  hasPassport,
  arrivedAt,
  repairedAt,
  companyName,
  companyLogoUrl,
}: PartUnitQrLabelCardProps) {
  const style = replacementStrategy ? STRATEGY_STYLE[replacementStrategy] : null
  const scanUrl = `${window.location.origin}/part-units/${unitId}/scan`

  return (
    <div className="relative flex h-[3.6cm] w-[8.5cm] flex-col overflow-hidden rounded-lg border-2 border-neutral-700 bg-white break-inside-avoid">
      <div className="h-[0.15cm] w-full shrink-0 bg-amber-400" />

      <span className="absolute top-[0.2cm] left-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute top-[0.2cm] right-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute bottom-[0.12cm] left-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute bottom-[0.12cm] right-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />

      <div className="flex flex-1 items-center gap-3 px-3 py-2">
        <div className="relative flex size-[2.3cm] shrink-0 items-center justify-center">
          <span className="absolute top-0 left-0 h-2 w-2 border-t border-l border-neutral-600" />
          <span className="absolute top-0 right-0 h-2 w-2 border-t border-r border-neutral-600" />
          <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-neutral-600" />
          <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-neutral-600" />
          <QRCodeSVG value={scanUrl} size={64} style={{ width: '2cm', height: '2cm' }} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {companyLogoUrl ? (
              <img src={companyLogoUrl} alt="" className="h-3.5 w-auto max-w-5 object-contain" />
            ) : (
              <div className="flex h-3.5 w-5 items-center justify-center rounded-sm border border-dashed border-neutral-300 text-[5px] text-neutral-400">
                Logo
              </div>
            )}
            <p className="truncate text-[8px] leading-none text-neutral-500">{companyName ?? 'Nama Perusahaan'}</p>
          </div>

          <p className="truncate text-[12px] leading-tight font-bold text-neutral-900">{partName}</p>

          <div className="flex items-center gap-1">
            <span className="w-fit rounded border border-neutral-300 bg-neutral-50 px-1.5 py-[1px] font-mono text-[9px] leading-tight tracking-wider text-neutral-700">
              {itemMasterNo}
            </span>
            <span className="w-fit rounded border border-neutral-300 bg-neutral-50 px-1.5 py-[1px] font-mono text-[9px] leading-tight tracking-wider text-neutral-700">
              {unitCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {style && (
              <span className={cn('rounded-full border px-1.5 py-[1px] text-[7px] leading-tight font-bold tracking-wide', style.chip)}>
                {style.label}
              </span>
            )}
            {hasPassport && (
              <span className="flex w-fit items-center gap-0.5 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-[1px] text-[7px] leading-tight font-bold tracking-wide text-amber-800">
                <ScanLine className="size-2" />
                Passport
              </span>
            )}
            {arrivedAt && (
              <span className="truncate text-[8px] leading-none text-neutral-500">
                Arr: {formatArrivalDate(arrivedAt)}
              </span>
            )}
            {repairedAt && (
              <span className="truncate text-[8px] leading-none text-neutral-500">
                Diperbaiki: {formatArrivalDate(repairedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
