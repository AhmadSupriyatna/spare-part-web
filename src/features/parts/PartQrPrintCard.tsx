import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'
import type { Part, PartReplacementStrategy } from '@/types/inventory'

interface PartQrPrintCardProps {
  part: Part
  qrValue: string
  companyName?: string
  companyLogoUrl?: string | null
  branchLabel?: string
  locationLabel?: string | null
}

/**
 * Categorical identity per replacement strategy — deliberately not the
 * app's destructive/warning/success status tokens (this is a printed
 * label read on its own, not mixed with a stock-health reading), and
 * hardcoded to light/print-safe values since this card only ever renders
 * inside a `print:` area, never on screen in the app's own theme.
 */
const STRATEGY_STYLE: Record<PartReplacementStrategy, { chip: string; label: string }> = {
  life_based: { chip: 'border-sky-300 bg-sky-100 text-sky-800', label: 'Life Based' },
  scheduled: { chip: 'border-violet-300 bg-violet-100 text-violet-800', label: 'Maintenance' },
  failure_based: { chip: 'border-rose-300 bg-rose-100 text-rose-800', label: 'Failure Based' },
}

/**
 * Shared print card for a part's breakdown-report QR — same plant-
 * engineer nameplate language as EquipmentQrPrintCard (amber hazard
 * stripe, rivet corners, bracket-framed QR) but kept landscape and dense
 * (QR left, info right) rather than that component's tall vertical tag,
 * since a Part sheet prints many labels at once instead of one tag per
 * asset. Used wherever a part QR gets printed — Cetak QR Code's Part tab
 * (PartQrPrintSection) and Kelola Stok's bulk print
 * (PartQrBulkPrintDialog) — so a sheet of labels never mixes two designs.
 * Fixed 8.5cm x 3.6cm footprint and a 2cm QR regardless of how long the
 * part name or location is — text truncates instead of resizing the box.
 */
export function PartQrPrintCard({
  part,
  qrValue,
  companyName,
  companyLogoUrl,
  branchLabel,
  locationLabel,
}: PartQrPrintCardProps) {
  const style = STRATEGY_STYLE[part.replacement_strategy]

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
          <QRCodeSVG value={qrValue} size={64} style={{ width: '2cm', height: '2cm' }} />
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
            <p className="truncate text-[8px] leading-none text-neutral-500">
              {companyName ?? 'Nama Perusahaan'}
              {branchLabel ? ` · ${branchLabel}` : ''}
            </p>
          </div>

          <p className="truncate text-[12px] leading-tight font-bold text-neutral-900">{part.name}</p>

          <span className="w-fit rounded border border-neutral-300 bg-neutral-50 px-1.5 py-[1px] font-mono text-[9px] leading-tight tracking-wider text-neutral-700">
            {part.item_master_no}
          </span>

          <div className="flex items-center gap-1.5">
            <span className={cn('rounded-full border px-1.5 py-[1px] text-[7px] leading-tight font-bold tracking-wide', style.chip)}>
              {style.label}
            </span>
            {locationLabel && <span className="truncate text-[8px] leading-none text-neutral-500">Lokasi: {locationLabel}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
