/**
 * Every QR code printed by this app is just a deep link (see
 * PrintQrCodesPage / PartUnitDetailPage) meant to be opened by a phone's
 * native camera app. The in-app scanner reuses those same URLs but decodes
 * them itself instead of navigating, so scanning must recognize both shapes.
 */
export type ScannedPartQr =
  | { type: 'new-part'; partId: number; branchId: number }
  | { type: 'part-unit'; unitId: number }

export function parseScannedPartQr(raw: string): ScannedPartQr | null {
  let pathname: string
  try {
    pathname = new URL(raw, window.location.origin).pathname
  } catch {
    return null
  }

  const newPartMatch = pathname.match(/\/breakdown\/scan\/(\d+)\/(\d+)\/?$/)
  if (newPartMatch) {
    return { type: 'new-part', partId: Number(newPartMatch[1]), branchId: Number(newPartMatch[2]) }
  }

  const unitMatch = pathname.match(/\/part-units\/(\d+)\/scan\/?$/)
  if (unitMatch) {
    return { type: 'part-unit', unitId: Number(unitMatch[1]) }
  }

  return null
}
