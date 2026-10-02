import { useQuery } from '@tanstack/react-query'
import { CameraOff, CircleAlert, Loader2 } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { useEffect, useRef, useState } from 'react'
import { fetchPartUnit, fetchUnitsForPart } from '@/features/part-units/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { PartUnit } from '@/types/relations'

interface PartUnitQrScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expectedPartId: number
  partName: string
  onScanned: (unit: PartUnit) => void
}

const statusLabels: Partial<Record<PartUnit['status'], string>> = {
  in_service: 'sedang terpasang di tempat lain',
  pending_repair: 'sedang menunggu keputusan perbaikan',
  in_repair: 'sedang diperbaiki',
  scrapped: 'sudah dibuang',
}

function parseUnitIdFromScan(text: string): number | null {
  const match = text.match(/\/part-units\/(\d+)\/scan/)
  return match ? Number(match[1]) : null
}

/**
 * "Part Passport" — in-app camera scan to identify exactly which physical
 * unit is going into a PM replacement (WoCard), instead of auto-picking any
 * available unit off the shelf. Distinct from the public `/part-units/:id/scan`
 * page (phone's own camera app + Supervisor-approved reinstall request) —
 * this one is for a technician already executing an assigned task, so
 * completing that task is itself the governance step.
 */
export function PartUnitQrScanDialog({
  open,
  onOpenChange,
  expectedPartId,
  partName,
  onScanned,
}: PartUnitQrScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [cameraUnavailable, setCameraUnavailable] = useState(false)
  const [manualPick, setManualPick] = useState(false)

  useEffect(() => {
    if (open) {
      setError(null)
      setChecking(false)
      setCameraUnavailable(false)
      setManualPick(false)
    }
  }, [open])

  const { data: availableUnits, isLoading: loadingUnits } = useQuery({
    queryKey: ['part-units', expectedPartId, 'available-for-scan'],
    queryFn: () => fetchUnitsForPart(expectedPartId),
    enabled: open && (manualPick || cameraUnavailable),
    select: (units) => units.filter((unit) => unit.status === 'available'),
  })

  async function resolveUnit(unitId: number) {
    setChecking(true)
    setError(null)
    try {
      const unit = await fetchPartUnit(unitId)
      if (unit.part_id !== expectedPartId) {
        setError('QR ini bukan untuk part ini — scan unit yang benar.')
        return
      }
      if (unit.status !== 'available') {
        setError(
          `Unit ${unit.unit_code ?? unit.id} ${statusLabels[unit.status] ?? 'tidak tersedia'} — scan atau pilih unit lain.`,
        )
        return
      }
      scannerRef.current?.stop()
      onScanned(unit)
    } catch {
      setError('Unit tidak ditemukan.')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!open || manualPick) return
    let cancelled = false

    QrScanner.hasCamera().then((hasCamera) => {
      if (cancelled) return
      if (!hasCamera || !videoRef.current) {
        setCameraUnavailable(true)
        return
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const unitId = parseUnitIdFromScan(result.data)
          if (unitId) resolveUnit(unitId)
        },
        { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 5 },
      )
      scannerRef.current = scanner
      scanner.start().catch(() => {
        if (!cancelled) setCameraUnavailable(true)
      })
    })

    return () => {
      cancelled = true
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, manualPick])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan QR Unit — {partName}</DialogTitle>
          <DialogDescription>
            Part ini pakai Part Passport — arahkan kamera ke QR pada label unit yang akan dipasang.
          </DialogDescription>
        </DialogHeader>

        {!manualPick && !cameraUnavailable && (
          <div className="relative overflow-hidden rounded-md bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            {checking && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="size-6 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        {cameraUnavailable && !manualPick && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            <CameraOff className="size-6" />
            Kamera tidak tersedia atau izin ditolak.
            <Button type="button" variant="outline" size="sm" onClick={() => setManualPick(true)}>
              Pilih Unit Secara Manual
            </Button>
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {manualPick && (
          <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
            {loadingUnits && <p className="text-sm text-muted-foreground">Memuat unit tersedia...</p>}
            {!loadingUnits && availableUnits?.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada unit "Siap Dipasang" untuk part ini.</p>
            )}
            {availableUnits?.map((unit) => (
              <button
                key={unit.id}
                type="button"
                disabled={checking}
                onClick={() => resolveUnit(unit.id)}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-muted disabled:opacity-50"
              >
                <span>Unit {unit.unit_code}</span>
                {unit.arrived_at && (
                  <span className="text-xs text-muted-foreground">
                    Tiba {new Date(unit.arrived_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {!manualPick && !cameraUnavailable && (
          <Button type="button" variant="outline" size="sm" onClick={() => setManualPick(true)}>
            Atau Pilih Manual
          </Button>
        )}

        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Batal
        </Button>
      </DialogContent>
    </Dialog>
  )
}
