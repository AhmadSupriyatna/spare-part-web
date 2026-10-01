import type { LucideIcon } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface EquipmentQrPrintCardProps {
  badge: string
  icon: LucideIcon
  title: string
  code?: string
  subLabel: string
  purpose: string
  qrValue: string
  /** Physical QR side length in cm — the card scales around it (5 for Line/Mesin, 7 for FP3). */
  qrCm?: number
  companyName?: string
  companyLogoUrl?: string | null
}

/**
 * Plant-engineer style equipment tag — printed and mounted directly on a
 * Line, Machine, or the FP3 request board, so it reads like an actual
 * industrial nameplate: amber hazard-stripe header, rivet corners, and a
 * bracket-framed QR big enough to scan from a normal standing distance
 * (vs. the Part QR's 2cm sticker, read up close). Hardcoded light colors
 * regardless of the app's own theme — this always renders as a physical
 * printed label, whether inside a `print:` area or as its own on-screen
 * preview (Fp3QrPrintSection). Shared by LineQrPrintSection,
 * MachineQrPrintSection and Fp3QrPrintSection so every equipment/request
 * tag looks the same, just scaled to each one's own QR size.
 */
export function EquipmentQrPrintCard({
  badge,
  icon: Icon,
  title,
  code,
  subLabel,
  purpose,
  qrValue,
  qrCm = 5,
  companyName,
  companyLogoUrl,
}: EquipmentQrPrintCardProps) {
  const qrWrapperCm = qrCm + 0.4
  const cardWidthCm = qrWrapperCm + 1.1
  const cardHeightCm = qrWrapperCm + 4.1

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-lg border-2 border-neutral-700 bg-white break-inside-avoid"
      style={{ width: `${cardWidthCm}cm`, height: `${cardHeightCm}cm` }}
    >
      <div className="h-[0.18cm] w-full shrink-0 bg-amber-400" />

      <span className="absolute top-[0.25cm] left-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute top-[0.25cm] right-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute bottom-[0.15cm] left-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />
      <span className="absolute bottom-[0.15cm] right-[0.15cm] size-1.5 rounded-full border border-neutral-400 bg-neutral-200" />

      <div className="flex flex-col items-center gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          {companyLogoUrl ? (
            <img src={companyLogoUrl} alt="" className="h-4 w-auto max-w-6 object-contain" />
          ) : (
            <div className="flex h-4 w-6 items-center justify-center rounded-sm border border-dashed border-neutral-300 text-[5px] text-neutral-400">
              Logo
            </div>
          )}
          <p className="max-w-[4cm] truncate text-[8px] font-medium tracking-wide text-neutral-500 uppercase">
            {companyName ?? 'Nama Perusahaan'}
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[8px] font-bold tracking-widest text-neutral-700">
          <Icon className="size-2.5" />
          {badge}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3">
        <div
          className="relative flex shrink-0 items-center justify-center"
          style={{ width: `${qrWrapperCm}cm`, height: `${qrWrapperCm}cm` }}
        >
          <span className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-neutral-600" />
          <span className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-neutral-600" />
          <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-neutral-600" />
          <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-neutral-600" />
          <QRCodeSVG value={qrValue} size={64} style={{ width: `${qrCm}cm`, height: `${qrCm}cm` }} />
        </div>

        <div className="flex max-w-full flex-col items-center gap-0.5 text-center">
          <p className="max-w-full truncate text-[13px] leading-tight font-bold tracking-wide text-neutral-900 uppercase">
            {title}
          </p>
          {code && (
            <p className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-wider text-neutral-700">
              {code}
            </p>
          )}
          <p className="max-w-full truncate text-[8px] text-neutral-500">{subLabel}</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center">
        <p className="text-[8px] font-medium tracking-wide text-neutral-600">{purpose}</p>
      </div>
    </div>
  )
}
